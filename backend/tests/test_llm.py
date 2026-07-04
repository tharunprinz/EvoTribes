import pytest
from unittest.mock import MagicMock
from backend.simulation.agent import Agent
from backend.simulation.llm.ollama_client import OllamaClient
from backend.simulation.llm.prompt_builder import PromptBuilder
from backend.simulation.llm.decision_engine import DecisionEngine


# ── Mock client ────────────────────────────────────────────────────────────
class MockOllamaClient(OllamaClient):
    """Subclass that overrides generate to avoid real HTTP calls."""

    def __init__(self):
        # Don't call super().__init__() to avoid creating real thread pools
        from backend import config
        self.base_url = "http://mock"
        self.model    = "qwen3:4b"
        self.timeout  = 2.0
        self.llm_calls = 0
        self.rule_calls = 0
        self.total_response_time = 0.0
        import threading
        self._lock = threading.Lock()
        self._pending_lock = threading.Lock()
        self._pending = {}
        self.mock_response = "ATTACK"

    def generate(self, prompt: str):
        self.llm_calls += 1
        return self.mock_response, 0.05

    def _call_ollama(self, prompt: str):
        """Override internal worker so async path also uses mock response."""
        self.llm_calls += 1
        return self.mock_response, 0.05

    def increment_rule_calls(self):
        self.rule_calls += 1


def make_genes(overrides=None):
    genes = {"aggression": 50, "cooperation": 50, "curiosity": 50,
             "risk_taking": 50, "intelligence": 50, "trustworthiness": 50}
    if overrides:
        genes.update(overrides)
    return genes


# ── Tests ──────────────────────────────────────────────────────────────────

def test_prompt_builder():
    genes = {
        "aggression": 90, "cooperation": 10, "curiosity": 50,
        "risk_taking": 80, "intelligence": 60, "trustworthiness": 20
    }
    prompt = PromptBuilder.build_prompt(
        genes=genes, health=85, energy=70, resources=3,
        nearby_agent_ids=[12, 44], nearby_resources_count=2, threats_count=1
    )
    assert "Aggression=90" in prompt
    assert "Health=85"     in prompt
    assert "12"            in prompt  # agent id appears somewhere
    assert "44"            in prompt
    assert "COLLECT"       in prompt  # action list shown in prompt


def test_decision_parser():
    client = MockOllamaClient()
    engine = DecisionEngine(client)

    # Exact match
    assert engine.validate_and_parse("MOVE")    == "MOVE"
    assert engine.validate_and_parse("  collect  ") == "COLLECT"

    # Stem/prefix match (ATTACKING → ATTACK)
    assert engine.validate_and_parse("ATTACKING") == "ATTACK"
    assert engine.validate_and_parse("I think attacking might be best.") == "ATTACK"
    assert engine.validate_and_parse("We should probably rest now.") == "REST"

    # Fallback
    assert engine.validate_and_parse("nonsense gibberish") == "REST"
    assert engine.validate_and_parse("") == "REST"


def test_hybrid_routine_low_health_rest():
    """Hybrid: critically low health → REST without LLM."""
    client = MockOllamaClient()
    engine = DecisionEngine(client)
    agent  = Agent(1, (5, 5), make_genes())
    agent.health = 10.0   # < 25 threshold

    action, _, _ = engine.decide(
        agent=agent, current_tick=100,
        nearby_agents=[Agent(2, (5, 6), make_genes())],
        nearby_resources=[], on_resource=False, in_safe_zone=False, mode="HYBRID"
    )
    assert action == "REST"
    assert client.rule_calls == 1
    assert client.llm_calls  == 0


def test_hybrid_routine_on_resource_collect():
    """Hybrid: standing on resource → COLLECT without LLM."""
    client = MockOllamaClient()
    engine = DecisionEngine(client)
    agent  = Agent(1, (5, 5), make_genes())
    agent.health = 90.0
    agent.energy = 90.0

    action, _, _ = engine.decide(
        agent=agent, current_tick=101,
        nearby_agents=[Agent(2, (5, 6), make_genes())],
        nearby_resources=[], on_resource=True, in_safe_zone=False, mode="HYBRID"
    )
    assert action == "COLLECT"
    assert client.rule_calls == 1
    assert client.llm_calls  == 0


def test_rule_mode_never_calls_llm():
    """RULE mode must never trigger any LLM call."""
    client = MockOllamaClient()
    engine = DecisionEngine(client)
    agent  = Agent(1, (3, 3), make_genes())

    for tick in range(20):
        engine.decide(
            agent=agent, current_tick=tick,
            nearby_agents=[Agent(2, (3, 4), make_genes())],
            nearby_resources=[(4, 4)], on_resource=False, in_safe_zone=False, mode="RULE"
        )
    assert client.llm_calls == 0


def test_safety_filter():
    """Safety filter: COLLECT without resource → MOVE; ATTACK in safe zone → COOPERATE."""
    client = MockOllamaClient()
    engine = DecisionEngine(client)

    assert engine._safety_filter("COLLECT", on_resource=False, nearby_agents=[1], in_safe_zone=False) == "MOVE"
    assert engine._safety_filter("ATTACK",  on_resource=False, nearby_agents=[],  in_safe_zone=False) == "MOVE"
    assert engine._safety_filter("ATTACK",  on_resource=False, nearby_agents=[1], in_safe_zone=True)  == "COOPERATE"
    assert engine._safety_filter("REST",    on_resource=False, nearby_agents=[],  in_safe_zone=False) == "REST"
