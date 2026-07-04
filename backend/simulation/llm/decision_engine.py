import re
import logging
from typing import Dict, Any, List, Tuple, Optional
from backend import config
from backend.simulation.llm.ollama_client import OllamaClient
from backend.simulation.llm.prompt_builder import PromptBuilder

logger = logging.getLogger("DecisionEngine")

VALID_ACTIONS = {"MOVE", "ATTACK", "TRADE", "COOPERATE", "COLLECT", "REST"}

class DecisionEngine:
    def __init__(self, client: OllamaClient):
        self.client:  OllamaClient = client
        self.builder: PromptBuilder = PromptBuilder()

    # ──────────────────────────────────────────────────────────────────────
    def decide(
        self,
        agent,
        current_tick: int,
        nearby_agents: List[Any],
        nearby_resources: List[Tuple[int, int]],
        on_resource:   bool,
        in_safe_zone:  bool,
        mode: str = None
    ) -> Tuple[str, str, str]:
        """
        Main interface to resolve an action for an agent.
        Returns (chosen_action, llm_prompt, llm_response).

        LLM calls are NEVER blocking — they run in a background thread pool.
        The agent keeps using its cached last_action while the LLM is in-flight.
        """
        decision_mode = mode or config.DECISION_MODE

        # ── RULE mode: fast, synchronous, no LLM ──────────────────────────
        if decision_mode == "RULE":
            action = self._rule(agent, nearby_agents, nearby_resources, on_resource, in_safe_zone)
            self.client.increment_rule_calls()
            agent.current_action = action
            return action, "", ""

        # ── HYBRID mode: rules handle all routines, LLM only complex social ─
        if decision_mode == "HYBRID":
            routine = self._hybrid_routine(agent, nearby_agents, on_resource, in_safe_zone)
            if routine is not None:
                self.client.increment_rule_calls()
                agent.current_action = routine
                return routine, "", ""
            # Fall through to async LLM path for complex interactions

        # ── LLM / HYBRID (complex) path — non-blocking ────────────────────
        # 1. Check if a previous async result has arrived
        result = self.client.poll_async(agent.id)
        if result is not None:
            raw_text, _latency = result
            validated = self.validate_and_parse(raw_text)
            validated  = self._safety_filter(validated, on_resource, nearby_agents, in_safe_zone)

            agent.last_action        = validated
            agent.last_llm_response  = raw_text
            agent.last_decision_tick = current_tick
            agent.current_action     = validated
            return validated, agent.last_llm_prompt, raw_text

        # 2. Check cooldown — is it time to fire a new request?
        ticks_since = current_tick - agent.last_decision_tick
        cooldown_expired = ticks_since >= config.DECISION_COOLDOWN

        if cooldown_expired:
            # Build prompt and fire async (non-blocking)
            nearby_agent_ids       = [a.id for a in nearby_agents if a.alive]
            nearby_resources_count = len(nearby_resources)
            threats_count          = sum(1 for a in nearby_agents if a.alive and a.genes.get("aggression", 50) > 75)

            prompt = self.builder.build_prompt(
                genes=agent.genes,
                health=agent.health,
                energy=agent.energy,
                resources=agent.resources_collected,
                nearby_agent_ids=nearby_agent_ids,
                nearby_resources_count=nearby_resources_count,
                threats_count=threats_count
            )
            agent.last_llm_prompt   = prompt
            agent.last_decision_tick = current_tick  # mark as "requested" this tick

            self.client.generate_async(agent.id, prompt)
            # While waiting for the result, use cached last_action (or rule fallback)

        # 3. Use cached action while LLM is in-flight (or just refreshed)
        cached = agent.last_action if agent.last_action in VALID_ACTIONS else None
        if cached:
            cached = self._safety_filter(cached, on_resource, nearby_agents, in_safe_zone)
            agent.current_action = cached
            return cached, agent.last_llm_prompt, agent.last_llm_response

        # 4. No cache at all — rule fallback on very first tick
        action = self._rule(agent, nearby_agents, nearby_resources, on_resource, in_safe_zone)
        self.client.increment_rule_calls()
        agent.last_action    = action
        agent.current_action = action
        return action, "", ""

    # ── Hybrid routine shortcuts ──────────────────────────────────────────
    def _hybrid_routine(self, agent, nearby_agents, on_resource, in_safe_zone) -> Optional[str]:
        """Returns an action string for routine situations, or None to fall through to LLM."""
        # Critical vitals → REST
        if agent.energy < 20.0 or agent.health < 25.0:
            return "REST"
        # Standing on resource → COLLECT
        if on_resource:
            return "COLLECT"
        # Completely alone → MOVE (no LLM needed)
        if not nearby_agents:
            return "MOVE"
        # In a safe zone with others → COOPERATE (peaceful)
        if in_safe_zone and nearby_agents:
            return "COOPERATE"
        return None  # complex situation → LLM

    # ── Safety filter ─────────────────────────────────────────────────────
    def _safety_filter(self, action: str, on_resource: bool, nearby_agents: list, in_safe_zone: bool) -> str:
        """Prevent invalid actions (COLLECT with no resource, ATTACK in safe zone, etc.)."""
        if action == "COLLECT" and not on_resource:
            return "MOVE"
        if action in {"ATTACK", "TRADE", "COOPERATE"} and not nearby_agents:
            return "MOVE"
        if action == "ATTACK" and in_safe_zone:
            return "COOPERATE"
        return action

    # ── Parser ────────────────────────────────────────────────────────────
    def validate_and_parse(self, text: str) -> str:
        """
        Extracts a valid action from raw LLM output.
        Tries: exact → prefix/stem → token-by-token → REST fallback.
        """
        if not text:
            return "REST"
        cleaned = text.strip().upper()

        # Exact match
        if cleaned in VALID_ACTIONS:
            return cleaned

        # Whole-string prefix stem (ATTACKING → ATTACK)
        for action in sorted(VALID_ACTIONS, key=len, reverse=True):
            if cleaned.startswith(action):
                return action

        # Token-by-token search
        for token in cleaned.split():
            token_clean = re.sub(r'[^A-Z]', '', token)
            if token_clean in VALID_ACTIONS:
                return token_clean
            for action in sorted(VALID_ACTIONS, key=len, reverse=True):
                if token_clean.startswith(action):
                    return action

        return "REST"

    # ── Rule-based fallback ───────────────────────────────────────────────
    def _rule(self, agent, nearby_agents, nearby_resources, on_resource, in_safe_zone) -> str:
        """Weighted probability rule-based decision. Never calls Ollama."""
        import numpy as np
        actions, weights = [], []

        # REST
        rest_w = (100.0 - agent.genes.get("risk_taking", 50)) * 0.1
        if agent.energy < 30:  rest_w += (100.0 - agent.energy) * 1.5
        if agent.health < 40:  rest_w += (100.0 - agent.health) * 2.0
        actions.append("REST"); weights.append(max(1.0, rest_w))

        # MOVE
        move_w = agent.genes.get("curiosity", 50) * 0.5
        if nearby_resources: move_w += agent.genes.get("intelligence", 50) * 1.2
        actions.append("MOVE"); weights.append(max(1.0, move_w))

        # COLLECT
        if on_resource:
            col_w = 20.0 + agent.genes.get("intelligence", 50) * 1.5 + (100.0 - agent.energy) * 0.8
            actions.append("COLLECT"); weights.append(max(5.0, col_w))

        # Social actions
        alive_near = [a for a in nearby_agents if a.alive]
        if alive_near and not in_safe_zone:
            atk_w = (agent.genes.get("aggression", 50) * 1.5
                     + agent.genes.get("risk_taking", 50) * 0.5
                     - agent.genes.get("trustworthiness", 50) * 0.8)
            if agent.health < 30: atk_w -= (30 - agent.health) * 2.0
            if atk_w > 0:
                actions.append("ATTACK"); weights.append(atk_w)

            coop_w = (agent.genes.get("cooperation", 50) * 1.5
                      + agent.genes.get("trustworthiness", 50) * 0.5)
            actions.append("COOPERATE"); weights.append(max(0.1, coop_w))

            trade_w = (agent.genes.get("trustworthiness", 50) * 1.5
                       + agent.genes.get("cooperation", 50) * 0.5)
            actions.append("TRADE"); weights.append(max(0.1, trade_w))

        total_w = sum(weights)
        probs   = [w / total_w for w in weights]
        return str(np.random.choice(actions, p=probs))
