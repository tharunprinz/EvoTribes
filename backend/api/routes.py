import io
import os
import zipfile
import asyncio
import threading
import time
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from fastapi.responses import StreamingResponse
import pandas as pd

from backend.simulation.simulation_engine import SimulationEngine

router = APIRouter()

# Global Thread-safe Manager
class SimulationManager:
    def __init__(self):
        self.engine: Optional[SimulationEngine] = None
        self.lock: threading.Lock = threading.Lock()
        self.running_thread: Optional[threading.Thread] = None
        self.stop_event: threading.Event = threading.Event()
        self.tick_delay: float = 0.05  # 50ms default delay between ticks (20 Ticks/sec)

    def initialize(self, scenario: str, mode: str, pop_size: int, max_gen: int, ticks_per_gen: int, decision_mode: str, ollama_model: str):
        with self.lock:
            self.stop_running_loop()
            # Gracefully shut down the previous Ollama thread pool if one exists
            if self.engine is not None:
                try:
                    self.engine.ollama_client.shutdown()
                except Exception:
                    pass
            self.engine = SimulationEngine(
                scenario_name=scenario,
                mode=mode,
                pop_size=pop_size,
                max_generations=max_gen,
                ticks_per_generation=ticks_per_gen,
                decision_mode=decision_mode,
                ollama_model=ollama_model
            )

    def start_running_loop(self):
        if self.engine is None:
            return
        
        self.stop_running_loop()
        self.stop_event.clear()
        self.engine.running = True
        self.running_thread = threading.Thread(target=self._run, daemon=True)
        self.running_thread.start()

    def stop_running_loop(self):
        self.stop_event.set()
        if self.engine:
            self.engine.running = False
        if self.running_thread:
            self.running_thread.join(timeout=1.0)
            self.running_thread = None

    def _run(self):
        while not self.stop_event.is_set():
            # Use a short lock window only for the tick, not the sleep
            with self.lock:
                if not self.engine or not self.engine.running:
                    break
                self.engine.tick()
                if not self.engine.running:
                    break
            time.sleep(self.tick_delay)

    def set_speed(self, fps: int):
        if fps <= 0:
            self.tick_delay = 1.0
        else:
            self.tick_delay = 1.0 / fps

    def tick_once(self, ticks: int = 1):
        with self.lock:
            if self.engine:
                for _ in range(ticks):
                    self.engine.tick()

    def get_state(self) -> Dict[str, Any]:
        with self.lock:
            if self.engine:
                return self.engine.get_summary_state()
            return {"status": "Not Initialized"}

    def get_history(self) -> List[Dict[str, Any]]:
        with self.lock:
            if self.engine:
                return list(self.engine.history)
            return []

manager = SimulationManager()

@router.get("/simulation/start")
def start_sim(
    scenario: str = "default",
    mode: str = "GA",
    pop_size: int = 100,
    max_generations: int = 100,
    ticks_per_generation: int = 500,
    decision_mode: str = "RULE",
    ollama_model: str = "qwen3:4b",
    auto_play: bool = True
):
    """
    Starts or resets the simulation engine with custom configurations.
    """
    manager.initialize(
        scenario=scenario,
        mode=mode,
        pop_size=pop_size,
        max_gen=max_generations,
        ticks_per_gen=ticks_per_generation,
        decision_mode=decision_mode,
        ollama_model=ollama_model
    )
    if auto_play:
        manager.start_running_loop()
    return {"status": "Initialized", "running": auto_play}

@router.get("/simulation/state")
def get_state():
    """
    Returns current tick-by-tick coordinate and health state.
    """
    return manager.get_state()

@router.get("/simulation/stats")
def get_stats():
    """
    Returns the array of historical averages and convergence metrics for each generation.
    """
    return manager.get_history()

@router.get("/simulation/generation")
def control_sim(
    action: str = Query(..., description="Action: play, pause, tick, set_fps"),
    ticks: int = 1,
    fps: int = 20
):
    """
    Play, pause, single-tick, or adjust running speed of the simulation loop.
    """
    if not manager.engine:
        raise HTTPException(status_code=400, detail="Simulation not started")

    if action == "play":
        manager.start_running_loop()
    elif action == "pause":
        manager.stop_running_loop()
    elif action == "tick":
        manager.tick_once(ticks)
    elif action == "set_fps":
        manager.set_speed(fps)
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    state = manager.get_state()
    return {"status": "Updated", "running": manager.engine.running, "tick": state.get("tick"), "generation": state.get("generation")}

@router.get("/simulation/export")
def export_results():
    """
    Compiles history into CSV, plots analytical charts, and returns a download ZIP package.
    """
    history = manager.get_history()
    if not history:
        raise HTTPException(status_code=400, detail="No simulation history available to export")

    # Generate CSV in memory
    df = pd.DataFrame(history)
    csv_buf = io.StringIO()
    df.to_csv(csv_buf, index=False)
    csv_data = csv_buf.getvalue()

    # Generate Matplotlib plots
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        zip_file.writestr("simulation_history.csv", csv_data)

        # Include llm_logs.csv if it exists
        llm_logs_path = "backend/data/results/llm_logs.csv"
        if os.path.exists(llm_logs_path):
            try:
                with open(llm_logs_path, "r", encoding="utf-8") as f:
                    zip_file.writestr("llm_logs.csv", f.read())
            except Exception:
                pass

        # Plot 1: Average Fitness
        plt.figure(figsize=(10, 6))
        plt.plot(df["generation"], df["average_fitness"], color="#8b5cf6", linewidth=2.5, marker="o", label="Fitness")
        plt.title("Average Fitness Evolution", fontsize=14, fontweight="bold", pad=15)
        plt.xlabel("Generation")
        plt.ylabel("Fitness Score")
        plt.grid(True, linestyle="--", alpha=0.5)
        plt.tight_layout()
        fit_buf = io.BytesIO()
        plt.savefig(fit_buf, format="png", dpi=150)
        plt.close()
        zip_file.writestr("charts/average_fitness.png", fit_buf.getvalue())

        # Plot 2: Personality Traits
        plt.figure(figsize=(12, 7))
        traits = ["average_aggression", "average_cooperation", "average_curiosity", "average_risk", "average_intelligence", "average_trust"]
        labels = ["Aggression", "Cooperation", "Curiosity", "Risk Taking", "Intelligence", "Trustworthiness"]
        colors = ["#ef4444", "#22c55e", "#06b6d4", "#f59e0b", "#3b82f6", "#ec4899"]
        for trait, label, col in zip(traits, labels, colors):
            if trait in df.columns:
                plt.plot(df["generation"], df[trait], color=col, linewidth=2, label=label)
        plt.title("Personality Traits Evolution", fontsize=14, fontweight="bold", pad=15)
        plt.xlabel("Generation")
        plt.ylabel("Gene Value (0 - 100)")
        plt.legend(loc="upper right")
        plt.grid(True, linestyle="--", alpha=0.5)
        plt.tight_layout()
        traits_buf = io.BytesIO()
        plt.savefig(traits_buf, format="png", dpi=150)
        plt.close()
        zip_file.writestr("charts/personality_traits.png", traits_buf.getvalue())

        # Plot 3: Population Diversity
        plt.figure(figsize=(10, 6))
        plt.plot(df["generation"], df["population_diversity"], color="#10b981", linewidth=2.5, marker="d", label="Diversity")
        plt.title("Population Genetic Diversity", fontsize=14, fontweight="bold", pad=15)
        plt.xlabel("Generation")
        plt.ylabel("Diversity Index (Std Dev)")
        plt.grid(True, linestyle="--", alpha=0.5)
        plt.tight_layout()
        div_buf = io.BytesIO()
        plt.savefig(div_buf, format="png", dpi=150)
        plt.close()
        zip_file.writestr("charts/population_diversity.png", div_buf.getvalue())

    zip_buffer.seek(0)
    
    headers = {
        "Content-Disposition": f'attachment; filename="sim_results_{manager.engine.scenario_name}_{manager.engine.mode}_{manager.engine.decision_mode}.zip"'
    }
    return StreamingResponse(zip_buffer, media_type="application/zip", headers=headers)

@router.websocket("/ws/simulation")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket channel to broadcast active simulation frames directly to the client canvas at max refresh rates.
    """
    await websocket.accept()
    last_tick = -1
    last_gen = -1
    try:
        while True:
            # Check if simulation is loaded
            if manager.engine:
                state = manager.get_state()
                current_tick = state.get("tick", 0)
                current_gen = state.get("generation", 0)
                
                # Send data only if simulation has advanced
                if current_tick != last_tick or current_gen != last_gen:
                    await websocket.send_json(state)
                    last_tick = current_tick
                    last_gen = current_gen
            await asyncio.sleep(0.03)  # Loop check at ~30 FPS
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
