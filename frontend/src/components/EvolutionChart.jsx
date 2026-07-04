import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart, Area,
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from "recharts";
import { TrendingUp, Dna } from "lucide-react";

const TRAIT_LINES = [
  { key: "aggression",    name: "Aggression",    color: "#ef4444" },
  { key: "cooperation",   name: "Cooperation",   color: "#22c55e" },
  { key: "curiosity",     name: "Curiosity",     color: "#06b6d4" },
  { key: "risk",          name: "Risk Taking",   color: "#f97316" },
  { key: "intelligence",  name: "Intelligence",  color: "#a855f7" },
  { key: "trust",         name: "Trust",         color: "#ec4899" }
];

const GlassTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0e0e18]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-3 text-left shadow-2xl min-w-[160px]">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Gen {label}</p>
      <div className="space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex justify-between gap-6 items-center">
            <span className="text-[11px] font-medium" style={{ color: p.color }}>{p.name}</span>
            <span className="text-[11px] font-black text-white tabular-nums">{Number(p.value).toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const EvolutionChart = ({ history }) => {
  const [activeTab, setActiveTab] = useState("traits");

  // Memoised chart data derived from history prop
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history.map(h => ({
      gen:          h.generation,
      fitness:      +(h.average_fitness      ?? 0).toFixed(2),
      diversity:    +(h.population_diversity  ?? 0).toFixed(2),
      aggression:   +(h.average_aggression    ?? 0).toFixed(1),
      cooperation:  +(h.average_cooperation   ?? 0).toFixed(1),
      curiosity:    +(h.average_curiosity      ?? 0).toFixed(1),
      risk:         +(h.average_risk          ?? 0).toFixed(1),
      intelligence: +(h.average_intelligence  ?? 0).toFixed(1),
      trust:        +(h.average_trust         ?? 0).toFixed(1)
    }));
  }, [history]);

  const isEmpty = chartData.length === 0;

  return (
    <div className="w-full liquid-glass p-5 rounded-3xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-400" />
            Evolution Analytics
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {isEmpty
              ? "Waiting for first generation to complete…"
              : `${chartData.length} generation${chartData.length !== 1 ? "s" : ""} tracked`}
          </p>
        </div>

        <div className="flex bg-[#0e0e18] border border-white/10 rounded-xl p-1 gap-0.5">
          {[
            { key: "traits",  label: "Genes",   icon: <Dna className="w-3 h-3" /> },
            { key: "fitness", label: "Fitness",  icon: <TrendingUp className="w-3 h-3" /> }
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                  : "text-gray-500 hover:text-gray-300"
              }`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="w-full h-[300px]">
        {isEmpty ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <div className="grid grid-cols-3 gap-2 w-full opacity-30">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton h-4 rounded" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-xs text-gray-600">Charts populate after generation 1 completes</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {activeTab === "traits" ? (
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                <defs>
                  {TRAIT_LINES.map(t => (
                    <filter key={t.key} id={`glow-${t.key}`} x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="gen" stroke="#374151" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} />
                <YAxis stroke="#374151" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} domain={[0, 100]} />
                <Tooltip content={<GlassTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 8 }} />
                {TRAIT_LINES.map(t => (
                  <Line
                    key={t.key}
                    type="monotoneX"
                    dataKey={t.key}
                    name={t.name}
                    stroke={t.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: t.color, strokeWidth: 0 }}
                    isAnimationActive={true}
                    animationDuration={400}
                    animationEasing="ease-out"
                  />
                ))}
              </LineChart>
            ) : (
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradFitness" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#a855f7" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="gradDiv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="gen" stroke="#374151" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} />
                <YAxis stroke="#374151" tick={{ fill: "#6b7280", fontSize: 10 }} tickLine={false} />
                <Tooltip content={<GlassTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 8 }} />
                <Area
                  type="monotoneX" dataKey="fitness" name="Avg Fitness"
                  stroke="#a855f7" strokeWidth={2.5}
                  fill="url(#gradFitness)" fillOpacity={1}
                  isAnimationActive={true} animationDuration={500} animationEasing="ease-out"
                />
                <Area
                  type="monotoneX" dataKey="diversity" name="Genetic Diversity"
                  stroke="#10b981" strokeWidth={2}
                  fill="url(#gradDiv)" fillOpacity={1}
                  isAnimationActive={true} animationDuration={500} animationEasing="ease-out"
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
