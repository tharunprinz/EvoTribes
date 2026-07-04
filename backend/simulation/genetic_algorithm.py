import random
from typing import List, Tuple, Dict
from backend.simulation.agent import Agent

class GeneticAlgorithm:
    def __init__(self, mutation_rate: float = 0.05, tournament_size: int = 5, elitism_count: int = 5):
        self.mutation_rate: float = mutation_rate
        self.tournament_size: int = tournament_size
        self.elitism_count: int = elitism_count
        self.gene_keys = ["aggression", "cooperation", "curiosity", "risk_taking", "intelligence", "trustworthiness"]

    def select_parent(self, population: List[Agent]) -> Agent:
        """
        Perform Tournament Selection:
        Randomly select 'tournament_size' agents and return the one with highest fitness.
        """
        candidates = random.sample(population, min(len(population), self.tournament_size))
        return max(candidates, key=lambda a: a.fitness)

    def crossover(self, parent_a: Agent, parent_b: Agent) -> Dict[str, float]:
        """
        Perform Single Point Crossover on the chromosomes of two parents.
        Returns a genes dict for a new child.
        """
        chrom_a = parent_a.chromosome
        chrom_b = parent_b.chromosome
        
        # Select split index (1 to 5 for 6 genes)
        split = random.randint(1, len(self.gene_keys) - 1)
        
        child_chrom = chrom_a[:split] + chrom_b[split:]
        
        child_genes = {}
        for idx, key in enumerate(self.gene_keys):
            child_genes[key] = child_chrom[idx]
            
        return child_genes

    def mutate(self, genes: Dict[str, float]) -> Dict[str, float]:
        """
        Mutate each gene with a mutation_rate probability.
        If mutated, add a random perturbation (e.g. -10 to +10) and clamp to [0, 100].
        """
        mutated_genes = {}
        for key, val in genes.items():
            if random.random() < self.mutation_rate:
                perturbation = random.uniform(-15, 15)
                new_val = max(0.0, min(100.0, val + perturbation))
                mutated_genes[key] = new_val
            else:
                mutated_genes[key] = val
        return mutated_genes

    def generate_next_generation(
        self, 
        old_population: List[Agent], 
        next_agent_id_start: int, 
        world_width: int, 
        world_height: int
    ) -> List[Agent]:
        """
        Constructs the next generation using Elitism, Selection, Crossover, and Mutation.
        Important: Reset positions, health, energy, and stats for the new population.
        """
        next_population: List[Agent] = []
        pop_size = len(old_population)

        # 1. Elitism: Sort by fitness and transfer the top performing agents
        sorted_pop = sorted(old_population, key=lambda a: a.fitness, reverse=True)
        elites = sorted_pop[:self.elitism_count]
        
        current_id = next_agent_id_start
        for elite in elites:
            # Place at a random location with restored vitals
            rx = random.randint(0, world_width - 1)
            ry = random.randint(0, world_height - 1)
            
            # Keep elite genes, reset agent runtime stats
            new_agent = Agent(current_id, (rx, ry), elite.genes)
            next_population.append(new_agent)
            current_id += 1

        # 2. Crossover & Mutation for the rest of the population
        while len(next_population) < pop_size:
            parent_a = self.select_parent(old_population)
            parent_b = self.select_parent(old_population)
            
            child_genes = self.crossover(parent_a, parent_b)
            mutated_genes = self.mutate(child_genes)
            
            rx = random.randint(0, world_width - 1)
            ry = random.randint(0, world_height - 1)
            
            new_agent = Agent(current_id, (rx, ry), mutated_genes)
            next_population.append(new_agent)
            current_id += 1

        return next_population
