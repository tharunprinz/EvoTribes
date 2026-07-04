import os
import random
import csv
import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Any
from backend.simulation.agent import Agent
from backend.simulation.world import World
from backend.simulation.fitness import FitnessEvaluator
from backend.simulation.genetic_algorithm import GeneticAlgorithm
from backend.simulation.environment import get_scenario_config, ScenarioConfig

# Import LLM engine components
from backend.simulation.llm.ollama_client import OllamaClient
from backend.simulation.llm.decision_engine import DecisionEngine

class SimulationEngine:
    def __init__(
        self,
        scenario_name: str = "default",
        mode: str = "GA", # "GA" (Mode B) or "NO_GA" (Mode A)
        pop_size: int = 100,
        width: int = 50,
        height: int = 50,
        max_generations: int = 100,
        ticks_per_generation: int = 500,
        decision_mode: str = "RULE",
        ollama_model: str = "qwen3:4b"
    ):
        self.scenario_name: str = scenario_name
        self.config: ScenarioConfig = get_scenario_config(scenario_name)
        self.mode: str = mode
        self.pop_size: int = pop_size
        self.width: int = width
        self.height: int = height
        self.max_generations: int = max_generations
        self.ticks_per_generation: int = ticks_per_generation
        
        self.decision_mode: str = decision_mode
        self.ollama_model: str = ollama_model

        # Engine states
        self.world: World = World(self.width, self.height)
        self.agents: List[Agent] = []
        self.generation: int = 0
        self.current_tick: int = 0
        self.running: bool = False
        self.history: List[Dict[str, Any]] = []
        self.next_agent_id: int = 0
        
        # Save baseline genes for Mode A (No GA) to reuse them each generation
        self.baseline_genes: List[Dict[str, float]] = []

        # Action Distribution Counters for current generation
        self.action_counts: Dict[str, int] = {
            "MOVE": 0, "ATTACK": 0, "TRADE": 0, "COOPERATE": 0, "COLLECT": 0, "REST": 0
        }

        # GA and Fitness modules
        self.fitness_evaluator: FitnessEvaluator = FitnessEvaluator()
        self.ga: GeneticAlgorithm = GeneticAlgorithm(
            mutation_rate=0.05, 
            tournament_size=5, 
            elitism_count=max(1, int(pop_size * 0.05))
        )

        # Ollama local client & decision engine setup
        self.ollama_client: OllamaClient = OllamaClient(model=self.ollama_model)
        self.decision_engine: DecisionEngine = DecisionEngine(self.ollama_client)

        self.initialize_simulation()

    def initialize_simulation(self):
        """
        Set up the world grid resources/obstacles/safe zones, and spawn initial agents.
        """
        self.generation = 0
        self.current_tick = 0
        self.history.clear()
        self.next_agent_id = 0
        self.agents.clear()
        self.baseline_genes.clear()
        
        # Reset counters
        self.action_counts = {
            "MOVE": 0, "ATTACK": 0, "TRADE": 0, "COOPERATE": 0, "COLLECT": 0, "REST": 0
        }
        self.ollama_client.reset_stats()

        # Initialize the physical world grid
        self.world.initialize_grid(
            num_resources=self.config.num_resources,
            num_obstacles=self.config.num_obstacles,
            num_safe_zones=self.config.num_safe_zones
        )

        # Spawn initial population
        if self.config.has_tribes:
            tribe_size = self.pop_size // 3
            # Aggressive Tribe
            for _ in range(tribe_size):
                pos = self.world.get_random_passable_position()
                genes = {
                    "aggression": random.uniform(80, 100),
                    "cooperation": random.uniform(0, 20),
                    "curiosity": random.uniform(40, 70),
                    "risk_taking": random.uniform(60, 90),
                    "intelligence": random.uniform(40, 60),
                    "trustworthiness": random.uniform(0, 20)
                }
                self.agents.append(Agent(self.next_agent_id, pos, genes))
                self.baseline_genes.append(genes)
                self.next_agent_id += 1

            # Cooperative Tribe
            for _ in range(tribe_size):
                pos = self.world.get_random_passable_position()
                genes = {
                    "aggression": random.uniform(0, 20),
                    "cooperation": random.uniform(80, 100),
                    "curiosity": random.uniform(40, 70),
                    "risk_taking": random.uniform(20, 50),
                    "intelligence": random.uniform(45, 65),
                    "trustworthiness": random.uniform(80, 100)
                }
                self.agents.append(Agent(self.next_agent_id, pos, genes))
                self.baseline_genes.append(genes)
                self.next_agent_id += 1

            # Balanced Tribe
            while len(self.agents) < self.pop_size:
                pos = self.world.get_random_passable_position()
                genes = {
                    "aggression": random.uniform(40, 60),
                    "cooperation": random.uniform(40, 60),
                    "curiosity": random.uniform(40, 60),
                    "risk_taking": random.uniform(40, 60),
                    "intelligence": random.uniform(40, 60),
                    "trustworthiness": random.uniform(40, 60)
                }
                self.agents.append(Agent(self.next_agent_id, pos, genes))
                self.baseline_genes.append(genes)
                self.next_agent_id += 1
        else:
            # Spawn random agents
            for _ in range(self.pop_size):
                pos = self.world.get_random_passable_position()
                genes = {
                    "aggression": random.uniform(0, 100),
                    "cooperation": random.uniform(0, 100),
                    "curiosity": random.uniform(0, 100),
                    "risk_taking": random.uniform(0, 100),
                    "intelligence": random.uniform(0, 100),
                    "trustworthiness": random.uniform(0, 100)
                }
                self.agents.append(Agent(self.next_agent_id, pos, genes))
                self.baseline_genes.append(genes)
                self.next_agent_id += 1

    def tick(self) -> Dict[str, Any]:
        """
        Advance the simulation state by 1 tick.
        """
        if self.generation >= self.max_generations:
            self.running = False
            return self.get_summary_state()

        self.current_tick += 1
        
        # 1. Regenerate resources
        self.world.regenerate_resources()

        # 2. Trigger Natural Disasters (if scenario enables it)
        if self.config.disaster_interval > 0 and self.current_tick % self.config.disaster_interval == 0:
            self.trigger_natural_disaster()

        # 3. Agent movements and actions
        alive_agents = [a for a in self.agents if a.alive]
        random.shuffle(alive_agents)

        for agent in alive_agents:
            if not agent.alive:
                continue

            # Senses
            nearby_agents = self.get_nearby_agents(agent, radius=2)
            nearby_resources = self.get_nearby_resources(agent, radius=5)
            on_resource = self.world.has_active_resource(agent.position)
            in_safe_zone = self.world.is_safe_zone(agent.position)

            # Decision Engine selects action
            action = agent.select_action(
                self.current_tick,
                nearby_agents,
                nearby_resources,
                on_resource,
                in_safe_zone,
                self.decision_engine,
                self.decision_mode
            )

            # Update Action Counts
            if action in self.action_counts:
                self.action_counts[action] += 1

            # Log LLM calls (Generation, Agent ID, Prompt, Response, Action)
            if agent.last_llm_prompt and agent.last_decision_tick == self.current_tick:
                self.log_llm_call(self.generation, agent.id, agent.last_llm_prompt, agent.last_llm_response, action)

            # Resolve Action
            self.resolve_agent_action(agent, action, nearby_agents, nearby_resources)

            # Apply survival adjustments
            if agent.alive:
                agent.survival_time += 1
                agent.consume_energy(0.2)

        # Check generation end conditions
        alive_count = len([a for a in self.agents if a.alive])
        if alive_count == 0 or self.current_tick >= self.ticks_per_generation:
            self.end_generation()

        return self.get_summary_state()

    def resolve_agent_action(self, agent: Agent, action: str, nearby_agents: List[Agent], nearby_resources: List[Tuple[int, int]]):
        """
        Applies costs, damage, and rewards depending on selected action.
        """
        if action == "REST":
            agent.consume_energy(0.2)
            agent.health = min(100.0, agent.health + 10.0)
            
        elif action == "MOVE":
            agent.consume_energy(1.5)
            neighbors = self.world.get_valid_neighbors(agent.position)
            if neighbors:
                if nearby_resources and random.uniform(0, 100) < agent.genes["intelligence"]:
                    closest = min(nearby_resources, key=lambda r: np.linalg.norm(np.array(agent.position) - np.array(r)))
                    best_nbr = min(neighbors, key=lambda n: np.linalg.norm(np.array(n) - np.array(closest)))
                    agent.position = best_nbr
                else:
                    agent.position = random.choice(neighbors)

        elif action == "COLLECT":
            agent.consume_energy(1.0)
            if self.world.has_active_resource(agent.position):
                energy_gain = self.world.collect_resource(agent.position)
                agent.energy = min(100.0, agent.energy + energy_gain)
                agent.resources_collected += 1

        elif action == "ATTACK":
            agent.consume_energy(4.0)
            if nearby_agents:
                target = random.choice(nearby_agents)
                if not self.world.is_safe_zone(target.position) and target.alive:
                    attacker_power = agent.genes["aggression"] * 0.7 + agent.health * 0.3 + random.uniform(-15, 15)
                    target_power = target.genes["aggression"] * 0.3 + target.health * 0.7 + random.uniform(-15, 15)
                    
                    if attacker_power > target_power:
                        damage = random.uniform(20, 35)
                        target.take_damage(damage)
                        steal_res = min(target.resources_collected, int(random.uniform(1, 3)))
                        target.resources_collected = max(0, target.resources_collected - steal_res)
                        agent.resources_collected += steal_res
                        agent.energy = min(100.0, agent.energy + 20.0)
                    else:
                        agent.take_damage(random.uniform(10, 20))

        elif action == "COOPERATE":
            agent.consume_energy(2.0)
            if nearby_agents:
                target = random.choice(nearby_agents)
                if random.uniform(0, 100) < target.genes["cooperation"]:
                    agent.successful_cooperations += 1
                    target.successful_cooperations += 1
                    agent.energy = min(100.0, agent.energy + 15.0)
                    target.energy = min(100.0, target.energy + 15.0)

        elif action == "TRADE":
            agent.consume_energy(1.5)
            if nearby_agents:
                target = random.choice(nearby_agents)
                success_chance = (agent.genes["trustworthiness"] + target.genes["trustworthiness"]) / 2.0
                if random.uniform(0, 100) < success_chance:
                    agent.successful_trades += 1
                    target.successful_trades += 1
                    agent.energy = min(100.0, agent.energy + 10.0)
                    target.energy = min(100.0, target.energy + 10.0)
                    
                    if agent.resources_collected > target.resources_collected + 2:
                        agent.resources_collected -= 1
                        target.resources_collected += 1
                    elif target.resources_collected > agent.resources_collected + 2:
                        target.resources_collected -= 1
                        agent.resources_collected += 1

    def trigger_natural_disaster(self):
        alive_agents = [a for a in self.agents if a.alive]
        num_to_kill = int(len(alive_agents) * self.config.disaster_ratio)
        if num_to_kill > 0:
            to_kill = random.sample(alive_agents, num_to_kill)
            for agent in to_kill:
                agent.alive = False
                agent.current_action = "DEAD"

    def get_nearby_agents(self, agent: Agent, radius: int = 2) -> List[Agent]:
        nearby = []
        ax, ay = agent.position
        for other in self.agents:
            if other.id != agent.id and other.alive:
                ox, oy = other.position
                if max(abs(ax - ox), abs(ay - oy)) <= radius:
                    nearby.append(other)
        return nearby

    def get_nearby_resources(self, agent: Agent, radius: int = 5) -> List[Tuple[int, int]]:
        nearby = []
        ax, ay = agent.position
        for rx, ry in self.world.resources.keys():
            if self.world.resources[(rx, ry)]["active"]:
                if max(abs(ax - rx), abs(ay - ry)) <= radius:
                    nearby.append((rx, ry))
        return nearby

    def end_generation(self):
        """
        Grades, logs, and breeds the next population.
        """
        for agent in self.agents:
            agent.update_fitness(self.fitness_evaluator.evaluate)

        stats = self.compile_generation_stats()
        self.history.append(stats)

        self.export_current_stats_to_csv()

        if self.generation < self.max_generations - 1:
            self.generation += 1
            self.current_tick = 0
            
            # Reset action counts
            self.action_counts = {
                "MOVE": 0, "ATTACK": 0, "TRADE": 0, "COOPERATE": 0, "COLLECT": 0, "REST": 0
            }

            self.world.initialize_grid(
                num_resources=self.config.num_resources,
                num_obstacles=self.config.num_obstacles,
                num_safe_zones=self.config.num_safe_zones
            )

            if self.mode == "GA":
                self.agents = self.ga.generate_next_generation(
                    old_population=self.agents,
                    next_agent_id_start=self.next_agent_id,
                    world_width=self.width,
                    world_height=self.height
                )
                self.next_agent_id = self.agents[-1].id + 1
            else:
                next_pop = []
                for i in range(self.pop_size):
                    pos = self.world.get_random_passable_position()
                    genes = self.baseline_genes[i]
                    next_pop.append(Agent(self.next_agent_id, pos, genes))
                    self.next_agent_id += 1
                self.agents = next_pop
        else:
            self.running = False

    def compile_generation_stats(self) -> Dict[str, Any]:
        total_agents = len(self.agents)
        alive_at_end = len([a for a in self.agents if a.alive])
        survival_rate = alive_at_end / total_agents if total_agents > 0 else 0.0
        
        fitnesses = [a.fitness for a in self.agents]
        avg_fitness = np.mean(fitnesses) if fitnesses else 0.0

        # Trait averages
        agg = [a.genes["aggression"] for a in self.agents]
        coop = [a.genes["cooperation"] for a in self.agents]
        cur = [a.genes["curiosity"] for a in self.agents]
        risk = [a.genes["risk_taking"] for a in self.agents]
        intel = [a.genes["intelligence"] for a in self.agents]
        trust = [a.genes["trustworthiness"] for a in self.agents]

        avg_agg = np.mean(agg) if agg else 0.0
        avg_coop = np.mean(coop) if coop else 0.0
        avg_cur = np.mean(cur) if cur else 0.0
        avg_risk = np.mean(risk) if risk else 0.0
        avg_intel = np.mean(intel) if intel else 0.0
        avg_trust = np.mean(trust) if trust else 0.0

        diversity = np.mean([
            np.std(agg), np.std(coop), np.std(cur), np.std(risk), np.std(intel), np.std(trust)
        ]) if total_agents > 0 else 0.0

        # Performance sums
        total_res = sum(a.resources_collected for a in self.agents)
        total_trades = sum(a.successful_trades for a in self.agents)
        total_coops = sum(a.successful_cooperations for a in self.agents)

        # Compile Action Distributions
        total_acts = sum(self.action_counts.values()) or 1
        pct_move = (self.action_counts["MOVE"] / total_acts) * 100.0
        pct_attack = (self.action_counts["ATTACK"] / total_acts) * 100.0
        pct_trade = (self.action_counts["TRADE"] / total_acts) * 100.0
        pct_cooperate = (self.action_counts["COOPERATE"] / total_acts) * 100.0
        pct_collect = (self.action_counts["COLLECT"] / total_acts) * 100.0
        pct_rest = (self.action_counts["REST"] / total_acts) * 100.0

        return {
            "generation": self.generation,
            "average_fitness": float(avg_fitness),
            "survival_rate": float(survival_rate),
            "average_aggression": float(avg_agg),
            "average_cooperation": float(avg_coop),
            "average_curiosity": float(avg_cur),
            "average_risk": float(avg_risk),
            "average_intelligence": float(avg_intel),
            "average_trust": float(avg_trust),
            "population_diversity": float(diversity),
            "resources_collected": int(total_res),
            "successful_trades": int(total_trades),
            "tasks_completed": int(total_coops),
            
            # Action analytics
            "attack_pct": float(round(pct_attack, 1)),
            "trade_pct": float(round(pct_trade, 1)),
            "cooperation_pct": float(round(pct_cooperate, 1)),
            "move_pct": float(round(pct_move, 1)),
            "rest_pct": float(round(pct_rest, 1)),
            "collect_pct": float(round(pct_collect, 1))
        }

    def log_llm_call(self, gen: int, agent_id: int, prompt: str, response: str, action: str):
        """
        Logs details of local Ollama transactions to results/llm_logs.csv.
        """
        os.makedirs("backend/data/results", exist_ok=True)
        filename = "backend/data/results/llm_logs.csv"
        file_exists = os.path.isfile(filename)
        
        with open(filename, mode="a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(["Generation", "Agent ID", "Prompt", "LLM Response", "Final Action"])
            
            # Escape newline symbols to prevent broken layout in single rows
            escaped_prompt = prompt.replace("\n", " [NEWLINE] ")
            escaped_response = response.replace("\n", " [NEWLINE] ")
            writer.writerow([gen, agent_id, escaped_prompt, escaped_response, action])

    def export_current_stats_to_csv(self):
        os.makedirs("backend/data/results", exist_ok=True)
        filename = f"backend/data/results/sim_{self.scenario_name}_{self.mode}_{self.decision_mode}.csv"
        df = pd.DataFrame(self.history)
        df.to_csv(filename, index=False)

    def get_summary_state(self) -> Dict[str, Any]:
        """
        Payload sent to frontend. Includes LLM Monitor metrics and inspector text logs.
        """
        agent_list = []
        for a in self.agents:
            agent_list.append({
                "id": a.id,
                "x": a.position[0],
                "y": a.position[1],
                "energy": a.energy,
                "health": a.health,
                "resources_collected": a.resources_collected,
                "survival_time": a.survival_time,
                "fitness": a.fitness,
                "genes": a.genes,
                "alive": a.alive,
                "current_action": a.current_action,
                
                # Inspector properties
                "last_llm_prompt": a.last_llm_prompt,
                "last_llm_response": a.last_llm_response
            })

        resource_list = []
        for (rx, ry), val in self.world.resources.items():
            if val["active"]:
                resource_list.append({"x": rx, "y": ry})

        return {
            "generation": self.generation,
            "tick": self.current_tick,
            "running": self.running,
            "scenario": self.scenario_name,
            "mode": self.mode,
            "decision_mode": self.decision_mode,
            "ollama_model": self.ollama_model,
            "alive_count": len([a for a in self.agents if a.alive]),
            "agents": agent_list,
            "resources": resource_list,
            "obstacles": [{"x": ox, "y": oy} for ox, oy in self.world.obstacles],
            "safe_zones": [{"x": sx, "y": sy} for sx, sy in self.world.safe_zones],
            
            # LLM monitor telemetry
            "monitor": self.ollama_client.get_monitor_stats()
        }
