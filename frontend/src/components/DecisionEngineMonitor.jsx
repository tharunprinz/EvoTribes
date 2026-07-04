import React from "react";
import { Cpu, Zap, ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const MODE_COLORS = { RULE: "#06b6d4", LLM: "#a855f7", HYBRID: "#ec4899" };
const ACTION_COLORS = {
  MOVE: "#06b6d4",
  ATTACK: "#ef4444",
  TRADE: "#ec4899",
  COOPERATE: "#22c55e",
  COLLECT: "#eab308",
  REST: "#6b7280"
};

export const DecisionEngineMonitor = ({ state, history }) => {
  const monitor = state?.monitor || {};
  const decisionMode = state?.decision_mode || "RULE";
  const ollamaModel = state?.ollama_model || "qwen3:4b";

  // Compute action distribution from last generation stats
  const lastGen = history && history.length > 0 ? history[history.length - 1] : null;
  const pieData = lastGen
    ? [
        { name: "Move", value: lastGen.move_pct || 0 },
        { name: "Attack", value: lastGen.attack_pct || 0 },
        { name: "Trade", value: lastGen.trade_pct || 0 },
        { name: "Cooperate", value: lastGen.cooperation_pct || 0 },
        { name: "Collect", value: lastGen.collect_pct || 0 },
        { name: "Rest", value: lastGen.rest_pct || 0 }
      ].filter((d) => d.value > 0)
    : [];

  const pieColors = ["#06b6d4", "#ef4444", "#ec4899", "#22c55e", "#eab308", "#6b7280"];
  
  const totalCalls = (monitor.llm_calls || 0) + (monitor.rule_calls || 0);
  const llmPct = totalCalls > 0 ? ((monitor.llm_calls || 0) / totalCalls * 100).toFixed(0) : 0;

  return (
    <div className="liquid-glass p-6 rounded-3xl h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            Decision Engine Monitor
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Local Ollama personality reasoning telemetry</p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${
          decisionMode === "RULE"
            ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
            : decisionMode === "LLM"
            ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
            : "border-pink-500/30 bg-pink-500/10 text-pink-400"
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
            decisionMode === "RULE" ? "bg-cyan-400" : decisionMode === "LLM" ? "bg-purple-400" : "bg-pink-400"
          }`} />
          {decisionMode} MODE
        </div>
      </div>

      {/* Metric Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#12121a]/40 border border-white/5 rounded-xl p-3 text-left">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Zap className="w-3 h-3 text-purple-400" />
            LLM Calls
          </div>
          <div className="text-xl font-black text-white">{monitor.llm_calls || 0}</div>
          <div className="text-[10px] text-gray-500">{llmPct}% of decisions</div>
        </div>
        <div className="bg-[#12121a]/40 border border-white/5 rounded-xl p-3 text-left">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-cyan-400" />
            Rule Calls
          </div>
          <div className="text-xl font-black text-white">{monitor.rule_calls || 0}</div>
          <div className="text-[10px] text-gray-500">{100 - parseInt(llmPct)}% of decisions</div>
        </div>
        <div className="bg-[#12121a]/40 border border-white/5 rounded-xl p-3 text-left col-span-2">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-yellow-400" />
            Avg LLM Response Time
          </div>
          <div className="flex items-end gap-2">
            <div className="text-xl font-black text-white">{monitor.average_response_time || 0}</div>
            <div className="text-gray-500 text-xs mb-1">ms per query</div>
          </div>
        </div>
      </div>

      {/* Active Model Display */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-[#12121a]/40 border border-purple-500/10">
        <div className="w-8 h-8 rounded-lg bg-purple-600/20 border border-purple-500/20 flex items-center justify-center">
          <Cpu className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-left">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Local Model</div>
          <div className="text-sm font-bold text-white font-mono">{ollamaModel}</div>
        </div>
        <div className={`ml-auto flex items-center gap-1.5 text-[10px] ${decisionMode === "RULE" ? "text-gray-500" : "text-green-400"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${decisionMode === "RULE" ? "bg-gray-600" : "bg-green-400 animate-pulse"}`} />
          {decisionMode === "RULE" ? "Standby" : "Active"}
        </div>
      </div>

      {/* Action Distribution Pie */}
      {pieData.length > 0 && (
        <div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
            Action Distribution (Last Gen)
          </div>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={22} outerRadius={42} dataKey="value" strokeWidth={0}>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => `${v.toFixed(1)}%`}
                    contentStyle={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-400">
              {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pieColors[i % pieColors.length] }} />
                  <span>{d.name}: <strong className="text-gray-200">{d.value.toFixed(0)}%</strong></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
