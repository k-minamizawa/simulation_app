from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from enum import Enum

class TaskStateEnum(str, Enum):
    start = "start"
    end = "end"
    pause = "pause"
    resume = "resume"

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

class TaskBase(BaseModel):
    name: str
    next_task_id: Optional[int] = None

class Task(TaskBase):
    task_id: int

    class Config:
        from_attributes = True

class TactBase(BaseModel):
    name: str
    next_tact_id: Optional[int] = None

class Tact(TactBase):
    tact_id: int

    class Config:
        from_attributes = True

class WorkBase(BaseModel):
    name: str

class Work(WorkBase):
    work_id: int

    class Config:
        from_attributes = True

class OperatorBase(BaseModel):
    name: str

class Operator(OperatorBase):
    operator_id: int

    class Config:
        from_attributes = True

class TaskLogBase(BaseModel):
    scenario_id: int
    replication: int
    time_stamp: str
    task_id: int
    tact_id: Optional[int] = None
    work_id: int
    operator_id: int
    state: TaskStateEnum

class TaskLog(TaskLogBase):
    task_log_id: int

    class Config:
        from_attributes = True

class TaskLogWithDetails(BaseModel):
    task_log_id: int
    scenario_id: int
    replication: int
    time_stamp: str
    task_name: str
    tact_name: Optional[str] = None
    work_name: str
    operator_name: str
    state: TaskStateEnum

    class Config:
        from_attributes = True

class ReplicationInfo(BaseModel):
    replication: int
    total_labor_costs: Decimal
    ontime_delivery_rate: Decimal

class ScenarioDetailResponse(BaseModel):
    scenario_id: int
    scenario_name: str
    replications: List[ReplicationInfo]

    class Config:
        from_attributes = True