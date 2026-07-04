import React, { useRef, useEffect } from "react";
import { Users, Hourglass, Award, Zap } from "lucide-react";

// Flash the card background briefly when its value changes
function useFlash(value) {
  const ref    = useRef(null);
  const prevVal = useRef(value);
  useEffect(() => {
    if (ref.current && prevVal.current !== value) {
      ref.current.classList.remove("stat-flash");
      // Force reflow to restart animation
      void ref.current.offsetWidth;
      ref.current.classList.add("stat-flash");
      prevVal.current = value;
    }
  }, [value]);
  return ref;
}

const StatCard = ({ title, value, sub, icon, borderColor, flashValue }) => {
  const cardRef = useFlash(flashValue ?? value);
  return (
    <div
      ref={cardRef}
      className={`liquid-glass p-5 rounded-2xl border-l-[3px] flex flex-col gap-2 hover:-translate-y-0.5 transition-all duration-300 ${borderColor}`}
    >
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-tight max-w-[80%]">
          {title}
        </span>
        <div className="p-1.5 rounded-lg bg-white/5 border border-white/8 flex-shrink-0">
          {icon}
        </div>
      </div>
      <div className="text-2xl font-black text-white tracking-tight tabular-nums leading-none">
        {value}
      </div>
      <div className="text-[11px] text-gray-500 leading-tight">{sub}</div>
    </div>
  );
};

export const StatsPanel = ({ state }) => {
  const { generation, tick, alive_count, agents, resources } = state;

  const aliveAgents = agents?.filter(a => a.alive) ?? [];
  const avgFitness  = aliveAgents.length
    ? (aliveAgents.reduce((s, a) => s + a.fitness, 0) / aliveAgents.length).toFixed(1)
    : "0.0";

  const totalAgents = agents?.length ?? 0;
  const resCount    = resources?.length ?? 0;
  const survivalPct = totalAgents > 0
    ? ((alive_count / totalAgents) * 100).toFixed(0)
    : "0";

  const cards = [
    {
      title:       "Generation · Tick",
      value:       `Gen ${generation}`,
      sub:         `Tick ${tick}`,
      flashValue:  generation,
      icon:        <Hourglass className="w-4 h-4 text-purple-400" />,
      borderColor: "border-purple-500"
    },
    {
      title:       "Active Population",
      value:       `${alive_count}`,
      sub:         `${survivalPct}% survived · ${totalAgents} total`,
      flashValue:  alive_count,
      icon:        <Users className="w-4 h-4 text-cyan-400" />,
      borderColor: "border-cyan-500"
    },
    {
      title:       "Ecosystem Resources",
      value:       `${resCount}`,
      sub:         "Active resource nodes",
      flashValue:  resCount,
      icon:        <Zap className="w-4 h-4 text-yellow-400" />,
      borderColor: "border-yellow-500"
    },
    {
      title:       "Mean Live Fitness",
      value:       `${avgFitness}`,
      sub:         "Evolved competence score",
      flashValue:  avgFitness,
      icon:        <Award className="w-4 h-4 text-pink-400" />,
      borderColor: "border-pink-500"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <StatCard key={idx} {...card} />
      ))}
    </div>
  );
};
