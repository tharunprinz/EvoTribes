import React, { useState, useEffect, useRef, useMemo } from "react";
import { Play, Pause, RotateCcw, ArrowLeft, Download, FastForward, Activity } from "lucide-react";

const GithubIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);
import { api } from "../services/api";
import { StatsPanel } from "./StatsPanel";
import { SimulationCanvas } from "./SimulationCanvas";
import { EvolutionChart } from "./EvolutionChart";
import { AgentInspectorPanel } from "./AgentInspectorPanel";
import { ResearchModePanel } from "./ResearchModePanel";
import { DecisionEngineMonitor } from "./DecisionEngineMonitor";

// Skeleton loader shown instantly while backend initialises
const DashboardSkeleton = () => (
  <div className="max-w-7xl mx-auto w-full p-6 space-y-6 z-10 relative animate-pulse">
    <div className="skeleton h-20 rounded-3xl" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 skeleton h-[600px] rounded-3xl" />
      <div className="lg:col-span-4 skeleton h-[600px] rounded-3xl" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="skeleton h-[380px] rounded-3xl" />
      <div className="skeleton h-[380px] rounded-3xl" />
    </div>
    <div className="text-center text-sm text-gray-500 flex items-center justify-center gap-3 pt-2">
      <div className="w-4 h-4 rounded-full border-2 border-t-purple-400 border-white/10 animate-spin" />
      Initialising simulation engine — spawning agents…
    </div>
  </div>
);

export const Dashboard = ({ initialSettings, onBack }) => {
  const [state, setState] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [fps, setFps] = useState(20);
  const [ready, setReady] = useState(false);

  // Three-experiment records for the side-by-side comparison panel
  const [ruleRecord, setRuleRecord] = useState(null);
  const [llmRecord, setLlmRecord] = useState(null);
  const [hybridRecord, setHybridRecord] = useState(null);

  const wsRef = useRef(null);
  const pollTimerRef = useRef(null);
  const statsPollRef = useRef(null);
  const stateRef = useRef(null); // keep latest state accessible inside intervals

  // ── keep stateRef in sync ──────────────────────────────────────────────
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── Compute live generation statistics on the fly ──────────────────────
  const getLiveGenerationPoint = (st) => {
    if (!st || !st.agents || st.agents.length === 0) return null;

    const total = st.agents.length;
    const alive = st.agents.filter((a) => a.alive);
    const aliveCount = alive.length;

    const sumFitness = st.agents.reduce((sum, a) => sum + (a.fitness || 0), 0);
    const avgFitness = sumFitness / total;

    const sumGenes = {
      aggression: 0,
      cooperation: 0,
      curiosity: 0,
      risk_taking: 0,
      intelligence: 0,
      trustworthiness: 0,
    };
    st.agents.forEach((a) => {
      if (a.genes) {
        sumGenes.aggression += a.genes.aggression || 0;
        sumGenes.cooperation += a.genes.cooperation || 0;
        sumGenes.curiosity += a.genes.curiosity || 0;
        sumGenes.risk_taking += a.genes.risk_taking || 0;
        sumGenes.intelligence += a.genes.intelligence || 0;
        sumGenes.trustworthiness += a.genes.trustworthiness || 0;
      }
    });

    const getStdDev = (vals) => {
      if (vals.length === 0) return 0;
      const mean = vals.reduce((s, x) => s + x, 0) / vals.length;
      return Math.sqrt(vals.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / vals.length);
    };

    const traitKeys = ["aggression", "cooperation", "curiosity", "risk_taking", "intelligence", "trustworthiness"];
    const stdDevs = traitKeys.map((key) => {
      const vals = st.agents.map((a) => a.genes?.[key] || 0);
      return getStdDev(vals);
    });
    const diversity = stdDevs.reduce((s, x) => s + x, 0) / stdDevs.length;

    // Estimate action counts percentages from current tick counts (fallback to placeholder values if empty)
    const collectPct = st.agents.reduce((sum, a) => sum + (a.current_action === "COLLECT" ? 1 : 0), 0);
    const attackPct = st.agents.reduce((sum, a) => sum + (a.current_action === "ATTACK" ? 1 : 0), 0);
    const tradePct = st.agents.reduce((sum, a) => sum + (a.current_action === "TRADE" ? 1 : 0), 0);
    const coopPct = st.agents.reduce((sum, a) => sum + (a.current_action === "COOPERATE" ? 1 : 0), 0);
    const movePct = st.agents.reduce((sum, a) => sum + (a.current_action === "MOVE" ? 1 : 0), 0);
    const restPct = st.agents.reduce((sum, a) => sum + (a.current_action === "REST" ? 1 : 0), 0);
    const totalActs = (collectPct + attackPct + tradePct + coopPct + movePct + restPct) || 1;

    return {
      generation: st.generation,
      average_fitness: avgFitness,
      survival_rate: total > 0 ? aliveCount / total : 0,
      average_aggression: sumGenes.aggression / total,
      average_cooperation: sumGenes.cooperation / total,
      average_curiosity: sumGenes.curiosity / total,
      average_risk: sumGenes.risk_taking / total,
      average_intelligence: sumGenes.intelligence / total,
      average_trust: sumGenes.trustworthiness / total,
      population_diversity: diversity,
      resources_collected: st.agents.reduce((sum, a) => sum + (a.resources_collected || 0), 0),
      successful_trades: st.agents.reduce((sum, a) => sum + (a.successful_trades || 0), 0),
      tasks_completed: st.agents.reduce((sum, a) => sum + (a.successful_cooperations || 0), 0),
      
      // Live tick action distribution
      collect_pct: (collectPct / totalActs) * 100,
      attack_pct: (attackPct / totalActs) * 100,
      trade_pct: (tradePct / totalActs) * 100,
      cooperation_pct: (coopPct / totalActs) * 100,
      move_pct: (movePct / totalActs) * 100,
      rest_pct: (restPct / totalActs) * 100,
    };
  };

  // ── Combine backend gen history with live tick statistics ──────────────────
  const combinedHistory = useMemo(() => {
    const livePoint = getLiveGenerationPoint(state);
    if (!livePoint) return history;
    const filtered = history.filter((h) => h.generation !== livePoint.generation);
    return [...filtered, livePoint];
  }, [history, state]);

  // ── Sync combined history to the respective slot in the comparison panel ─────
  useEffect(() => {
    if (state?.decision_mode && combinedHistory.length > 0) {
      const mode = state.decision_mode;
      if (mode === "RULE")        setRuleRecord([...combinedHistory]);
      else if (mode === "LLM")    setLlmRecord([...combinedHistory]);
      else if (mode === "HYBRID") setHybridRecord([...combinedHistory]);
    }
  }, [combinedHistory, state?.decision_mode]);

  // ── Init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    startNewSimulation();
    return () => cleanupConnections();
  }, []);

  const cleanupConnections = () => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    if (statsPollRef.current) { clearInterval(statsPollRef.current); statsPollRef.current = null; }
  };

  const startNewSimulation = async () => {
    setReady(false);
    cleanupConnections();

    // Fire-and-forget start call
    api.start(initialSettings).then(() => {
      connectWebSocket();
    }).catch(() => {
      startPolling();
    });

    // Immediate initial probe to remove loader instantly
    setTimeout(async () => {
      try {
        const s = await api.getState();
        if (s && s.generation !== undefined) {
          setState(s);
          setReady(true);
        }
      } catch (_) {}
    }, 500);

    // Periodic historical generation stats polling
    statsPollRef.current = setInterval(async () => {
      try {
        const h = await api.getStats();
        if (h && h.length > 0) {
          setHistory(h);
        }
      } catch (_) {}
    }, 2000);
  };

  const connectWebSocket = () => {
    try {
      const ws = api.getWebSocket();
      wsRef.current = ws;
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setState(data);
          setReady(true);
        } catch (_) {}
      };
      ws.onclose = () => startPolling();
      ws.onerror = () => ws.close();
    } catch (_) {
      startPolling();
    }
  };

  const startPolling = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      try {
        const s = await api.getState();
        if (s && s.generation !== undefined) {
          setState(s);
          setReady(true);
        }
      } catch (_) {}
    }, 80);
  };

  // Keep inspector in sync with live state
  useEffect(() => {
    if (selectedAgent && state?.agents) {
      const updated = state.agents.find(a => a.id === selectedAgent.id);
      if (updated) setSelectedAgent(updated);
    }
  }, [state]);

  const handlePlay   = () => api.control("play");
  const handlePause  = () => api.control("pause");
  const handleStep   = () => api.control("tick", 1);
  const handleReset  = () => startNewSimulation();
  const handleSpeedChange = async (v) => { setFps(v); await api.control("set_fps", 1, v); };
  const handleExport = () => window.open(api.getExportUrl(), "_blank");

  if (!ready || !state) return <DashboardSkeleton />;

  const decisionMode = state.decision_mode || "RULE";
  const modeColor = {
    RULE:   "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
    LLM:    "bg-purple-500/15 text-purple-400 border-purple-500/25",
    HYBRID: "bg-pink-500/15 text-pink-400 border-pink-500/25"
  }[decisionMode] ?? "bg-white/10 text-gray-400 border-white/10";

  return (
    <div className="max-w-7xl mx-auto w-full p-6 space-y-6 z-10 relative">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="liquid-glass p-4 rounded-3xl flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all duration-200">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-black text-white tracking-wide flex items-center gap-2 flex-wrap">
              <span className="live-dot mr-1" />
              Ecosystem Control Dashboard
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${modeColor}`}>
                {decisionMode}
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/5 text-gray-400 font-bold border border-white/10">
                {state.scenario?.replace(/_/g, " ").toUpperCase()}
              </span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-white/5 text-gray-400 font-bold border border-white/10">
                {state.mode === "GA" ? "EVOLVING" : "FIXED"}
              </span>
            </h1>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Model: <span className="text-purple-400 font-semibold">{state.ollama_model}</span>
              {" "}· Gen {state.generation} · Tick {state.tick}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Play / Pause / Step / Reset */}
          <div className="flex bg-[#0e0e18] border border-white/10 rounded-2xl p-1 gap-1">
            {state.running ? (
              <button onClick={handlePause}
                className="p-2.5 rounded-xl text-yellow-400 hover:bg-yellow-500/10 active:scale-95 transition-all" title="Pause">
                <Pause className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handlePlay}
                className="p-2.5 rounded-xl text-green-400 hover:bg-green-500/10 active:scale-95 transition-all" title="Play">
                <Play className="w-4 h-4" />
              </button>
            )}
            <button onClick={handleStep} disabled={state.running}
              className="p-2.5 rounded-xl text-cyan-400 hover:bg-cyan-500/10 active:scale-95 disabled:opacity-30 transition-all" title="Step Tick">
              <FastForward className="w-4 h-4" />
            </button>
            <button onClick={handleReset}
              className="p-2.5 rounded-xl text-purple-400 hover:bg-purple-500/10 active:scale-95 transition-all" title="Reset">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Speed */}
          <div className="hidden sm:flex flex-col">
            <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-1">Speed</span>
            <select value={fps} onChange={e => handleSpeedChange(parseInt(e.target.value))}
              className="bg-[#0e0e18] border border-white/10 text-xs text-gray-300 rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500 transition-colors">
              <option value={5}>Slow (5 T/s)</option>
              <option value={20}>Normal (20 T/s)</option>
              <option value={50}>Fast (50 T/s)</option>
              <option value={100}>Ultra (100 T/s)</option>
            </select>
          </div>

          <button onClick={handleExport} disabled={history.length === 0}
            className="py-2 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-gray-300 hover:bg-white/10 hover:text-white flex items-center gap-2 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all duration-200">
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Export</span>
          </button>
          <span className="text-gray-600">|</span>
          <a
            href="https://github.com/tharunprinz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors flex items-center mr-2"
            title="GitHub Profile"
          >
            <GithubIcon className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* ── Stats Panel ──────────────────────────────────────────────── */}
      <StatsPanel state={state} />

      {/* ── Canvas + Inspector ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 canvas-glow-wrap">
          <SimulationCanvas state={state} selectedAgentId={selectedAgent?.id} onSelectAgent={setSelectedAgent} />
        </div>
        <div className="lg:col-span-4 min-h-[600px]">
          {selectedAgent ? (
            <AgentInspectorPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
          ) : (
            <div className="w-full h-full min-h-[600px] liquid-glass-dark border border-white/8 rounded-3xl flex flex-col items-center justify-center p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center mb-4">
                <Activity className="w-7 h-7 text-gray-600" />
              </div>
              <p className="text-sm font-bold text-gray-400">Agent Inspector</p>
              <p className="text-xs text-gray-600 mt-2 leading-relaxed max-w-xs">
                Click any glowing dot on the canvas to inspect their personality genes, vitals and LLM reasoning logs.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Charts Row (Uses combinedHistory for real-time tick-by-tick animation) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EvolutionChart history={combinedHistory} />
        <DecisionEngineMonitor state={state} history={combinedHistory} />
      </div>

      {/* ── Research Comparison ──────────────────────────────────────── */}
      <ResearchModePanel ruleRecord={ruleRecord} llmRecord={llmRecord} hybridRecord={hybridRecord} />

      <footer className="w-full text-center text-xs text-gray-500 mt-12 z-10 max-w-7xl mx-auto border-t border-white/5 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2">
        <span>EvoTribes — Genetic Algorithms + Local Ollama Personality Engine</span>
        <span>
          Built by{" "}
          <a
            href="https://github.com/tharunprinz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 transition-colors font-semibold"
          >
            Tharun R and Team
          </a>
        </span>
      </footer>
    </div>
  );
};
