import random
from typing import Set, Tuple, Dict, Any, List

class World:
    def __init__(self, width: int = 50, height: int = 50):
        self.width: int = width
        self.height: int = height
        
        # Grid elements
        self.obstacles: Set[Tuple[int, int]] = set()
        self.safe_zones: Set[Tuple[int, int]] = set()
        
        # Resources stored as dict: (x, y) -> { "active": bool, "cooldown": int, "max_cooldown": int, "energy": float }
        self.resources: Dict[Tuple[int, int], Dict[str, Any]] = {}
        
    def initialize_grid(
        self, 
        num_resources: int = 200, 
        num_obstacles: int = 50, 
        num_safe_zones: int = 10,
        safe_zone_size: int = 2
    ):
        """
        Populate the world with resources, obstacles, and safe zones randomly without overlaps.
        """
        self.obstacles.clear()
        self.safe_zones.clear()
        self.resources.clear()

        # 1. Spawn Safe Zones
        # Safe zones are spawned as small squares of safe_zone_size x safe_zone_size
        safe_zone_centers = set()
        while len(safe_zone_centers) < num_safe_zones:
            cx = random.randint(2, self.width - 3)
            cy = random.randint(2, self.height - 3)
            safe_zone_centers.add((cx, cy))
            
        for cx, cy in safe_zone_centers:
            for dx in range(-safe_zone_size + 1, safe_zone_size):
                for dy in range(-safe_zone_size + 1, safe_zone_size):
                    tx, ty = cx + dx, cy + dy
                    if 0 <= tx < self.width and 0 <= ty < self.height:
                        self.safe_zones.add((tx, ty))

        # 2. Spawn Obstacles
        # Obstacles cannot overlap with safe zones
        while len(self.obstacles) < num_obstacles:
            ox = random.randint(0, self.width - 1)
            oy = random.randint(0, self.height - 1)
            pos = (ox, oy)
            if pos not in self.safe_zones:
                self.obstacles.add(pos)

        # 3. Spawn Resources
        # Resources cannot overlap with obstacles or safe zones
        max_attempts = num_resources * 5
        attempts = 0
        while len(self.resources) < num_resources and attempts < max_attempts:
            attempts += 1
            rx = random.randint(0, self.width - 1)
            ry = random.randint(0, self.height - 1)
            pos = (rx, ry)
            if pos not in self.obstacles and pos not in self.safe_zones and pos not in self.resources:
                self.resources[pos] = {
                    "active": True,
                    "cooldown": 0,
                    "max_cooldown": random.randint(15, 30),
                    "energy": 25.0
                }

    def regenerate_resources(self):
        """
        Decrement regeneration cooldowns for collected resources.
        """
        for pos, data in self.resources.items():
            if not data["active"]:
                if data["cooldown"] > 0:
                    data["cooldown"] -= 1
                if data["cooldown"] == 0:
                    data["active"] = True

    def is_passable(self, pos: Tuple[int, int]) -> bool:
        """
        Checks if position is within bounds and not an obstacle.
        """
        x, y = pos
        return 0 <= x < self.width and 0 <= y < self.height and pos not in self.obstacles

    def is_safe_zone(self, pos: Tuple[int, int]) -> bool:
        return pos in self.safe_zones

    def has_active_resource(self, pos: Tuple[int, int]) -> bool:
        return pos in self.resources and self.resources[pos]["active"]

    def collect_resource(self, pos: Tuple[int, int]) -> float:
        """
        Deactivate resource at position, set cooldown, and return energy value.
        """
        if self.has_active_resource(pos):
            data = self.resources[pos]
            data["active"] = False
            data["cooldown"] = data["max_cooldown"]
            return data["energy"]
        return 0.0

    def get_valid_neighbors(self, pos: Tuple[int, int]) -> List[Tuple[int, int]]:
        """
        Gets list of adjacent passable cells.
        """
        x, y = pos
        neighbors = []
        # Support 8-directional movement
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0:
                    continue
                nx, ny = x + dx, y + dy
                if self.is_passable((nx, ny)):
                    neighbors.append((nx, ny))
        return neighbors

    def get_random_passable_position(self) -> Tuple[int, int]:
        """
        Returns a random grid coordinate that is not an obstacle.
        """
        while True:
            rx = random.randint(0, self.width - 1)
            ry = random.randint(0, self.height - 1)
            pos = (rx, ry)
            if self.is_passable(pos):
                return pos
