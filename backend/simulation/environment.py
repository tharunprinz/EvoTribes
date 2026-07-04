from typing import Dict, Any, Optional

class ScenarioConfig:
    def __init__(
        self,
        name: str,
        num_resources: int = 200,
        num_obstacles: int = 50,
        num_safe_zones: int = 10,
        disaster_interval: int = 0,
        disaster_ratio: float = 0.0,
        has_tribes: bool = False
    ):
        self.name: str = name
        self.num_resources: int = num_resources
        self.num_obstacles: int = num_obstacles
        self.num_safe_zones: int = num_safe_zones
        self.disaster_interval: int = disaster_interval
        self.disaster_ratio: float = disaster_ratio
        self.has_tribes: bool = has_tribes

SCENARIOS: Dict[str, ScenarioConfig] = {
    "resource_abundance": ScenarioConfig(
        name="Resource Abundance",
        num_resources=500,
        num_obstacles=50,
        num_safe_zones=10,
        disaster_interval=0,
        disaster_ratio=0.0,
        has_tribes=False
    ),
    "resource_scarcity": ScenarioConfig(
        name="Resource Scarcity",
        num_resources=50,
        num_obstacles=50,
        num_safe_zones=10,
        disaster_interval=0,
        disaster_ratio=0.0,
        has_tribes=False
    ),
    "natural_disasters": ScenarioConfig(
        name="Natural Disasters",
        num_resources=200,
        num_obstacles=50,
        num_safe_zones=10,
        disaster_interval=100,
        disaster_ratio=0.20,
        has_tribes=False
    ),
    "mixed_society": ScenarioConfig(
        name="Mixed Society",
        num_resources=200,
        num_obstacles=50,
        num_safe_zones=10,
        disaster_interval=0,
        disaster_ratio=0.0,
        has_tribes=True
    ),
    "default": ScenarioConfig(
        name="Standard Environment",
        num_resources=200,
        num_obstacles=50,
        num_safe_zones=10,
        disaster_interval=0,
        disaster_ratio=0.0,
        has_tribes=False
    )
}

def get_scenario_config(name: str) -> ScenarioConfig:
    return SCENARIOS.get(name.lower(), SCENARIOS["default"])
