# システム連携実装ガイド

## 1. 概要

本文書は、展示企画の⑪〜⑭（シミュレーション完了リクエスト→結果表示）の実現方式について、具体的なコード例と実装の考え方をまとめたものです。

```
⑪ FlexSim → FastAPI: シミュレーション完了通知
⑫ FastAPI → DB: 結果データ格納
⑬ FastAPI → Next.js: WebSocket完了イベント通知
⑭ Next.js → FastAPI: 結果データ取得・表示
```

## 2. FlexSim → FastAPI 通信実装

### 2.1 考え方

FlexSimからFastAPIへの通信は、FlexSimのHTTPリクエスト機能を使用します。シミュレーション完了時に自動的にHTTP POSTリクエストを送信し、結果データをJSONフォーマットで送信します。

### 2.2 FlexSim側実装（FlexScript）

```c
// FlexSim: HTTP通信モジュール
// simulation_complete_notifier.fs

/**
 * シミュレーション完了時に呼び出される関数
 */
void notifySimulationComplete() {
    // 結果データの収集
    Table resultsTable = Table("SimulationResults");
    Table taskStats = Table("TaskStatistics");
    Table tactStats = Table("TactStatistics");
    
    // JSON文字列の構築
    string jsonData = buildResultJson(resultsTable, taskStats, tactStats);
    
    // HTTP POSTリクエストの送信
    Http.post("http://localhost:8000/api/simulation/complete", jsonData, 
        onSuccess, onError);
}

/**
 * 結果データをJSON形式に変換
 */
string buildResultJson(Table results, Table taskStats, Table tactStats) {
    JSONObject json = JSONObject();
    
    // 基本情報
    json["simulation_id"] = getSimulationId();
    json["status"] = "completed";
    json["completion_time"] = Model.dateTime.toString();
    
    // サマリ情報
    JSONObject summary = JSONObject();
    summary["total_time"] = Model.time;
    summary["completed_tasks"] = getCompletedTaskCount();
    summary["worker_utilization"] = calculateWorkerUtilization();
    summary["throughput"] = calculateThroughput();
    summary["cycle_time"] = calculateCycleTime();
    
    // ボトルネック分析
    Array bottlenecks = analyzeBottlenecks();
    summary["bottlenecks"] = bottlenecks;
    
    json["result_summary"] = summary;
    
    // 詳細結果
    JSONObject detailed = JSONObject();
    detailed["tact_statistics"] = convertTableToJSON(tactStats);
    detailed["task_statistics"] = convertTableToJSON(taskStats);
    
    json["detailed_results"] = detailed;
    
    return json.toString();
}

/**
 * HTTPリクエスト成功時のコールバック
 */
void onSuccess(Http.Response response) {
    if (response.statusCode == 200) {
        pt("Simulation results successfully sent to server");
        pt("Response: " + response.body);
        
        // UI更新やログ記録
        updateSimulationStatus("completed");
    } else {
        pt("Server returned error: " + response.statusCode);
    }
}

/**
 * HTTPリクエスト失敗時のコールバック
 */
void onError(string errorMessage) {
    pt("Failed to send results: " + errorMessage);
    
    // リトライロジック
    if (retryCount < MAX_RETRIES) {
        retryCount++;
        delayedexecute(5.0, notifySimulationComplete);
    } else {
        // エラー処理
        handleCommunicationError();
    }
}

/**
 * ボトルネック分析
 */
Array analyzeBottlenecks() {
    Array bottlenecks = Array();
    
    // 各タクトの待ち時間を分析
    for (int i = 1; i <= 3; i++) {
        Object tact = Model.find("Tact" + numtostring(i));
        double waitTime = tact.stats.idle().value;
        
        if (waitTime > BOTTLENECK_THRESHOLD) {
            JSONObject bottleneck = JSONObject();
            bottleneck["tact_id"] = i;
            bottleneck["wait_time"] = waitTime;
            bottleneck["severity"] = getBottleneckSeverity(waitTime);
            
            bottlenecks.push(bottleneck);
        }
    }
    
    return bottlenecks;
}
```

### 2.3 FlexSim HTTP設定

```c
// FlexSim: HTTP設定
// http_configuration.fs

/**
 * HTTP通信の初期設定
 */
void setupHttpCommunication() {
    // ベースURL設定
    Http.setBaseUrl("http://localhost:8000/api");
    
    // ヘッダー設定
    Http.setDefaultHeader("Content-Type", "application/json");
    Http.setDefaultHeader("X-FlexSim-Version", "2024.0");
    
    // タイムアウト設定（秒）
    Http.setTimeout(30);
    
    // SSL証明書検証（開発環境では無効化）
    Http.setVerifySSL(false);
}

/**
 * 定期的な進捗報告
 */
void sendProgressUpdate() {
    if (Model.time % PROGRESS_INTERVAL == 0) {
        JSONObject progress = JSONObject();
        progress["simulation_id"] = getSimulationId();
        progress["current_time"] = Model.time;
        progress["progress_percentage"] = (Model.time / SIMULATION_END_TIME) * 100;
        progress["current_metrics"] = getCurrentMetrics();
        
        Http.post("/simulation/progress", progress.toString());
    }
}
```

## 3. FastAPI → DB 結果格納実装

### 3.1 考え方

FastAPIがFlexSimから受信した結果データを、構造化してPostgreSQLデータベースに格納します。トランザクション管理とエラーハンドリングを適切に実装し、データの整合性を保証します。

### 3.2 FastAPI実装

```python
# backend/app/services/result_storage_service.py

from typing import Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
import json
import logging

from app.models import SimulationResult, SimulationStatus
from app.schemas import SimulationCompleteRequest
from app.database import get_db

logger = logging.getLogger(__name__)

class ResultStorageService:
    """
    シミュレーション結果をデータベースに格納するサービス
    """
    
    async def store_simulation_result(
        self,
        db: Session,
        request: SimulationCompleteRequest
    ) -> SimulationResult:
        """
        ⑫ シミュレーション結果をDBに格納
        
        Args:
            db: データベースセッション
            request: FlexSimからの完了リクエスト
            
        Returns:
            格納された結果レコード
        """
        try:
            # トランザクション開始
            db.begin()
            
            # 1. シミュレーション状態を更新
            simulation = db.query(Simulation).filter(
                Simulation.id == request.simulation_id
            ).first()
            
            if not simulation:
                raise ValueError(f"Simulation not found: {request.simulation_id}")
            
            simulation.status = SimulationStatus.COMPLETED
            simulation.completed_at = datetime.utcnow()
            
            # 2. 結果データを整形
            result_data = self._format_result_data(request.result_summary)
            
            # 3. 結果レコードを作成
            result = SimulationResult(
                simulation_id=request.simulation_id,
                total_time=result_data['total_time'],
                completed_tasks=result_data['completed_tasks'],
                worker_utilization=result_data['worker_utilization'],
                throughput=result_data['throughput'],
                cycle_time=result_data['cycle_time'],
                metrics=json.dumps(result_data.get('metrics', {})),
                bottlenecks=json.dumps(result_data.get('bottlenecks', [])),
                suggestions=json.dumps(self._generate_suggestions(result_data))
            )
            
            db.add(result)
            
            # 4. 詳細統計を保存
            if request.detailed_results:
                self._store_detailed_statistics(
                    db, 
                    request.simulation_id, 
                    request.detailed_results
                )
            
            # 5. 履歴テーブルに記録
            self._log_to_history(db, request.simulation_id, result_data)
            
            # トランザクションコミット
            db.commit()
            
            logger.info(f"Successfully stored results for simulation {request.simulation_id}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to store results: {str(e)}")
            db.rollback()
            raise
    
    def _format_result_data(self, summary: Dict[str, Any]) -> Dict[str, Any]:
        """
        結果データを正規化
        """
        return {
            'total_time': float(summary.get('total_time', 0)),
            'completed_tasks': int(summary.get('completed_tasks', 0)),
            'worker_utilization': float(summary.get('worker_utilization', 0)),
            'throughput': float(summary.get('throughput', 0)),
            'cycle_time': float(summary.get('cycle_time', 0)),
            'bottlenecks': summary.get('bottlenecks', []),
            'metrics': {
                'average_lead_time': summary.get('average_lead_time', 0),
                'work_items_completed': summary.get('work_items_completed', 0)
            }
        }
    
    def _generate_suggestions(self, result_data: Dict[str, Any]) -> list:
        """
        結果データから改善提案を生成
        """
        suggestions = []
        
        # ボトルネック解消提案
        if result_data.get('bottlenecks'):
            bottleneck = result_data['bottlenecks'][0]
            suggestions.append({
                'type': 'resource_optimization',
                'priority': 'high',
                'title': 'ボトルネック工程の改善',
                'description': f"Tact {bottleneck['tact_id']} の待ち時間を削減",
                'expected_improvement': {
                    'wait_time_reduction': bottleneck['wait_time'] * 0.3,
                    'throughput_increase': 0.15
                },
                'implementation': 'リソースの再配置または工程の並列化'
            })
        
        # 作業者稼働率改善
        utilization = result_data.get('worker_utilization', 0)
        if utilization < 0.7:
            suggestions.append({
                'type': 'workload_balancing',
                'priority': 'medium',
                'title': '作業負荷の平準化',
                'description': '作業者間のタスク配分を最適化',
                'expected_improvement': {
                    'utilization_increase': 0.85 - utilization,
                    'cost_reduction': 0.1
                }
            })
        
        # サイクルタイム短縮
        if result_data.get('cycle_time', 0) > 180:
            suggestions.append({
                'type': 'cycle_time_reduction',
                'priority': 'medium',
                'title': 'サイクルタイム短縮',
                'description': '並列処理可能なタスクの特定と実行',
                'expected_improvement': {
                    'cycle_time_reduction': 30,
                    'throughput_increase': 0.1
                }
            })
        
        return suggestions
    
    def _store_detailed_statistics(
        self,
        db: Session,
        simulation_id: str,
        detailed_results: Dict[str, Any]
    ):
        """
        詳細統計データを保存
        """
        # タクト統計
        for tact_stat in detailed_results.get('tact_statistics', []):
            db.execute(
                text("""
                    INSERT INTO tact_statistics 
                    (simulation_id, tact_id, utilization, idle_time, busy_time, blocked_time)
                    VALUES (:sim_id, :tact_id, :util, :idle, :busy, :blocked)
                """),
                {
                    'sim_id': simulation_id,
                    'tact_id': tact_stat['tact_id'],
                    'util': tact_stat['utilization'],
                    'idle': tact_stat['idle_time'],
                    'busy': tact_stat['busy_time'],
                    'blocked': tact_stat.get('blocked_time', 0)
                }
            )
        
        # タスク統計
        for task_stat in detailed_results.get('task_statistics', []):
            db.execute(
                text("""
                    INSERT INTO task_statistics
                    (simulation_id, task_id, execution_count, average_time, min_time, max_time)
                    VALUES (:sim_id, :task_id, :count, :avg, :min, :max)
                """),
                {
                    'sim_id': simulation_id,
                    'task_id': task_stat['task_id'],
                    'count': task_stat['execution_count'],
                    'avg': task_stat['average_time'],
                    'min': task_stat['min_time'],
                    'max': task_stat['max_time']
                }
            )
    
    def _log_to_history(
        self,
        db: Session,
        simulation_id: str,
        result_data: Dict[str, Any]
    ):
        """
        履歴テーブルに記録
        """
        db.execute(
            text("""
                INSERT INTO simulation_history
                (simulation_id, event_type, event_data, created_at)
                VALUES (:sim_id, :event_type, :event_data, :created_at)
            """),
            {
                'sim_id': simulation_id,
                'event_type': 'SIMULATION_COMPLETED',
                'event_data': json.dumps(result_data),
                'created_at': datetime.utcnow()
            }
        )
```

### 3.3 データベースモデル定義

```python
# backend/app/models/simulation_models.py

from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base

class Simulation(Base):
    """シミュレーション管理テーブル"""
    __tablename__ = "simulations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(String(20), nullable=False, default='pending')
    configuration = Column(JSON, nullable=False)
    parameters = Column(JSON)
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    error_message = Column(String)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # リレーション
    results = relationship("SimulationResult", back_populates="simulation", uselist=False)

class SimulationResult(Base):
    """シミュレーション結果テーブル"""
    __tablename__ = "simulation_results"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    simulation_id = Column(UUID(as_uuid=True), ForeignKey("simulations.id"), nullable=False)
    total_time = Column(Float, nullable=False)
    completed_tasks = Column(Integer, nullable=False)
    worker_utilization = Column(Float, nullable=False)
    throughput = Column(Float, nullable=False)
    cycle_time = Column(Float, nullable=False)
    metrics = Column(JSON, nullable=False)
    bottlenecks = Column(JSON)
    suggestions = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
    
    # リレーション
    simulation = relationship("Simulation", back_populates="results")
```

## 4. FastAPI → Next.js WebSocket通信実装

### 4.1 考え方

WebSocketを使用してリアルタイムでシミュレーション完了イベントをフロントエンドに通知します。接続管理、イベントルーティング、エラーハンドリングを含む双方向通信を実装します。

### 4.2 FastAPI WebSocketサーバー実装

```python
# backend/app/websocket/websocket_manager.py

from typing import Dict, List, Set
from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    WebSocket接続を管理するクラス
    """
    
    def __init__(self):
        # アクティブな接続を管理
        self.active_connections: Dict[str, WebSocket] = {}
        # チャンネル購読を管理
        self.subscriptions: Dict[str, Set[str]] = {}
        # 接続ごとのメタデータ
        self.connection_metadata: Dict[str, dict] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """
        新規WebSocket接続を確立
        """
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.connection_metadata[client_id] = {
            'connected_at': datetime.utcnow(),
            'last_ping': datetime.utcnow()
        }
        
        # 接続確認メッセージを送信
        await self.send_personal_message(
            client_id,
            {
                'type': 'connection.established',
                'client_id': client_id,
                'timestamp': datetime.utcnow().isoformat()
            }
        )
        
        logger.info(f"WebSocket connected: {client_id}")
    
    def disconnect(self, client_id: str):
        """
        WebSocket接続を切断
        """
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            del self.connection_metadata[client_id]
            
            # 購読を削除
            for channel in list(self.subscriptions.keys()):
                if client_id in self.subscriptions[channel]:
                    self.subscriptions[channel].remove(client_id)
                    if not self.subscriptions[channel]:
                        del self.subscriptions[channel]
            
            logger.info(f"WebSocket disconnected: {client_id}")
    
    async def send_personal_message(self, client_id: str, message: dict):
        """
        特定クライアントにメッセージを送信
        """
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message to {client_id}: {e}")
                self.disconnect(client_id)
    
    async def broadcast_to_channel(self, channel: str, message: dict):
        """
        チャンネル購読者全員にメッセージをブロードキャスト
        """
        if channel in self.subscriptions:
            disconnected_clients = []
            
            for client_id in self.subscriptions[channel]:
                if client_id in self.active_connections:
                    try:
                        await self.active_connections[client_id].send_json(message)
                    except Exception as e:
                        logger.error(f"Failed to send to {client_id}: {e}")
                        disconnected_clients.append(client_id)
            
            # 切断されたクライアントを削除
            for client_id in disconnected_clients:
                self.disconnect(client_id)
    
    async def subscribe(self, client_id: str, channel: str):
        """
        クライアントをチャンネルに購読
        """
        if channel not in self.subscriptions:
            self.subscriptions[channel] = set()
        
        self.subscriptions[channel].add(client_id)
        
        await self.send_personal_message(
            client_id,
            {
                'type': 'subscription.confirmed',
                'channel': channel,
                'timestamp': datetime.utcnow().isoformat()
            }
        )
        
        logger.info(f"Client {client_id} subscribed to {channel}")
    
    async def unsubscribe(self, client_id: str, channel: str):
        """
        チャンネル購読を解除
        """
        if channel in self.subscriptions and client_id in self.subscriptions[channel]:
            self.subscriptions[channel].remove(client_id)
            
            if not self.subscriptions[channel]:
                del self.subscriptions[channel]
            
            await self.send_personal_message(
                client_id,
                {
                    'type': 'subscription.cancelled',
                    'channel': channel,
                    'timestamp': datetime.utcnow().isoformat()
                }
            )

# グローバルインスタンス
manager = ConnectionManager()

# backend/app/api/websocket_endpoint.py

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Optional
import json
import uuid
from app.websocket.websocket_manager import manager

router = APIRouter()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocketエンドポイント
    """
    client_id = str(uuid.uuid4())
    
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            # クライアントからのメッセージを待機
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # メッセージタイプに応じて処理
            await handle_client_message(client_id, message)
            
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(client_id)

async def handle_client_message(client_id: str, message: dict):
    """
    クライアントメッセージを処理
    """
    msg_type = message.get('type')
    
    if msg_type == 'subscribe':
        # チャンネル購読
        channel = message.get('channel')
        simulation_id = message.get('simulation_id')
        
        if channel == 'simulation' and simulation_id:
            await manager.subscribe(client_id, f"simulation:{simulation_id}")
    
    elif msg_type == 'unsubscribe':
        # 購読解除
        channel = message.get('channel')
        simulation_id = message.get('simulation_id')
        
        if channel == 'simulation' and simulation_id:
            await manager.unsubscribe(client_id, f"simulation:{simulation_id}")
    
    elif msg_type == 'ping':
        # ハートビート
        await manager.send_personal_message(
            client_id,
            {'type': 'pong', 'timestamp': datetime.utcnow().isoformat()}
        )

# backend/app/services/notification_service.py

from app.websocket.websocket_manager import manager
from datetime import datetime

class NotificationService:
    """
    ⑬ WebSocketでフロントエンドに通知を送るサービス
    """
    
    async def notify_simulation_completed(self, simulation_id: str):
        """
        シミュレーション完了をフロントエンドに通知
        """
        message = {
            'type': 'simulation.completed',
            'simulation_id': simulation_id,
            'timestamp': datetime.utcnow().isoformat(),
            'data': {
                'status': 'completed',
                'result_available': True
            }
        }
        
        # 該当シミュレーションの購読者に通知
        await manager.broadcast_to_channel(
            f"simulation:{simulation_id}",
            message
        )
        
        # 全体チャンネルにも通知
        await manager.broadcast_to_channel('global', message)
    
    async def notify_simulation_progress(
        self, 
        simulation_id: str, 
        progress: float,
        current_metrics: dict
    ):
        """
        シミュレーション進捗を通知
        """
        message = {
            'type': 'simulation.progress',
            'simulation_id': simulation_id,
            'timestamp': datetime.utcnow().isoformat(),
            'data': {
                'progress_percentage': progress,
                'current_metrics': current_metrics
            }
        }
        
        await manager.broadcast_to_channel(
            f"simulation:{simulation_id}",
            message
        )
    
    async def notify_simulation_error(
        self,
        simulation_id: str,
        error: str
    ):
        """
        シミュレーションエラーを通知
        """
        message = {
            'type': 'simulation.error',
            'simulation_id': simulation_id,
            'timestamp': datetime.utcnow().isoformat(),
            'data': {
                'error_message': error,
                'recoverable': False
            }
        }
        
        await manager.broadcast_to_channel(
            f"simulation:{simulation_id}",
            message
        )
```

## 5. Next.js → FastAPI 結果取得実装

### 5.1 考え方

フロントエンドがWebSocketで完了通知を受信した後、REST APIを使用して詳細な結果データを取得し、UIに表示します。リアクティブな状態管理とエラーハンドリングを実装します。

### 5.2 Next.js実装

```typescript
// frontend/lib/websocket/websocket-client.ts

import { EventEmitter } from 'events';

export interface WebSocketMessage {
  type: string;
  simulation_id?: string;
  timestamp: string;
  data?: any;
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  constructor(url: string) {
    super();
    this.url = url;
  }
  
  connect(): void {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }
  
  private handleOpen(): void {
    console.log('WebSocket connected');
    this.reconnectAttempts = 0;
    this.emit('connected');
    
    // ハートビート開始
    this.startHeartbeat();
  }
  
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // メッセージタイプに応じてイベントを発行
      switch (message.type) {
        case 'simulation.completed':
          this.emit('simulationCompleted', message);
          break;
        case 'simulation.progress':
          this.emit('simulationProgress', message);
          break;
        case 'simulation.error':
          this.emit('simulationError', message);
          break;
        case 'connection.established':
          this.emit('connectionEstablished', message);
          break;
        default:
          this.emit('message', message);
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }
  
  private handleClose(): void {
    console.log('WebSocket disconnected');
    this.stopHeartbeat();
    this.emit('disconnected');
    this.scheduleReconnect();
  }
  
  private handleError(error: Event): void {
    console.error('WebSocket error:', error);
    this.emit('error', error);
  }
  
  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('reconnectFailed');
    }
  }
  
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping' });
      }
    }, 30000); // 30秒ごと
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }
  
  subscribe(simulationId: string): void {
    this.send({
      type: 'subscribe',
      channel: 'simulation',
      simulation_id: simulationId
    });
  }
  
  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// frontend/hooks/useSimulation.ts

import { useState, useEffect, useCallback } from 'react';
import { WebSocketClient } from '@/lib/websocket/websocket-client';
import { SimulationAPI } from '@/lib/api/simulation-api';
import { SimulationResult } from '@/types/simulation';

export function useSimulation() {
  const [ws, setWs] = useState<WebSocketClient | null>(null);
  const [api] = useState(() => new SimulationAPI());
  const [simulationId, setSimulationId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // WebSocket初期化
  useEffect(() => {
    const wsClient = new WebSocketClient(
      process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws'
    );
    
    // イベントリスナー設定
    wsClient.on('connected', () => {
      console.log('Connected to WebSocket server');
      
      // 進行中のシミュレーションがあれば再購読
      if (simulationId && status === 'running') {
        wsClient.subscribe(simulationId);
      }
    });
    
    wsClient.on('simulationCompleted', async (message) => {
      // ⑬ 完了通知受信
      console.log('Simulation completed:', message.simulation_id);
      
      if (message.simulation_id === simulationId) {
        setStatus('completed');
        
        // ⑭ 結果データ取得
        await fetchResults(message.simulation_id);
      }
    });
    
    wsClient.on('simulationProgress', (message) => {
      if (message.simulation_id === simulationId) {
        setProgress(message.data.progress_percentage);
      }
    });
    
    wsClient.on('simulationError', (message) => {
      if (message.simulation_id === simulationId) {
        setStatus('error');
        setError(message.data.error_message);
      }
    });
    
    // 接続開始
    wsClient.connect();
    setWs(wsClient);
    
    // クリーンアップ
    return () => {
      wsClient.disconnect();
    };
  }, []);
  
  // シミュレーション開始
  const startSimulation = useCallback(async (config: any) => {
    try {
      setStatus('running');
      setProgress(0);
      setError(null);
      setResult(null);
      
      // APIでシミュレーション開始
      const simId = await api.startSimulation(config);
      setSimulationId(simId);
      
      // WebSocket購読
      if (ws) {
        ws.subscribe(simId);
      }
      
      return simId;
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to start simulation');
      throw err;
    }
  }, [ws, api]);
  
  // 結果取得（⑭）
  const fetchResults = useCallback(async (simId: string) => {
    try {
      const resultData = await api.getResult(simId);
      setResult(resultData);
      return resultData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch results');
      throw err;
    }
  }, [api]);
  
  return {
    startSimulation,
    simulationId,
    status,
    progress,
    result,
    error,
    fetchResults
  };
}

// frontend/components/SimulationDashboard.tsx

import React, { useState } from 'react';
import { useSimulation } from '@/hooks/useSimulation';
import { SimulationConfig } from '@/types/simulation';
import { ResultsDisplay } from './ResultsDisplay';
import { ProgressBar } from './ProgressBar';
import { ErrorAlert } from './ErrorAlert';

export const SimulationDashboard: React.FC = () => {
  const { 
    startSimulation, 
    status, 
    progress, 
    result, 
    error 
  } = useSimulation();
  
  const [config] = useState<SimulationConfig>({
    tact_configuration: {
      tact_1: { id: 1, name: 'Tact A', capacity: 1, workers: 2 },
      tact_2: { id: 2, name: 'Tact B', capacity: 1, workers: 3 },
      tact_3: { id: 3, name: 'Tact C', capacity: 1, workers: 2 }
    },
    task_queue: [
      // タスク定義
    ],
    simulation_parameters: {
      duration: 28800,
      evaluation_mode: 'simple'
    }
  });
  
  const handleStart = async () => {
    try {
      await startSimulation(config);
    } catch (err) {
      console.error('Failed to start simulation:', err);
    }
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">シミュレーション実行</h1>
      
      {/* エラー表示 */}
      {error && <ErrorAlert message={error} />}
      
      {/* 実行ボタン */}
      <button
        onClick={handleStart}
        disabled={status === 'running'}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        {status === 'running' ? 'シミュレーション実行中...' : 'シミュレーション開始'}
      </button>
      
      {/* 進捗表示 */}
      {status === 'running' && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">実行進捗</h2>
          <ProgressBar progress={progress} />
          <p className="text-sm text-gray-600 mt-1">{progress.toFixed(1)}% 完了</p>
        </div>
      )}
      
      {/* 結果表示（⑭） */}
      {status === 'completed' && result && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">シミュレーション結果</h2>
          <ResultsDisplay result={result} />
        </div>
      )}
    </div>
  );
};

// frontend/components/ResultsDisplay.tsx

import React from 'react';
import { SimulationResult } from '@/types/simulation';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';

interface Props {
  result: SimulationResult;
}

export const ResultsDisplay: React.FC<Props> = ({ result }) => {
  // メトリクスデータ整形
  const metricsData = [
    { name: '完了タスク', value: result.metrics.completed_tasks },
    { name: 'スループット', value: result.metrics.throughput },
    { name: '作業者稼働率', value: result.metrics.worker_utilization * 100 }
  ];
  
  // ボトルネックデータ整形
  const bottleneckData = result.metrics.bottlenecks.map((b: any) => ({
    name: `Tact ${b.tact_id}`,
    waitTime: b.wait_time,
    severity: b.severity
  }));
  
  const severityColors: { [key: string]: string } = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444'
  };
  
  return (
    <div className="space-y-6">
      {/* サマリカード */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">総実行時間</h3>
          <p className="text-2xl font-bold">{(result.metrics.total_time / 3600).toFixed(1)}時間</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">完了タスク数</h3>
          <p className="text-2xl font-bold">{result.metrics.completed_tasks}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">作業者稼働率</h3>
          <p className="text-2xl font-bold">{(result.metrics.worker_utilization * 100).toFixed(1)}%</p>
        </div>
      </div>
      
      {/* メトリクスチャート */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">パフォーマンスメトリクス</h3>
        <BarChart width={600} height={300} data={metricsData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#3b82f6" />
        </BarChart>
      </div>
      
      {/* ボトルネック分析 */}
      {bottleneckData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">ボトルネック分析</h3>
          <div className="space-y-3">
            {bottleneckData.map((b: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <span className="font-medium">{b.name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">
                    待ち時間: {b.waitTime}秒
                  </span>
                  <span 
                    className={`px-2 py-1 text-xs rounded text-white`}
                    style={{ backgroundColor: severityColors[b.severity] }}
                  >
                    {b.severity.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 改善提案 */}
      {result.suggestions && result.suggestions.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">改善提案</h3>
          <div className="space-y-4">
            {result.suggestions.map((suggestion: any, index: number) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold">{suggestion.title}</h4>
                <p className="text-gray-600 mt-1">{suggestion.description}</p>
                {suggestion.expected_improvement && (
                  <div className="mt-2 text-sm text-gray-500">
                    期待効果: 
                    {Object.entries(suggestion.expected_improvement).map(([key, value]) => (
                      <span key={key} className="ml-2">
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm text-blue-600 mt-2">
                  実装方法: {suggestion.implementation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

## 6. 統合テストとデバッグ

### 6.1 エンドツーエンドテスト

```python
# backend/tests/test_integration.py

import pytest
import asyncio
import json
from httpx import AsyncClient
from fastapi.testclient import TestClient
from app.main import app

@pytest.mark.asyncio
async def test_simulation_complete_flow():
    """
    ⑪〜⑭の完全なフローをテスト
    """
    async with AsyncClient(app=app, base_url="http://test") as client:
        # ⑪ FlexSimからの完了通知をシミュレート
        complete_request = {
            "simulation_id": "test_sim_001",
            "status": "completed",
            "completion_time": "2025-09-18T10:30:00Z",
            "result_summary": {
                "total_time": 28800,
                "completed_tasks": 150,
                "worker_utilization": 0.85,
                "throughput": 5.2,
                "cycle_time": 180,
                "bottlenecks": [
                    {
                        "tact_id": 2,
                        "wait_time": 450,
                        "severity": "high"
                    }
                ]
            }
        }
        
        response = await client.post(
            "/api/simulation/complete",
            json=complete_request
        )
        
        # ⑫ DB格納確認
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        
        # ⑭ 結果取得テスト
        result_response = await client.get(
            f"/api/results/{complete_request['simulation_id']}"
        )
        
        assert result_response.status_code == 200
        result_data = result_response.json()["data"]
        assert result_data["simulation_id"] == "test_sim_001"
        assert result_data["status"] == "completed"
        assert len(result_data["bottlenecks"]) > 0
        assert len(result_data["suggestions"]) > 0

@pytest.mark.asyncio  
async def test_websocket_notification():
    """
    ⑬ WebSocket通知のテスト
    """
    from fastapi.testclient import TestClient
    
    with TestClient(app) as client:
        with client.websocket_connect("/ws") as websocket:
            # 接続確認
            data = websocket.receive_json()
            assert data["type"] == "connection.established"
            
            # シミュレーション購読
            websocket.send_json({
                "type": "subscribe",
                "channel": "simulation",
                "simulation_id": "test_sim_002"
            })
            
            # 購読確認
            data = websocket.receive_json()
            assert data["type"] == "subscription.confirmed"
            
            # 別スレッドで完了通知を送信
            async def send_completion():
                await asyncio.sleep(1)
                # NotificationServiceを使って通知
                from app.services.notification_service import NotificationService
                service = NotificationService()
                await service.notify_simulation_completed("test_sim_002")
            
            # 非同期で通知送信
            asyncio.create_task(send_completion())
            
            # 完了通知受信確認
            data = websocket.receive_json()
            assert data["type"] == "simulation.completed"
            assert data["simulation_id"] == "test_sim_002"
```

### 6.2 デバッグツール

```typescript
// frontend/utils/debug-logger.ts

export class DebugLogger {
  private enabled: boolean;
  private prefix: string;
  
  constructor(prefix: string) {
    this.prefix = prefix;
    this.enabled = process.env.NODE_ENV === 'development';
  }
  
  log(message: string, data?: any): void {
    if (this.enabled) {
      console.log(`[${this.prefix}] ${message}`, data || '');
    }
  }
  
  error(message: string, error?: any): void {
    console.error(`[${this.prefix}] ERROR: ${message}`, error || '');
  }
  
  time(label: string): void {
    if (this.enabled) {
      console.time(`[${this.prefix}] ${label}`);
    }
  }
  
  timeEnd(label: string): void {
    if (this.enabled) {
      console.timeEnd(`[${this.prefix}] ${label}`);
    }
  }
}

// 使用例
const logger = new DebugLogger('SimulationAPI');
logger.log('Starting simulation', { id: 'sim_001' });
logger.time('API Call');
// ... API呼び出し
logger.timeEnd('API Call');
```

## 7. デプロイメント構成

### 7.1 Docker Compose設定

```yaml
# docker-compose.yml

version: '3.8'

services:
  # PostgreSQLデータベース
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: simulation_db
      POSTGRES_USER: sim_user
      POSTGRES_PASSWORD: sim_pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/sql/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sim_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # FastAPIバックエンド
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://sim_user:sim_pass@db:5432/simulation_db
      REDIS_URL: redis://redis:6379
      FLEXSIM_URL: http://flexsim:5000
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  # Next.jsフロントエンド
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: http://backend:8000/api
      NEXT_PUBLIC_WS_URL: ws://backend:8000/ws
    ports:
      - "3000:3000"
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev

  # Redis（キャッシュ/セッション管理）
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # FlexSimサーバー（モック）
  flexsim_mock:
    build:
      context: ./flexsim_mock
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      API_URL: http://backend:8000/api
    volumes:
      - ./flexsim_mock:/app

volumes:
  postgres_data:
  redis_data:
```

## 8. まとめ

本実装ガイドでは、⑪〜⑭のシステム連携フローを実現するための具体的なコード例と実装方法を示しました。

**実装のポイント**：

1. **FlexSim → FastAPI**: HTTP POSTで構造化されたJSONデータを送信
2. **FastAPI → DB**: トランザクション管理で確実にデータを格納
3. **FastAPI → Next.js**: WebSocketでリアルタイム通知
4. **Next.js → FastAPI**: REST APIで結果データ取得と表示

**次のステップ**：

1. 各コンポーネントの単体実装
2. 統合テストの実施
3. パフォーマンスチューニング
4. エラーハンドリングの強化
5. 本番環境へのデプロイメント

この設計により、展示会でのデモンストレーションに必要な機能が全て実装可能です。