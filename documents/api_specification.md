# API仕様書

## 1. 概要

### 1.1 基本情報
- **ベースURL**: `http://localhost:8000/api`
- **プロトコル**: HTTP/1.1, WebSocket
- **データ形式**: JSON
- **文字エンコーディング**: UTF-8
- **認証方式**: Bearer Token（展示版では簡易認証）

### 1.2 共通ヘッダー
```http
Content-Type: application/json
Authorization: Bearer {token}
X-Request-ID: {uuid}
```

### 1.3 共通レスポンス形式

#### 成功時
```json
{
  "status": "success",
  "data": {
    // レスポンスデータ
  },
  "timestamp": "2025-09-18T10:30:00Z"
}
```

#### エラー時
```json
{
  "status": "error",
  "error": {
    "code": "SIMULATION_FAILED",
    "message": "Simulation execution failed",
    "details": "Additional error information"
  },
  "timestamp": "2025-09-18T10:30:00Z"
}
```

## 2. エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| POST | /simulation/start | シミュレーション開始 |
| POST | /simulation/complete | シミュレーション完了通知（⑪） |
| GET | /simulation/{id}/status | シミュレーション状態取得 |
| POST | /simulation/{id}/stop | シミュレーション停止 |
| GET | /results/{id} | シミュレーション結果取得（⑭） |
| POST | /progress/update | 工程進捗更新 |
| GET | /progress/current | 現在進捗取得 |
| POST | /tasks/evaluate | タスク評価実行 |
| GET | /tasks/queue | タスクキュー取得 |
| WS | /ws | WebSocket接続 |

## 3. API詳細仕様

### 3.1 シミュレーション開始
**POST** `/simulation/start`

#### リクエスト
```json
{
  "tact_configuration": {
    "tact_1": {
      "id": 1,
      "name": "Tact A",
      "capacity": 1,
      "workers": 2
    },
    "tact_2": {
      "id": 2,
      "name": "Tact B",
      "capacity": 1,
      "workers": 3
    },
    "tact_3": {
      "id": 3,
      "name": "Tact C",
      "capacity": 1,
      "workers": 2
    }
  },
  "task_queue": [
    {
      "task_id": 1,
      "name": "A1Task1",
      "task_type": "main",
      "tact_id": 1,
      "standard_time": 30.0,
      "dependencies": []
    },
    {
      "task_id": 2,
      "name": "A1Task2",
      "task_type": "main",
      "tact_id": 1,
      "standard_time": 20.0,
      "dependencies": [1]
    }
  ],
  "simulation_parameters": {
    "duration": 28800,
    "evaluation_mode": "simple",
    "seed": 12345
  }
}
```

#### レスポンス
```json
{
  "status": "success",
  "data": {
    "simulation_id": "sim_20250918_103000",
    "estimated_completion": "2025-09-18T10:33:00Z",
    "status": "running"
  }
}
```

### 3.2 シミュレーション完了通知（⑪）
**POST** `/simulation/complete`

FlexSimからFastAPIへの完了通知

#### リクエスト
```json
{
  "simulation_id": "sim_20250918_103000",
  "status": "completed",
  "completion_time": "2025-09-18T10:32:45Z",
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
    ],
    "work_items_completed": 45,
    "average_lead_time": 240
  },
  "detailed_results": {
    "tact_statistics": [
      {
        "tact_id": 1,
        "utilization": 0.82,
        "idle_time": 5184,
        "busy_time": 23616,
        "blocked_time": 0
      }
    ],
    "task_statistics": [
      {
        "task_id": 1,
        "execution_count": 45,
        "average_time": 28.5,
        "min_time": 25.0,
        "max_time": 35.0
      }
    ]
  }
}
```

#### レスポンス（⑫ DB格納完了後）
```json
{
  "status": "success",
  "message": "Simulation result saved successfully",
  "result_id": "result_20250918_103245"
}
```

### 3.3 シミュレーション結果取得（⑭）
**GET** `/results/{simulation_id}`

フロントエンドがシミュレーション結果を取得

#### レスポンス
```json
{
  "status": "success",
  "data": {
    "simulation_id": "sim_20250918_103000",
    "status": "completed",
    "completion_time": "2025-09-18T10:32:45Z",
    "metrics": {
      "total_time": 28800,
      "completed_tasks": 150,
      "worker_utilization": 0.85,
      "throughput": 5.2,
      "cycle_time": 180,
      "work_items_completed": 45,
      "average_lead_time": 240
    },
    "bottlenecks": [
      {
        "tact_id": 2,
        "tact_name": "Tact B",
        "severity": "high",
        "wait_time": 450,
        "description": "Tact B で待ち時間が発生しています",
        "impact": "全体の生産性を15%低下させています"
      }
    ],
    "suggestions": [
      {
        "type": "resource_optimization",
        "priority": "high",
        "title": "作業者の再配置",
        "description": "Tact A から Tact B に作業者を1名移動",
        "expected_improvement": {
          "throughput_increase": 0.12,
          "wait_time_reduction": 180
        },
        "implementation_steps": [
          "Tact A の作業者を1名減らす",
          "Tact B の作業者を1名増やす",
          "タスク割り当てを再調整"
        ]
      },
      {
        "type": "overtime_reduction",
        "priority": "medium",
        "title": "残業時間の削減",
        "description": "タスクスケジュールの最適化により残業を30分削減",
        "expected_improvement": {
          "overtime_reduction": 30,
          "cost_saving": 15000
        }
      }
    ],
    "charts": {
      "utilization_chart": {
        "type": "bar",
        "data": {
          "labels": ["Tact A", "Tact B", "Tact C"],
          "values": [0.82, 0.95, 0.75]
        }
      },
      "timeline_chart": {
        "type": "gantt",
        "data": {
          "tasks": [
            {
              "name": "Work Item 1",
              "start": "09:00",
              "end": "09:30",
              "tact": "Tact A"
            }
          ]
        }
      }
    }
  }
}
```

### 3.4 工程進捗更新
**POST** `/progress/update`

#### リクエスト
```json
{
  "work_item_id": "item_001",
  "current_tact_id": 2,
  "current_task_id": 5,
  "status": "in_progress",
  "completion_percentage": 65,
  "updated_by": "camera_system",
  "ar_marker_data": {
    "marker_id": "AR_001",
    "position": {
      "x": 100,
      "y": 200,
      "z": 0
    },
    "timestamp": "2025-09-18T10:30:00Z"
  }
}
```

#### レスポンス
```json
{
  "status": "success",
  "data": {
    "progress_id": "prog_20250918_103000",
    "work_item_id": "item_001",
    "updated": true
  }
}
```

### 3.5 タスク評価実行
**POST** `/tasks/evaluate`

#### リクエスト
```json
{
  "task_ids": [1, 2, 3, 4, 5],
  "evaluation_context": {
    "current_time": "2025-09-18T10:30:00Z",
    "tact_states": {
      "1": "idle",
      "2": "busy",
      "3": "idle"
    },
    "worker_availability": {
      "1": 2,
      "2": 1,
      "3": 2
    }
  }
}
```

#### レスポンス
```json
{
  "status": "success",
  "data": {
    "evaluations": [
      {
        "task_id": 1,
        "evaluation_value": 1,
        "executable": true,
        "reason": "All dependencies satisfied"
      },
      {
        "task_id": 2,
        "evaluation_value": 0,
        "executable": false,
        "reason": "Waiting for task 1 completion"
      },
      {
        "task_id": 3,
        "evaluation_value": 0,
        "executable": false,
        "reason": "Next tact is occupied"
      }
    ],
    "recommended_task": 1
  }
}
```

## 4. WebSocket API

### 4.1 接続
**エンドポイント**: `ws://localhost:8000/ws`

### 4.2 メッセージ形式

#### クライアント → サーバー
```json
{
  "type": "subscribe",
  "channel": "simulation",
  "simulation_id": "sim_20250918_103000"
}
```

#### サーバー → クライアント

##### シミュレーション開始通知
```json
{
  "type": "simulation.started",
  "simulation_id": "sim_20250918_103000",
  "timestamp": "2025-09-18T10:30:00Z",
  "data": {
    "estimated_completion": "2025-09-18T10:33:00Z"
  }
}
```

##### 進捗更新通知
```json
{
  "type": "simulation.progress",
  "simulation_id": "sim_20250918_103000",
  "timestamp": "2025-09-18T10:31:00Z",
  "data": {
    "progress_percentage": 45,
    "current_time": 14400,
    "completed_tasks": 68
  }
}
```

##### シミュレーション完了通知（⑬）
```json
{
  "type": "simulation.completed",
  "simulation_id": "sim_20250918_103000",
  "timestamp": "2025-09-18T10:32:45Z",
  "data": {
    "status": "completed",
    "result_available": true
  }
}
```

##### エラー通知
```json
{
  "type": "simulation.error",
  "simulation_id": "sim_20250918_103000",
  "timestamp": "2025-09-18T10:31:30Z",
  "data": {
    "error_code": "SIM_FAILED",
    "message": "Simulation failed due to invalid parameters",
    "recoverable": false
  }
}
```

## 5. エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| INVALID_PARAMS | 400 | 不正なパラメータ |
| AUTH_REQUIRED | 401 | 認証が必要 |
| FORBIDDEN | 403 | アクセス権限なし |
| NOT_FOUND | 404 | リソースが見つからない |
| CONFLICT | 409 | リソースの競合 |
| SIM_FAILED | 500 | シミュレーション実行エラー |
| DB_ERROR | 503 | データベースエラー |
| FLEXSIM_UNAVAILABLE | 503 | FlexSimサービス利用不可 |

## 6. 実装例

### 6.1 Python (FastAPI) クライアント
```python
import httpx
import asyncio
from typing import Dict, Any

class SimulationAPIClient:
    def __init__(self, base_url: str = "http://localhost:8000/api"):
        self.base_url = base_url
        self.client = httpx.AsyncClient()
    
    async def start_simulation(self, config: Dict[str, Any]) -> str:
        """シミュレーション開始"""
        response = await self.client.post(
            f"{self.base_url}/simulation/start",
            json=config
        )
        response.raise_for_status()
        return response.json()["data"]["simulation_id"]
    
    async def get_result(self, simulation_id: str) -> Dict[str, Any]:
        """結果取得（⑭）"""
        response = await self.client.get(
            f"{self.base_url}/results/{simulation_id}"
        )
        response.raise_for_status()
        return response.json()["data"]
    
    async def wait_for_completion(self, simulation_id: str, timeout: int = 300):
        """完了待機"""
        start_time = asyncio.get_event_loop().time()
        while asyncio.get_event_loop().time() - start_time < timeout:
            response = await self.client.get(
                f"{self.base_url}/simulation/{simulation_id}/status"
            )
            status = response.json()["data"]["status"]
            if status == "completed":
                return True
            elif status == "failed":
                raise Exception("Simulation failed")
            await asyncio.sleep(5)
        raise TimeoutError("Simulation timeout")

# 使用例
async def main():
    client = SimulationAPIClient()
    
    # シミュレーション開始
    sim_id = await client.start_simulation({
        "tact_configuration": {...},
        "task_queue": [...]
    })
    
    # 完了待機
    await client.wait_for_completion(sim_id)
    
    # 結果取得
    result = await client.get_result(sim_id)
    print(f"Results: {result}")
```

### 6.2 TypeScript (Next.js) クライアント
```typescript
// lib/api/simulation.ts
export class SimulationAPI {
  private baseURL: string;
  private ws: WebSocket | null = null;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  async startSimulation(config: SimulationConfig): Promise<string> {
    const response = await fetch(`${this.baseURL}/simulation/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Failed to start simulation: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.simulation_id;
  }

  async getResult(simulationId: string): Promise<SimulationResult> {
    const response = await fetch(`${this.baseURL}/results/${simulationId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get results: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data;
  }

  connectWebSocket(
    simulationId: string,
    onMessage: (event: SimulationEvent) => void
  ): void {
    const wsURL = this.baseURL.replace('http', 'ws') + '/ws';
    this.ws = new WebSocket(wsURL);

    this.ws.onopen = () => {
      this.ws?.send(JSON.stringify({
        type: 'subscribe',
        channel: 'simulation',
        simulation_id: simulationId,
      }));
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage(data);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// 使用例
const api = new SimulationAPI();

// シミュレーション開始
const simId = await api.startSimulation(config);

// WebSocket接続
api.connectWebSocket(simId, (event) => {
  if (event.type === 'simulation.completed') {
    // ⑬ 完了通知受信
    console.log('Simulation completed');
    
    // ⑭ 結果取得
    api.getResult(simId).then(result => {
      displayResults(result);
    });
  }
});
```

## 7. テスト方法

### 7.1 cURLによるテスト

```bash
# シミュレーション開始
curl -X POST http://localhost:8000/api/simulation/start \
  -H "Content-Type: application/json" \
  -d '{
    "tact_configuration": {...},
    "task_queue": [...]
  }'

# 結果取得
curl -X GET http://localhost:8000/api/results/sim_20250918_103000

# WebSocket接続（wscat使用）
wscat -c ws://localhost:8000/ws
> {"type":"subscribe","channel":"simulation","simulation_id":"sim_20250918_103000"}
```

### 7.2 Postmanコレクション
Postmanコレクションファイルは `/tests/postman/simulation_api.json` に配置

## 8. 注意事項

1. **認証トークン**: 展示版では固定トークン使用、本番では動的生成
2. **レート制限**: 1分間に60リクエストまで
3. **タイムアウト**: API呼び出しは30秒でタイムアウト
4. **データサイズ**: レスポンスは最大10MBまで
5. **並行実行**: 同時実行可能なシミュレーションは5つまで