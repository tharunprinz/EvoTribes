from typing import Dict, Any, List

class PromptBuilder:
    @staticmethod
    def build_prompt(
        genes: Dict[str, float],
        health: float,
        energy: float,
        resources: int,
        nearby_agent_ids: List[int],
        nearby_resources_count: int,
        threats_count: int
    ) -> str:
        """
        Builds the prompt string sent to the local Ollama LLM.
        """
        # Format genes text
        genes_str = (
            f"Aggression={int(genes.get('aggression', 50))}\n"
            f"Cooperation={int(genes.get('cooperation', 50))}\n"
            f"Curiosity={int(genes.get('curiosity', 50))}\n"
            f"RiskTaking={int(genes.get('risk_taking', 50))}\n"
            f"Intelligence={int(genes.get('intelligence', 50))}\n"
            f"Trustworthiness={int(genes.get('trustworthiness', 50))}"
        )

        # Format agents text
        if nearby_agent_ids:
            agents_str = "\n".join([f"Agent {aid}" for aid in nearby_agent_ids])
        else:
            agents_str = "None"

        # Assemble template
        prompt = f"""You are an autonomous AI agent.

Personality:
{genes_str}

Current State:
Health={int(health)}
Energy={int(energy)}
Resources={resources}

Environment:
Nearby Agents:
{agents_str}

Nearby Resources:
{nearby_resources_count}

Nearby Threats:
{threats_count}

Available Actions:
MOVE
ATTACK
TRADE
COOPERATE
COLLECT
REST

Choose exactly one action.
Return ONLY the action name.
"""
        return prompt
