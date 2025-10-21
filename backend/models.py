from sqlalchemy import Column, Integer, String, Text, DECIMAL, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
import enum

class TaskStateEnum(enum.Enum):
    start = "start"
    end = "end"
    pause = "pause"
    resume = "resume"

class Scenario(Base):
    __tablename__ = "scenarios"

    scenario_id = Column(Integer, primary_key=True, autoincrement=True)
    scenario_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    results = relationship("SimulationResult", back_populates="scenario")
    task_logs = relationship("TaskLog", back_populates="scenario")

class SimulationResult(Base):
    __tablename__ = "simulation_results"

    sim_result_id = Column(Integer, primary_key=True, autoincrement=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.scenario_id"), nullable=False)
    replication = Column(Integer, nullable=False)
    total_labor_costs = Column(DECIMAL(10, 2), nullable=False)
    ontime_delivery_rate = Column(DECIMAL(5, 4), nullable=False)

    scenario = relationship("Scenario", back_populates="results")

class Task(Base):
    __tablename__ = "tasks"

    task_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    next_task_id = Column(Integer, ForeignKey("tasks.task_id"), nullable=True)

    task_logs = relationship("TaskLog", back_populates="task")

class Tact(Base):
    __tablename__ = "tacts"

    tact_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    next_tact_id = Column(Integer, ForeignKey("tacts.tact_id"), nullable=True)

    task_logs = relationship("TaskLog", back_populates="tact")

class Work(Base):
    __tablename__ = "works"

    work_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)

    task_logs = relationship("TaskLog", back_populates="work")

class Operator(Base):
    __tablename__ = "operators"

    operator_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)

    task_logs = relationship("TaskLog", back_populates="operator")

class TaskLog(Base):
    __tablename__ = "task_logs"

    task_log_id = Column(Integer, primary_key=True, autoincrement=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.scenario_id"), nullable=False)
    replication = Column(Integer, nullable=False)
    time_stamp = Column(String(50), nullable=False)
    task_id = Column(Integer, ForeignKey("tasks.task_id"), nullable=False)
    tact_id = Column(Integer, ForeignKey("tacts.tact_id"), nullable=True)
    work_id = Column(Integer, ForeignKey("works.work_id"), nullable=False)
    operator_id = Column(Integer, ForeignKey("operators.operator_id"), nullable=False)
    state = Column(Enum(TaskStateEnum), nullable=False)

    scenario = relationship("Scenario", back_populates="task_logs")
    task = relationship("Task", back_populates="task_logs")
    tact = relationship("Tact", back_populates="task_logs")
    work = relationship("Work", back_populates="task_logs")
    operator = relationship("Operator", back_populates="task_logs")