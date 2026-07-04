import pytest
import numpy as np
from backend.simulation.agent import Agent
from backend.simulation.world import World
from backend.simulation.fitness import FitnessEvaluator
from backend.simulation.genetic_algorithm import GeneticAlgorithm
from backend.simulation.simulation_engine import SimulationEngine

def test_agent_initialization():
    genes = {
        "aggression": 80.0,
        "cooperation": 20.0,
        "curiosity": 110.0,  # Should clamp to 100
        "risk_taking": -10.0, # Should clamp to 0
        "intelligence": 50.0,
        "trustworthiness": 10.0
    }
    agent = Agent(agent_id=1, position=(5, 5), genes=genes)
    
    assert agent.id == 1
    assert agent.position == (5, 5)
    assert agent.genes["curiosity"] == 100.0
    assert agent.genes["risk_taking"] == 0.0
    assert agent.chromosome == [80.0, 20.0, 100.0, 0.0, 50.0, 10.0]
    assert agent.alive is True

def test_world_grid_boundaries():
    world = World(width=10, height=10)
    world.initialize_grid(num_resources=5, num_obstacles=2, num_safe_zones=1, safe_zone_size=1)
    
    # Check boundaries
    assert world.is_passable((-1, 5)) is False
    assert world.is_passable((10, 5)) is False
    assert world.is_passable((5, -1)) is False
    assert world.is_passable((5, 10)) is False
    
    # Check obstacle detection
    if world.obstacles:
        obstacle_pos = list(world.obstacles)[0]
        assert world.is_passable(obstacle_pos) is False

def test_fitness_calculation():
    genes = {"aggression": 50, "cooperation": 50, "curiosity": 50, "risk_taking": 50, "intelligence": 50, "trustworthiness": 50}
    agent = Agent(1, (0, 0), genes)
    agent.survival_time = 100
    agent.resources_collected = 5
    agent.successful_trades = 2
    agent.successful_cooperations = 3
    agent.energy_consumed = 50.0
    
    evaluator = FitnessEvaluator()
    fitness = evaluator.evaluate(agent)
    
    # score = 100 * 1.0 + 5 * 10.0 + 2 * 5.0 + 3 * 15.0 - 50.0 * 0.05
    # score = 100 + 50 + 10 + 45 - 2.5 = 202.5
    assert fitness == 202.5

def test_genetic_algorithm_operations():
    ga = GeneticAlgorithm(mutation_rate=0.0, elitism_count=1) # Disable mutation to test clean crossover
    
    genes_a = {"aggression": 100, "cooperation": 100, "curiosity": 100, "risk_taking": 100, "intelligence": 100, "trustworthiness": 100}
    genes_b = {"aggression": 0, "cooperation": 0, "curiosity": 0, "risk_taking": 0, "intelligence": 0, "trustworthiness": 0}
    
    parent_a = Agent(1, (0, 0), genes_a)
    parent_b = Agent(2, (0, 0), genes_b)
    
    child_genes = ga.crossover(parent_a, parent_b)
    
    # Check that child genes are a combination of 100s and 0s
    assert all(val in [0.0, 100.0] for val in child_genes.values())
    
    # Test mutation clamping
    ga_mut = GeneticAlgorithm(mutation_rate=1.0) # Force mutation
    mutated = ga_mut.mutate({"aggression": 95.0})
    assert 0.0 <= mutated["aggression"] <= 100.0

def test_simulation_engine_runs():
    engine = SimulationEngine(
        scenario_name="default",
        mode="GA",
        pop_size=10,
        width=15,
        height=15,
        max_generations=2,
        ticks_per_generation=10
    )
    
    assert len(engine.agents) == 10
    assert engine.generation == 0
    assert engine.current_tick == 0
    
    # Run 1 step
    state = engine.tick()
    assert engine.current_tick == 1
    assert len(state["agents"]) == 10
    assert state["running"] is False # It shouldn't auto-set running
