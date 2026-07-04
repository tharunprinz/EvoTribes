const API_BASE = "http://localhost:8000";

export const api = {
  start: async ({ scenario, mode, popSize, maxGen, ticksPerGen, decisionMode, ollamaModel }) => {
    const params = new URLSearchParams({
      scenario,
      mode,
      pop_size: popSize,
      max_generations: maxGen,
      ticks_per_generation: ticksPerGen,
      decision_mode: decisionMode || "RULE",
      ollama_model: ollamaModel || "qwen3:4b",
    });
    const res = await fetch(`${API_BASE}/simulation/start?${params}`);
    return res.json();
  },

  getState: async () => {
    const res = await fetch(`${API_BASE}/simulation/state`);
    return res.json();
  },

  getStats: async () => {
    const res = await fetch(`${API_BASE}/simulation/stats`);
    return res.json();
  },

  control: async (action, ticks = 1, fps = 20) => {
    const res = await fetch(
      `${API_BASE}/simulation/generation?action=${action}&ticks=${ticks}&fps=${fps}`
    );
    return res.json();
  },

  getExportUrl: () => {
    return `${API_BASE}/simulation/export`;
  },

  getWebSocket: () => {
    return new WebSocket(`ws://localhost:8000/ws/simulation`);
  }
};
