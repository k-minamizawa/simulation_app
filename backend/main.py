from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from database import get_db
import models
import schemas
import json
import subprocess
import sys

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                print(f"Error broadcasting to a client: {e}")

manager = ConnectionManager()

app = FastAPI(title="Simulation Demo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Simulation Demo API is running"}

@app.get("/api/results", response_model=List[schemas.ScenarioSummary])
def get_results(db: Session = Depends(get_db)):
    results = (
        db.query(
            models.Scenario.scenario_id,
            models.Scenario.scenario_name,
            func.avg(models.SimulationResult.total_labor_costs).label("average_total_costs"),
            func.avg(models.SimulationResult.ontime_delivery_rate).label("average_delivery_rate"),
        )
        .join(models.SimulationResult, models.Scenario.scenario_id == models.SimulationResult.scenario_id)
        .group_by(models.Scenario.scenario_id, models.Scenario.scenario_name)
        .all()
    )

    return [
        schemas.ScenarioSummary(
            scenario_id=row.scenario_id,
            scenario_name=row.scenario_name,
            average_total_costs=row.average_total_costs,
            average_delivery_rate=row.average_delivery_rate,
        )
        for row in results
    ]

@app.get("/api/scenarios", response_model=List[schemas.Scenario])
def get_scenarios(db: Session = Depends(get_db)):
    scenarios = db.query(models.Scenario).all()
    return scenarios

@app.websocket("/ws/results")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

def run_simulation_process():
    subprocess.Popen(
        [sys.executable, "virtual_client.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

@app.post("/api/simulations")
async def start_simulation(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_simulation_process)
    return {"message": "Simulation started."}

@app.post("/api/notify-completion")
async def notify_completion(db: Session = Depends(get_db)):
    results = (
        db.query(
            models.Scenario.scenario_id,
            models.Scenario.scenario_name,
            func.avg(models.SimulationResult.total_labor_costs).label("average_total_costs"),
            func.avg(models.SimulationResult.ontime_delivery_rate).label("average_delivery_rate"),
        )
        .join(models.SimulationResult, models.Scenario.scenario_id == models.SimulationResult.scenario_id)
        .group_by(models.Scenario.scenario_id, models.Scenario.scenario_name)
        .all()
    )

    result_data = [
        {
            "scenario_id": row.scenario_id,
            "scenario_name": row.scenario_name,
            "average_total_costs": float(row.average_total_costs),
            "average_delivery_rate": float(row.average_delivery_rate),
        }
        for row in results
    ]

    await manager.broadcast(json.dumps(result_data))

    return {"message": "Notification sent."}

@app.get("/api/scenarios/{scenario_id}", response_model=schemas.ScenarioDetailResponse)
def get_scenario_detail(scenario_id: int, db: Session = Depends(get_db)):
    scenario = db.query(models.Scenario).filter(models.Scenario.scenario_id == scenario_id).first()
    if not scenario:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Scenario not found")

    replications = (
        db.query(models.SimulationResult)
        .filter(models.SimulationResult.scenario_id == scenario_id)
        .all()
    )

    replication_list = [
        schemas.ReplicationInfo(
            replication=rep.replication,
            total_labor_costs=rep.total_labor_costs,
            ontime_delivery_rate=rep.ontime_delivery_rate
        )
        for rep in replications
    ]

    return schemas.ScenarioDetailResponse(
        scenario_id=scenario.scenario_id,
        scenario_name=scenario.scenario_name,
        replications=replication_list
    )

@app.get("/api/scenarios/{scenario_id}/replications/{replication}/task-logs", response_model=List[schemas.TaskLogWithDetails])
def get_task_logs(scenario_id: int, replication: int, db: Session = Depends(get_db)):
    task_logs = (
        db.query(
            models.TaskLog.task_log_id,
            models.TaskLog.scenario_id,
            models.TaskLog.replication,
            models.TaskLog.time_stamp,
            models.Task.name.label("task_name"),
            models.Tact.name.label("tact_name"),
            models.Work.name.label("work_name"),
            models.Operator.name.label("operator_name"),
            models.TaskLog.state
        )
        .join(models.Task, models.TaskLog.task_id == models.Task.task_id)
        .outerjoin(models.Tact, models.TaskLog.tact_id == models.Tact.tact_id)
        .join(models.Work, models.TaskLog.work_id == models.Work.work_id)
        .join(models.Operator, models.TaskLog.operator_id == models.Operator.operator_id)
        .filter(models.TaskLog.scenario_id == scenario_id)
        .filter(models.TaskLog.replication == replication)
        .order_by(models.TaskLog.time_stamp)
        .all()
    )

    return [
        schemas.TaskLogWithDetails(
            task_log_id=log.task_log_id,
            scenario_id=log.scenario_id,
            replication=log.replication,
            time_stamp=log.time_stamp,
            task_name=log.task_name,
            tact_name=log.tact_name,
            work_name=log.work_name,
            operator_name=log.operator_name,
            state=log.state
        )
        for log in task_logs
    ]