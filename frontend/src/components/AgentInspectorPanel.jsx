import React, { useState } from "react";
import { X, Heart, Shield, Award, PlayCircle, ChevronDown, ChevronUp, Brain } from "lucide-react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

export const AgentInspectorPanel = ({ agent, onClose }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showResponse, setShowResponse] = useState(false);

  if (!agent) return null;

  const radarData = [
    { subject: "Aggression", A: agent.genes.aggression, fullMark: 100 },
    { subject: "Cooperation", A: agent.genes.cooperation, fullMark: 100 },
    { subject: "Curiosity", A: agent.genes.curiosity, fullMark: 100 },
    { subject: "Risk Taking", A: agent.genes.risk_taking, fullMark: 100 },
    { subject: "Intelligence", A: agent.genes.intelligence, fullMark: 100 },
    { subject: "Trust", A: agent.genes.trustworthiness, fullMark: 100 }
  ];

  const hasLLMData = agent.last_llm_prompt && agent.last_llm_prompt.length > 0;

  return (
    <div className="w-full h-full liquid-glass-premium p-5 rounded-3xl border border-white/10 flex flex-col gap-4 overflow-y-auto relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide">Agent Inspector</h2>
          <p className="text-xs text-gray-500">ID: {agent.id}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white transition-all">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Radar */}
      <div className="w-full h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.05)" />
            <PolarAngleAxis dataKey="subject" stroke="#9ca3af" fontSize={9} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="none" tick={false} />
            <Radar name="Genes" dataKey="A" stroke="#a855f7" fill="#a855f7" fillOpacity={0.3} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Progress Bars */}
      {[
        { label: "Health", value: agent.health, icon: <Heart className="w-3.5 h-3.5 text-red-500" />, gradient: "from-red-500 to-pink-500" },
        { label: "Energy", value: agent.energy, icon: <Shield className="w-3.5 h-3.5 text-orange-400" />, gradient: "from-orange-400 to-yellow-400" }
      ].map((bar, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span className="flex items-center gap-1">{bar.icon}{bar.label}</span>
            <span className="font-bold text-white">{bar.value.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-white/5 border border-white/10 rounded-full h-1.5 overflow-hidden">
            <div className={`bg-gradient-to-r ${bar.gradient} h-full transition-all duration-300`} style={{ width: `${Math.max(0, bar.value)}%` }} />
          </div>
        </div>
      ))}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Age (Ticks)", val: agent.survival_time },
          { label: "Collected", val: agent.resources_collected },
          { label: "Fitness Score", val: agent.fitness.toFixed(1) }
        ].map((s, i) => (
          <div key={i} className="bg-[#12121a]/55 border border-white/5 p-3 rounded-xl text-left">
            <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">{s.label}</div>
            <div className="text-white text-base font-extrabold">{s.val}</div>
          </div>
        ))}
        <div className="bg-[#12121a]/55 border border-white/5 p-3 rounded-xl text-left">
          <div className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Action</div>
          <div className="text-cyan-400 text-xs font-black tracking-wider uppercase flex items-center gap-1 mt-0.5">
            <PlayCircle className="w-3.5 h-3.5 animate-pulse" />
            {agent.current_action}
          </div>
        </div>
      </div>

      {/* Gene Values */}
      <div className="border-t border-white/10 pt-3">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Gene Magnitudes</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {[
            { key: "aggression", color: "text-red-400" },
            { key: "cooperation", color: "text-green-400" },
            { key: "curiosity", color: "text-cyan-400" },
            { key: "risk_taking", color: "text-orange-400" },
            { key: "intelligence", color: "text-purple-400" },
            { key: "trustworthiness", color: "text-pink-400" }
          ].map((g) => (
            <div key={g.key} className="flex justify-between border-b border-white/5 pb-1">
              <span className="text-gray-500 capitalize">{g.key.replace("_", " ")}</span>
              <span className={`font-bold ${g.color}`}>{agent.genes[g.key].toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* LLM Prompt/Response collapsible sections */}
      {hasLLMData && (
        <div className="border-t border-white/10 pt-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
            <Brain className="w-3.5 h-3.5" />
            Ollama Reasoning Log
          </div>

          {/* Prompt */}
          <div className="bg-[#12121a]/60 border border-white/5 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowPrompt(!showPrompt)}
              className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-gray-400 hover:text-white transition-colors"
            >
              <span>Prompt Sent to LLM</span>
              {showPrompt ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showPrompt && (
              <div className="px-3 pb-3 text-[10px] text-gray-400 font-mono whitespace-pre-wrap leading-relaxed border-t border-white/5 max-h-36 overflow-y-auto">
                {agent.last_llm_prompt}
              </div>
            )}
          </div>

          {/* Response */}
          <div className="bg-[#12121a]/60 border border-white/5 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowResponse(!showResponse)}
              className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold text-gray-400 hover:text-white transition-colors"
            >
              <span>LLM Raw Response</span>
              {showResponse ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showResponse && (
              <div className={`px-3 pb-3 text-[11px] font-mono border-t border-white/5 ${
                agent.last_llm_response?.startsWith("FAIL") ? "text-red-400" : "text-green-400"
              }`}>
                {agent.last_llm_response || "No response recorded"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
