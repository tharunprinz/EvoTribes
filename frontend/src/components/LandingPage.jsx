import React, { useState } from "react";
import { Brain, Sparkles, ChevronRight, Settings, Cpu } from "lucide-react";

const GithubIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const OLLAMA_MODELS = ["qwen3:4b", "llama3.2:3b", "gemma3:4b"];

const SCENARIOS = [
  { id: "default", name: "Standard", desc: "Balanced ecosystem with 200 resources, obstacles, and safe zones." },
  { id: "resource_abundance", name: "Resource Abundance", desc: "500 resource nodes. Will cooperation and trust emerge?" },
  { id: "resource_scarcity", name: "Resource Scarcity", desc: "Only 50 resources. Does aggression and theft dominate?" },
  { id: "natural_disasters", name: "Natural Disasters", desc: "Periodic environmental threats. 20% random agent decimation every 100 ticks." },
  { id: "mixed_society", name: "Mixed Tribes", desc: "Ecosystem populated with Cooperative, Aggressive, and Balanced tribes." }
];

const DECISION_MODES = [
  { id: "RULE", label: "Rule-Based", desc: "Fast weighted probability engine", color: "bg-cyan-600" },
  { id: "LLM", label: "LLM (Ollama)", desc: "Local qwen3:4b personality reasoning", color: "bg-purple-600" },
  { id: "HYBRID", label: "Hybrid", desc: "Rules for routines, LLM for decisions", color: "bg-pink-600" }
];

export const LandingPage = ({ onStart }) => {
  const [scenario, setScenario] = useState("default");
  const [mode, setMode] = useState("GA");
  const [popSize, setPopSize] = useState(100);
  const [maxGen, setMaxGen] = useState(100);
  const [ticksPerGen, setTicksPerGen] = useState(500);
  const [decisionMode, setDecisionMode] = useState("RULE");
  const [ollamaModel, setOllamaModel] = useState("qwen3:4b");

  const handleSubmit = (e) => {
    e.preventDefault();
    onStart({ scenario, mode, popSize, maxGen, ticksPerGen, decisionMode, ollamaModel });
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 relative">
      {/* Navigation */}
      <nav className="w-full max-w-6xl mx-auto liquid-glass py-4 px-8 rounded-full flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-cyan-400 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            EVOTRIBES
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-400">
          <Cpu className="w-4 h-4 text-purple-400" />
          <span>Ollama Local AI</span>
          <span className="text-gray-600">v1.1.0</span>
          <span className="text-gray-600">|</span>
          <a
            href="https://github.com/tharunprinz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors flex items-center"
            title="GitHub Profile"
          >
            <GithubIcon className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* Hero + Config Grid */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto z-10 pt-10">
        {/* Hero Text */}
        <div className="lg:col-span-6 flex flex-col justify-center text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit mb-6 text-xs text-cyan-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Evolutionary Computation + Local Ollama Personality Engine</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Evolution of <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
              Artificial Personalities
            </span>
          </h1>
          
          <p className="text-base text-gray-400 mb-8 leading-relaxed max-w-lg">
            Autonomous agents evolve 6 personality genes across 100 generations. 
            Local Ollama reasoning lets genes directly influence how agents think, fight, trade, and cooperate.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { val: "6", label: "Personality Genes", color: "text-purple-400" },
              { val: "3", label: "Decision Modes", color: "text-cyan-400" },
              { val: "100%", label: "Local AI", color: "text-pink-400" }
            ].map((stat, i) => (
              <div key={i} className="liquid-glass p-4 rounded-2xl text-center hover:scale-105 transition-transform">
                <div className={`font-extrabold text-xl ${stat.color}`}>{stat.val}</div>
                <div className="text-gray-500 text-xs mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Decision Mode info cards */}
          <div className="space-y-2">
            {DECISION_MODES.map((dm) => (
              <div
                key={dm.id}
                onClick={() => setDecisionMode(dm.id)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                  decisionMode === dm.id
                    ? "border-white/20 bg-white/8 scale-[1.01]"
                    : "border-white/5 bg-white/3 hover:bg-white/5"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${dm.color} ${decisionMode === dm.id ? "animate-pulse" : "opacity-40"}`} />
                <div className="text-left">
                  <span className={`text-xs font-bold ${decisionMode === dm.id ? "text-white" : "text-gray-400"}`}>{dm.label}</span>
                  <p className="text-[10px] text-gray-500">{dm.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="lg:col-span-6">
          <form onSubmit={handleSubmit} className="liquid-glass-premium p-8 rounded-3xl glow-pulse text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-3 mb-6">
              <Settings className="w-5 h-5 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Simulation Setup</h2>
            </div>

            {/* Scenario */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                Environmental Scenario
              </label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="w-full bg-[#12121a]/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition-colors"
              >
                {SCENARIOS.map((sc) => (
                  <option key={sc.id} value={sc.id}>{sc.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1.5 italic">
                {SCENARIOS.find((s) => s.id === scenario)?.desc}
              </p>
            </div>

            {/* Ollama Model + GA Mode row */}
            <div className="mb-5 grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                  Ollama Model
                </label>
                <select
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  className="w-full bg-[#12121a]/80 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-purple-500 transition-colors"
                >
                  {OLLAMA_MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                  Evolutive Mode
                </label>
                <div className="grid grid-cols-2 bg-[#12121a]/80 border border-white/10 rounded-xl p-1 h-[42px]">
                  <button type="button" onClick={() => setMode("GA")}
                    className={`text-xs rounded-lg font-medium transition-all ${mode === "GA" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-200"}`}>
                    GA Active
                  </button>
                  <button type="button" onClick={() => setMode("NO_GA")}
                    className={`text-xs rounded-lg font-medium transition-all ${mode === "NO_GA" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-200"}`}>
                    Fixed
                  </button>
                </div>
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4 mb-6">
              {[
                { label: "Initial Population", val: popSize, min: 30, max: 200, step: 10, set: setPopSize, unit: "Agents", color: "text-cyan-400", accent: "accent-cyan-400" },
                { label: "Generations Limit", val: maxGen, min: 20, max: 200, step: 10, set: setMaxGen, unit: "Epochs", color: "text-purple-400", accent: "accent-purple-400" },
                { label: "Ticks per Generation", val: ticksPerGen, min: 100, max: 1000, step: 50, set: setTicksPerGen, unit: "Ticks", color: "text-pink-400", accent: "accent-pink-400" }
              ].map((s, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    <span>{s.label}</span>
                    <span className={s.color}>{s.val} {s.unit}</span>
                  </div>
                  <input type="range" min={s.min} max={s.max} step={s.step} value={s.val}
                    onChange={(e) => s.set(parseInt(e.target.value))}
                    className={`w-full ${s.accent} h-1 bg-white/10 rounded-lg cursor-pointer`}
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 text-white font-bold tracking-wider hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <span>INITIALIZE ECOSYSTEM</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      <footer className="w-full text-center text-xs text-gray-500 mt-12 z-10 max-w-6xl mx-auto border-t border-white/5 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2">
        <span>EvoTribes — Genetic Algorithms + Local Ollama Personality Engine</span>
        <span className="flex items-center gap-2">
          Built by{" "}
          <a
            href="https://github.com/tharunprinz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-white transition-colors flex items-center"
            title="GitHub: tharunprinz"
          >
            <GithubIcon className="w-4 h-4" />
          </a>
          &amp; Team
        </span>
      </footer>
    </div>
  );
};
