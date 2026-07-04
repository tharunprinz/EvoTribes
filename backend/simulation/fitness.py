from typing import Dict, Any

class FitnessEvaluator:
    def __init__(self, weights: Dict[str, float] = None):
        # Default weights
        self.weights: Dict[str, float] = {
            "survival_time": 1.0,          # 1 point per tick survived
            "resources_collected": 10.0,    # 10 points per resource collected
            "successful_trades": 5.0,      # 5 points per trade
            "tasks_completed": 15.0,       # 15 points per cooperative task completed
            "energy_consumed": 0.05        # penalty factor for energy spent
        }
        if weights:
            self.weights.update(weights)

    def evaluate(self, agent) -> float:
        """
        Evaluate and return fitness score of an agent.
        Ensures fitness score is at least 0.0 to prevent selection math issues.
        """
        score = (
            agent.survival_time * self.weights.get("survival_time", 1.0) +
            agent.resources_collected * self.weights.get("resources_collected", 10.0) +
            agent.successful_trades * self.weights.get("successful_trades", 5.0) +
            agent.successful_cooperations * self.weights.get("tasks_completed", 15.0) -
            agent.energy_consumed * self.weights.get("energy_consumed", 0.05)
        )
        return max(0.1, float(score))

    def update_weights(self, new_weights: Dict[str, float]):
        self.weights.update(new_weights)
