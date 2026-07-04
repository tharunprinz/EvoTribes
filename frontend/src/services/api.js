const getApiBase = () => {
  // If Vite environment variable is set, use it
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  // If window is defined (in browser), fallback to port 8000 on the current host
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
};

const API_BASE = getApiBase();

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
    // Dynamically map http/https to ws/wss
    const wsUrl = API_BASE.replace(/^http/, "ws");
    return new WebSocket(`${wsUrl}/ws/simulation`);
  }
};
