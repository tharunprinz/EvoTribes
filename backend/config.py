# Global configurations for Evolution of Artificial Personalities Simulation

OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen3:4b"

# Modes: "RULE" (Mode 1), "LLM" (Mode 2), "HYBRID" (Mode 3)
DECISION_MODE = "RULE"

# Optimization Parameters
DECISION_COOLDOWN = 10  # number of ticks an agent reuses its cached decision
