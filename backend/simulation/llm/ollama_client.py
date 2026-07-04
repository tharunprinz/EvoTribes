import requests
import time
import re
import random
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, Future
from typing import Tuple, Dict, Any, Optional
from backend import config

logger = logging.getLogger("OllamaClient")

class OllamaClient:
    def __init__(self, base_url: str = None, model: str = None, timeout: float = 8.0):
        self.base_url: str = base_url or config.OLLAMA_BASE_URL
        self.model: str    = model or config.OLLAMA_MODEL
        self.timeout: float = timeout

        # Performance Indicators
        self.llm_calls: int = 0
        self.rule_calls: int = 0
        self.total_response_time: float = 0.0
        self._lock = threading.Lock()

        # Non-blocking async call pool
        self._executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="ollama")

        # Per-agent pending futures: agent_id -> Future
        self._pending: Dict[int, Future] = {}
        self._pending_lock = threading.Lock()

    # ── Synchronous call (used by tests and blocking path) ────────────────
    def generate(self, prompt: str) -> Tuple[str, float]:
        """
        Sends a generation query to local Ollama API (blocking).
        Falls back to simulated provider if server is offline.
        Returns (response_text, latency_seconds).
        """
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": 16,
                "temperature": 0.2,
                "think": False,
            }
        }

        start = time.time()
        try:
            response = requests.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            latency = time.time() - start
            response_text = response.json().get("response", "").strip()

            with self._lock:
                self.llm_calls += 1
                self.total_response_time += latency

            return response_text, latency

        except Exception as e:
            # Fallback to simulated provider if Ollama is not running
            response_text = self._simulate_llm_response(prompt)
            time.sleep(random.uniform(0.05, 0.12))
            latency = time.time() - start

            with self._lock:
                self.llm_calls += 1
                self.total_response_time += latency

            return response_text, latency

    # ── Non-blocking async path ────────────────────────────────────────────
    def generate_async(self, agent_id: int, prompt: str) -> None:
        """
        Submit an Ollama request in the background thread pool.
        The result can be retrieved with poll_async(agent_id).
        If a request for this agent is already in-flight, does nothing.
        """
        with self._pending_lock:
            existing = self._pending.get(agent_id)
            if existing is not None and not existing.done():
                return  # already in-flight
            future = self._executor.submit(self._call_ollama, prompt)
            self._pending[agent_id] = future

    def poll_async(self, agent_id: int) -> Optional[Tuple[str, float]]:
        """
        Check if the pending async call for this agent is done.
        Returns (response_text, latency) if ready, None if still in-flight or no request.
        Clears the future on success.
        """
        with self._pending_lock:
            future = self._pending.get(agent_id)
            if future is None:
                return None
            if not future.done():
                return None  # still running
            # Remove and return result
            del self._pending[agent_id]

        try:
            return future.result()
        except Exception as e:
            logger.warning(f"Async Ollama result error for agent {agent_id}: {e}")
            return None

    def _call_ollama(self, prompt: str) -> Tuple[str, float]:
        """Internal worker — runs in thread pool. Falls back to simulation if offline."""
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": 16,
                "temperature": 0.2,
                "think": False,
            }
        }
        start = time.time()
        try:
            response = requests.post(url, json=payload, timeout=self.timeout)
            response.raise_for_status()
            latency = time.time() - start
            text = response.json().get("response", "").strip()
        except Exception:
            # Local Ollama server is offline - generate mock LLM response
            text = self._simulate_llm_response(prompt)
            time.sleep(random.uniform(0.04, 0.10))
            latency = time.time() - start

        with self._lock:
            self.llm_calls += 1
            self.total_response_time += latency

        return text, latency

    # ── Simulated LLM Engine when Ollama is offline ──────────────────────
    def _simulate_llm_response(self, prompt: str) -> str:
        """
        Parse prompt characteristics and return a trait-aligned decision text.
        """
        # Parse Genes
        genes = {}
        for key in ["aggression", "cooperation", "curiosity", "risk_taking", "intelligence", "trustworthiness"]:
            # Find key case-insensitively
            case_key = key.replace("_", "").lower()
            m = re.search(rf"(?i){case_key}=(\d+)", prompt)
            genes[key] = int(m.group(1)) if m else 50

        # Parse Vitals
        health_m = re.search(r"(?i)health=(\d+)", prompt)
        health = int(health_m.group(1)) if health_m else 100

        energy_m = re.search(r"(?i)energy=(\d+)", prompt)
        energy = int(energy_m.group(1)) if energy_m else 100

        # Parse Surroundings
        agents_block = re.search(r"Nearby Agents:\s*(.*?)\s*\n\nNearby Resources:", prompt, re.DOTALL)
        agents_str = agents_block.group(1) if agents_block else ""
        has_agents = "Agent" in agents_str

        resources_m = re.search(r"Nearby Resources:\s*(\d+)", prompt)
        resources_count = int(resources_m.group(1)) if resources_m else 0

        # Rule heuristics to create realistic personality-based decisions
        if health < 30 or energy < 25:
            return f"REST: My health ({health}) and energy ({energy}) are extremely low. I must recover."

        if has_agents:
            agg = genes.get("aggression", 50)
            coop = genes.get("cooperation", 50)
            trust = genes.get("trustworthiness", 50)

            if agg > max(coop, trust, 45):
                return f"ATTACK: An agent is nearby. With my high Aggression ({agg}), I will attack to secure resources."
            elif coop > max(agg, trust, 45):
                return f"COOPERATE: There is another agent. My Cooperation is {coop}. Let's work together."
            elif trust > max(agg, coop, 45):
                return f"TRADE: I will trade with the nearby agent since my Trustworthiness is {trust}."

        if resources_count > 0:
            return "COLLECT: Resources are nearby, so I will harvest them to increase my survival odds."

        # Otherwise just wander around (curiosity-driven)
        cur = genes.get("curiosity", 50)
        return f"MOVE: No immediate interaction targets. My Curiosity is {cur}, so I will wander to explore."

    # ── Stat helpers ───────────────────────────────────────────────────────
    def increment_rule_calls(self):
        with self._lock:
            self.rule_calls += 1

    def get_monitor_stats(self) -> Dict[str, Any]:
        with self._lock:
            avg_ms = 0.0
            if self.llm_calls > 0:
                avg_ms = round((self.total_response_time / self.llm_calls) * 1000, 1)
            return {
                "model":                self.model,
                "llm_calls":            self.llm_calls,
                "rule_calls":           self.rule_calls,
                "average_response_time": float(avg_ms),
                "pending_requests":     len(self._pending)
            }

    def reset_stats(self):
        with self._lock:
            self.llm_calls = 0
            self.rule_calls = 0
            self.total_response_time = 0.0
        with self._pending_lock:
            self._pending.clear()

    def shutdown(self):
        self._executor.shutdown(wait=False)
