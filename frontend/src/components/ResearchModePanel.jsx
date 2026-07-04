import React from "react";
import { Scale, TrendingUp, Cpu, ShieldCheck, Layers } from "lucide-react";

const MODES = [
  { key: "RULE", label: "Experiment A", sub: "Pure Rule-Based", color: "text-cyan-400", border: "border-cyan-500/20", bg: "bg-cyan-500/5", icon: <ShieldCheck className="w-4 h-4 text-cyan-400" /> },
  { key: "LLM", label: "Experiment B", sub: "Pure LLM (Ollama)", color: "text-purple-400", border: "border-purple-500/20", bg: "bg-purple-500/5", icon: <Cpu className="w-4 h-4 text-purple-400" /> },
  { key: "HYBRID", label: "Experiment C", sub: "Hybrid Mode", color: "text-pink-400", border: "border-pink-500/20", bg: "bg-pink-500/5", icon: <Layers className="w-4 h-4 text-pink-400" /> }
];

const METRICS = [
  { key: "survival_rate", label: "Survival Rate", format: (v) => `${(v * 100).toFixed(1)}%`, higherIsBetter: true },
  { key: "resources", label: "Resources Harvested", format: (v) => v.toLocaleString(), higherIsBetter: true },
  { key: "tasks", label: "Cooperative Tasks", format: (v) => v.toLocaleString(), higherIsBetter: true },
  { key: "diversity", label: "Genetic Diversity", format: (v) => v.toFixed(1), higherIsBetter: true }
];

export const ResearchModePanel = ({ ruleRecord, llmRecord, hybridRecord }) => {
  const getFinalStats = (record) => {
    if (!record || record.length === 0) return null;
    const final = record[record.length - 1];
    return {
      survival_rate: final.survival_rate,
      resources: record.reduce((s, r) => s + r.resources_collected, 0),
      tasks: record.reduce((s, r) => s + r.tasks_completed, 0),
      diversity: final.population_diversity
    };
  };

  const statsMap = {
    RULE: getFinalStats(ruleRecord),
    LLM: getFinalStats(llmRecord),
    HYBRID: getFinalStats(hybridRecord)
  };

  const getBestKey = (metricKey, higherIsBetter) => {
    let best = null;
    let bestVal = null;
    for (const [k, stats] of Object.entries(statsMap)) {
      if (!stats || stats[metricKey] === null) continue;
      const val = stats[metricKey];
      if (bestVal === null || (higherIsBetter ? val > bestVal : val < bestVal)) {
        bestVal = val;
        best = k;
      }
    }
    return best;
  };

  const anyDataLoaded = Object.values(statsMap).some(Boolean);

  return (
    <div className="liquid-glass p-6 rounded-3xl h-full flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-400" />
            Research Comparison
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">3-Experiment Analysis: Rule vs LLM vs Hybrid</p>
        </div>
      </div>

      {/* Mode Cards */}
      <div className="grid grid-cols-3 gap-3">
        {MODES.map((m) => {
          const stats = statsMap[m.key];
          return (
            <div key={m.key} className={`p-3 rounded-2xl border ${m.border} ${m.bg} text-left`}>
              <div className="flex items-center gap-1.5 mb-1">
                {m.icon}
                <span className={`text-[10px] font-extrabold uppercase tracking-widest ${m.color}`}>{m.label}</span>
              </div>
              <p className="text-[10px] text-gray-500">{m.sub}</p>
              <div className={`text-[10px] font-semibold mt-2 ${stats ? m.color : "text-gray-600"}`}>
                {stats ? "✓ Data loaded" : "Run simulation first"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Metric comparison table */}
      <div className="flex-1 space-y-3">
        {METRICS.map((metric) => {
          const bestKey = getBestKey(metric.key, metric.higherIsBetter);
          return (
            <div key={metric.key} className="bg-[#12121a]/30 border border-white/5 p-4 rounded-2xl">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" />
                {metric.label}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MODES.map((m) => {
                  const stats = statsMap[m.key];
                  const val = stats?.[metric.key];
                  const isBest = bestKey === m.key;
                  return (
                    <div key={m.key} className={`text-center p-2 rounded-xl transition-all ${isBest ? `${m.bg} ${m.border} border` : "bg-white/3"}`}>
                      <div className="text-[9px] text-gray-500 mb-1">{m.label}</div>
                      <div className={`text-sm font-black ${isBest ? m.color : "text-gray-400"}`}>
                        {val !== undefined && val !== null ? metric.format(val) : "—"}
                      </div>
                      {isBest && val !== undefined && (
                        <div className="text-[9px] text-gray-500 mt-0.5">★ Best</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!anyDataLoaded && (
        <div className="text-center text-xs text-gray-600 py-2">
          Run experiments with different decision modes and compare results here.
        </div>
      )}
    </div>
  );
};
