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