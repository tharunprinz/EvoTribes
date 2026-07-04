import random
import numpy as np
from typing import Dict, List, Tuple, Any

class Agent:
    def __init__(self, agent_id: int, position: Tuple[int, int], genes: Dict[str, float]):
        self.id: int = agent_id
        self.position: Tuple[int, int] = position
        self.energy: float = 100.0
        self.health: float = 100.0
        
        # Performance/Research stats
        self.resources_collected: int = 0
        self.survival_time: int = 0
        self.successful_trades: int = 0
        self.successful_cooperations: int = 0
        self.tasks_completed: int = 0
        self.energy_consumed: float = 0.0
        self.fitness: float = 0.0
        self.alive: bool = True
        self.current_action: str = "REST"
        
        # Cache / LLM Monitor properties
        self.last_action: str = "REST"
        self.last_decision_tick: int = -999
        self.last_llm_prompt: str = ""
        self.last_llm_response: str = ""
        
        # Genes (Aggression, Cooperation, Curiosity, RiskTaking, Intelligence, Trustworthiness)
        self.genes: Dict[str, float] = {k: max(0.0, min(100.0, float(v))) for k, v in genes.items()}
        
    @property
    def chromosome(self) -> List[float]:
        return [
            self.genes.get("aggression", 50.0),
            self.genes.get("cooperation", 50.0),
            self.genes.get("curiosity", 50.0),
            self.genes.get("risk_taking", 50.0),
            self.genes.get("intelligence", 50.0),
            self.genes.get("trustworthiness", 50.0)
        ]

    def select_action(
        self,
        current_tick: int,
        nearby_agents: List['Agent'],
        nearby_resources: List[Tuple[int, int]],
        on_resource: bool,
        in_safe_zone: bool,
        decision_engine,
        mode: str = None
    ) -> str:
        """
        Delegates the choice of action to the decision engine.
        Updates internal action states.
        """
        if not self.alive:
            self.current_action = "DEAD"
            return "DEAD"

        action, prompt, response = decision_engine.decide(
            self,
            current_tick,
            nearby_agents,
            nearby_resources,
            on_resource,
            in_safe_zone,
            mode
        )
        
        self.current_action = action
        return action

    def consume_energy(self, amount: float):
        self.energy = max(0.0, self.energy - amount)
        self.energy_consumed += amount
        if self.energy <= 0:
            self.alive = False
            self.current_action = "DEAD"

    def take_damage(self, amount: float):
        self.health = max(0.0, self.health - amount)
        if self.health <= 0:
            self.alive = False
            self.current_action = "DEAD"

    def update_fitness(self, fitness_fn):
        """
        Delegates fitness calculation to the fitness module.
        """
        self.fitness = fitness_fn(self)
