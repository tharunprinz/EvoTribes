import React, { useRef, useEffect, useCallback, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, Eye } from "lucide-react";

const GRID_W = 50;
const GRID_H = 50;
const CELL  = 12;
const CW    = GRID_W * CELL;
const CH    = GRID_H * CELL;

const TRAIT_COLORS = {
  aggression:     "#ef4444",
  cooperation:    "#22c55e",
  curiosity:      "#06b6d4",
  risk_taking:    "#f97316",
  intelligence:   "#a855f7",
  trustworthiness:"#ec4899"
};

function getDominantColor(genes) {
  if (!genes) return "#a855f7";
  let best = "intelligence", bestVal = 0;
  for (const [k, v] of Object.entries(genes)) {
    if (v > bestVal) { bestVal = v; best = k; }
  }
  return TRAIT_COLORS[best] ?? "#a855f7";
}

// Draw one full frame — kept outside component to avoid closure staleness
function drawFrame(ctx, state, selectedAgentId, scale, offset) {
  ctx.clearRect(0, 0, CW, CH);
  ctx.save();
  ctx.translate(offset.x, offset.y);
  ctx.scale(scale, scale);

  // 1 – grid
  ctx.strokeStyle = "rgba(255,255,255,0.025)";
  ctx.lineWidth   = 0.5;
  for (let x = 0; x <= GRID_W; x++) {
    ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, CH); ctx.stroke();
  }
  for (let y = 0; y <= GRID_H; y++) {
    ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(CW, y * CELL); ctx.stroke();
  }

  // 2 – safe zones
  if (state.safe_zones) {
    state.safe_zones.forEach(sz => {
      ctx.fillStyle = "rgba(34,197,94,0.07)";
      ctx.fillRect(sz.x * CELL, sz.y * CELL, CELL, CELL);
      ctx.strokeStyle = "rgba(34,197,94,0.18)";
      ctx.lineWidth = 0.8;
      ctx.strokeRect(sz.x * CELL + 0.5, sz.y * CELL + 0.5, CELL - 1, CELL - 1);
    });
  }

  // 3 – obstacles
  if (state.obstacles) {
    ctx.fillStyle   = "rgba(55,65,81,0.55)";
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth   = 1;
    state.obstacles.forEach(o => {
      const rx = o.x * CELL + 1, ry = o.y * CELL + 1, rw = CELL - 2, rh = CELL - 2;
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  // 4 – resources (glowing gems)
  if (state.resources) {
    state.resources.forEach(r => {
      const cx = r.x * CELL + CELL / 2;
      const cy = r.y * CELL + CELL / 2;
      const radius = CELL * 0.32;

      // outer glow halo
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, CELL * 0.9);
      grad.addColorStop(0,   "rgba(234,179,8,0.22)");
      grad.addColorStop(1,   "rgba(234,179,8,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, CELL * 0.9, 0, Math.PI * 2);
      ctx.fill();

      // gem body
      ctx.shadowBlur  = 10;
      ctx.shadowColor = "#eab308";
      ctx.fillStyle   = "#eab308";
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // bright highlight
      ctx.shadowBlur = 0;
      ctx.fillStyle  = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(cx - radius * 0.28, cy - radius * 0.28, radius * 0.32, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 5 – agents
  if (state.agents) {
    state.agents.forEach(agent => {
      const ax = agent.x * CELL + CELL / 2;
      const ay = agent.y * CELL + CELL / 2;

      if (!agent.alive) {
        // dead cross — faded grey
        ctx.strokeStyle = "rgba(107,114,128,0.35)";
        ctx.lineWidth   = 1.2;
        ctx.beginPath();
        ctx.moveTo(ax - 3, ay - 3); ctx.lineTo(ax + 3, ay + 3);
        ctx.moveTo(ax + 3, ay - 3); ctx.lineTo(ax - 3, ay + 3);
        ctx.stroke();
        return;
      }

      const color    = getDominantColor(agent.genes);
      const isSelected = agent.id === selectedAgentId;

      // selection ring
      if (isSelected) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth   = 2;
        ctx.shadowBlur  = 16;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(ax, ay, CELL * 0.72, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // outer glow halo
      const haloGrad = ctx.createRadialGradient(ax, ay, 0, ax, ay, CELL * 0.8);
      haloGrad.addColorStop(0,  color + "44");
      haloGrad.addColorStop(1,  color + "00");
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(ax, ay, CELL * 0.8, 0, Math.PI * 2);
      ctx.fill();

      // agent body
      ctx.shadowBlur  = isSelected ? 14 : 8;
      ctx.shadowColor = color;
      ctx.fillStyle   = color;
      ctx.beginPath();
      ctx.arc(ax, ay, CELL * 0.40, 0, Math.PI * 2);
      ctx.fill();

      // health ring (thin arc showing health %)
      const health = (agent.health ?? 100) / 100;
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth   = 1.2;
      ctx.beginPath();
      ctx.arc(ax, ay, CELL * 0.40, -Math.PI / 2, -Math.PI / 2 + health * 2 * Math.PI);
      ctx.stroke();

      // nucleus
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(ax, ay, CELL * 0.12, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
    });
  }

  ctx.restore();
}

export const SimulationCanvas = ({ state, selectedAgentId, onSelectAgent }) => {
  const canvasRef  = useRef(null);
  const rafRef     = useRef(null);
  const stateRef   = useRef(state);       // latest state without triggering re-renders
  const scaleRef   = useRef(1);
  const offsetRef  = useRef({ x: 0, y: 0 });
  const [scale, setScale]   = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState(selectedAgentId);

  // Keep refs in sync
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { scaleRef.current = scale; },  [scale]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { setSelectedId(selectedAgentId); }, [selectedAgentId]);

  // RAF render loop — completely decoupled from React's render cycle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });

    const loop = () => {
      if (stateRef.current) {
        drawFrame(ctx, stateRef.current, selectedId, scaleRef.current, offsetRef.current);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [selectedId]); // re-create loop only when selection changes (to redraw ring)

  // Drag state (uses plain refs so it doesn't cause renders)
  const dragRef     = useRef(false);
  const dragStart   = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(e => {
    dragRef.current  = true;
    dragStart.current = { x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y };
  }, []);

  const handleMouseMove = useCallback(e => {
    if (!dragRef.current) return;
    const nx = e.clientX - dragStart.current.x;
    const ny = e.clientY - dragStart.current.y;
    offsetRef.current = { x: nx, y: ny };
    setOffset({ x: nx, y: ny }); // sync React state for controls display
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = false;
  }, []);

  const handleClick = useCallback(e => {
    if (dragRef.current) return;
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const cellX = Math.floor((cx - offsetRef.current.x) / (scaleRef.current * CELL));
    const cellY = Math.floor((cy - offsetRef.current.y) / (scaleRef.current * CELL));
    const clicked = stateRef.current?.agents?.find(a => a.x === cellX && a.y === cellY && a.alive);
    if (clicked) onSelectAgent(clicked);
  }, [onSelectAgent]);

  const handleWheel = useCallback(e => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const next  = Math.min(Math.max(scaleRef.current + delta, 0.4), 4);
    scaleRef.current = next;
    setScale(next);
  }, []);

  const zoomIn  = () => { const n = Math.min(scale + 0.25, 4); setScale(n); scaleRef.current = n; };
  const zoomOut = () => { const n = Math.max(scale - 0.25, 0.4); setScale(n); scaleRef.current = n; };
  const reset   = () => { setScale(1); setOffset({ x: 0, y: 0 }); scaleRef.current = 1; offsetRef.current = { x: 0, y: 0 }; };

  const alive  = state?.agents?.filter(a => a.alive).length ?? 0;
  const total  = state?.agents?.length ?? 0;
  const resCount = state?.resources?.length ?? 0;

  return (
    <div className="relative w-full h-[600px] bg-[#070710] rounded-3xl overflow-hidden border border-white/8 flex items-center justify-center">
      {/* Top-left: zoom controls */}
      <div className="absolute top-4 left-4 z-20 flex gap-1.5">
        {[
          { icon: <ZoomIn className="w-3.5 h-3.5" />, action: zoomIn, title: "Zoom In" },
          { icon: <ZoomOut className="w-3.5 h-3.5" />, action: zoomOut, title: "Zoom Out" },
          { icon: <Maximize2 className="w-3.5 h-3.5" />, action: reset, title: "Reset View" }
        ].map((b, i) => (
          <button key={i} onClick={b.action} title={b.title}
            className="p-2 rounded-xl bg-black/50 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white active:scale-90 transition-all duration-150 backdrop-blur-sm">
            {b.icon}
          </button>
        ))}
      </div>

      {/* Top-right: live stat badges */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 border border-white/8 backdrop-blur-sm text-[11px]">
          <Eye className="w-3 h-3 text-cyan-400" />
          <span className="text-gray-300">{alive}</span>
          <span className="text-gray-600">/</span>
          <span className="text-gray-500">{total} alive</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 border border-white/8 backdrop-blur-sm text-[11px]">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-gray-300">{resCount} res</span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-wrap gap-1.5">
        {Object.entries(TRAIT_COLORS).map(([k, c]) => (
          <div key={k} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm border border-white/8 text-[9px] text-gray-400">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
            {k.replace("_", " ")}
          </div>
        ))}
      </div>

      <canvas
        ref={canvasRef}
        width={CW}
        height={CH}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        className="cursor-grab active:cursor-grabbing max-w-full max-h-full"
        style={{ touchAction: "none" }}
      />
    </div>
  );
};
