from sqlalchemy import Column, Integer, String, Text, DECIMAL, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Scenario(Base):
    __tablename__ = "scenarios"

    scenario_id = Column(Integer, primary_key=True, autoincrement=True)
    scenario_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    results = relationship("SimulationResult", back_populates="scenario")

class SimulationResult(Base):
    __tablename__ = "simulation_results"

    sim_result_id = Column(Integer, primary_key=True, autoincrement=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.scenario_id"), nullable=False)
    replication = Column(Integer, nullable=False)
    total_labor_costs = Column(DECIMAL(10, 2), nullable=False)
    ontime_delivery_rate = Column(DECIMAL(5, 4), nullable=False)

    scenario = relationship("Scenario", back_populates="results")