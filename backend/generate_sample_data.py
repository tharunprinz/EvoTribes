import os
from backend.simulation.simulation_engine import SimulationEngine

def run_sample_simulations():
    print("Generating sample experiment data for EvoTribes...")
    scenarios = ["resource_abundance", "resource_scarcity", "natural_disasters", "mixed_society"]
    modes = ["GA", "NO_GA"]

    for scenario in scenarios:
        for mode in modes:
            print(f"-> Running Scenario: {scenario} | Mode: {mode} (10 generations)...")
            engine = SimulationEngine(
                scenario_name=scenario,
                mode=mode,
                pop_size=50, # smaller pop for speed
                max_generations=10,
                ticks_per_generation=200
            )
            
            # Simulate through generations
            # When ticks >= ticks_per_generation, tick() calls end_generation() internally
            # Run the tick loop until the engine completes all generations
            engine.running = True
            while engine.running:
                engine.tick()

            print(f"   Done. Saved to backend/data/results/sim_{scenario}_{mode}.csv")

    print("\nSample experiment generation complete. All baseline files populated.")

if __name__ == "__main__":
    run_sample_simulations()
