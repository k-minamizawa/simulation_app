from pydantic import BaseModel
from typing import Optional
from decimal import Decimal

class ScenarioBase(BaseModel):
    scenario_name: str
    description: Optional[str] = None

class ScenarioCreate(ScenarioBase):
    pass

class Scenario(ScenarioBase):
    scenario_id: int

    class Config:
        from_attributes = True

class SimulationResultBase(BaseModel):
    scenario_id: int
    replication: int
    total_labor_costs: Decimal
    ontime_delivery_rate: Decimal

class SimulationResultCreate(SimulationResultBase):
    pass

class SimulationResult(SimulationResultBase):
    sim_result_id: int

    class Config:
        from_attributes = True

class ScenarioSummary(BaseModel):
    scenario_id: int
    scenario_name: str
    average_total_costs: Decimal
    average_delivery_rate: Decimal