# データベース設計書

## 1. 概要

### 1.1 データベース基本情報
- **DBMS**: PostgreSQL 15（開発・本番）/ SQLite（ローカルテスト）
- **文字コード**: UTF-8
- **照合順序**: ja_JP.UTF-8
- **タイムゾーン**: Asia/Tokyo

### 1.2 命名規則
- **テーブル名**: スネークケース、複数形（例: `simulation_results`）
- **カラム名**: スネークケース（例: `created_at`）
- **主キー**: `id` または `{table_name}_id`
- **外部キー**: `{参照テーブル単数形}_id`
- **インデックス**: `idx_{table_name}_{column_names}`

## 2. ER図

```mermaid
erDiagram
    simulations ||--o{ simulation_results : has
    simulations ||--o{ work_progress : tracks
    work_progress ||--o{ work_progress_history : logs
    tasks ||--o{ task_executions : executed
    tasks }o--|| tacts : belongs_to
    tacts ||--o{ tact_states : has
    workers ||--o{ worker_assignments : assigned
    task_queues ||--o{ task_queue_items : contains
    tasks ||--o{ task_dependencies : has
    
    simulations {
        uuid id PK
        string status
        json configuration
        timestamp started_at
        timestamp completed_at
        timestamp created_at
    }
    
    simulation_results {
        uuid id PK
        uuid simulation_id FK
        float total_time
        int completed_tasks
        float worker_utilization
        json metrics
        json bottlenecks
        json suggestions
        timestamp created_at
    }
    
    tasks {
        int id PK
        string name
        string task_type
        int tact_id FK
        float standard_time
        int next_task_id
        json parameters
        timestamp created_at
    }
    
    tacts {
        int id PK
        string name
        int capacity
        int next_tact_id
        string description
        timestamp created_at
    }
    
    work_progress {
        uuid id PK
        string work_item_id
        int current_tact_id FK
        int current_task_id FK
        string status
        float completion_percentage
        timestamp updated_at
    }
```

## 3. テーブル定義

### 3.1 simulations（シミュレーション管理）
シミュレーション実行の管理テーブル

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|----------|------|------------|------|
| id | UUID | NO | uuid_generate_v4() | 主キー |
| status | VARCHAR(20) | NO | 'pending' | 状態（pending/running/completed/failed） |
| configuration | JSONB | NO | | シミュレーション設定 |
| parameters | JSONB | YES | | 実行パラメータ |
| started_at | TIMESTAMP | YES | | 開始時刻 |
| completed_at | TIMESTAMP | YES | | 完了時刻 |
| error_message | TEXT | YES | | エラーメッセージ |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 作成時刻 |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 更新時刻 |

```sql
CREATE TABLE simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    configuration JSONB NOT NULL,
    parameters JSONB,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_simulations_status ON simulations(status);
CREATE INDEX idx_simulations_created_at ON simulations(created_at DESC);
```

### 3.2 simulation_results（シミュレーション結果）
シミュレーション実行結果の格納テーブル（⑫で格納）

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|----------|------|------------|------|
| id | UUID | NO | uuid_generate_v4() | 主キー |
| simulation_id | UUID | NO | | シミュレーションID（外部キー） |
| total_time | FLOAT | NO | | 総実行時間（秒） |
| completed_tasks | INT | NO | | 完了タスク数 |
| worker_utilization | FLOAT | NO | | 作業者稼働率 |
| throughput | FLOAT | NO | | スループット |
| cycle_time | FLOAT | NO | | サイクルタイム |
| metrics | JSONB | NO | | 詳細メトリクス |
| bottlenecks | JSONB | YES | | ボトルネック情報 |
| suggestions | JSONB | YES | | 改善提案 |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 作成時刻 |

```sql
CREATE TABLE simulation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
    total_time FLOAT NOT NULL,
    completed_tasks INT NOT NULL,
    worker_utilization FLOAT NOT NULL,
    throughput FLOAT NOT NULL,
    cycle_time FLOAT NOT NULL,
    metrics JSONB NOT NULL,
    bottlenecks JSONB,
    suggestions JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_simulation_results_simulation_id ON simulation_results(simulation_id);
```

### 3.3 tasks（タスクマスタ）
タスク定義のマスタテーブル（TasksTableに対応）

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|----------|------|------------|------|
| id | INT | NO | | 主キー（task_id） |
| name | VARCHAR(100) | NO | | タスク名 |
| task_type | VARCHAR(20) | NO | | タスクタイプ（main/transport） |
| tact_id | INT | NO | | タクトID（外部キー） |
| standard_time | FLOAT | NO | | 標準作業時間（秒） |
| next_task_id | INT | YES | | 次タスクID |
| parameters | JSONB | YES | | 追加パラメータ |
| is_active | BOOLEAN | NO | true | 有効フラグ |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 作成時刻 |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 更新時刻 |

```sql
CREATE TABLE tasks (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    task_type VARCHAR(20) NOT NULL CHECK (task_type IN ('main', 'transport')),
    tact_id INT NOT NULL,
    standard_time FLOAT NOT NULL,
    next_task_id INT REFERENCES tasks(id),
    parameters JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tasks_tact_id ON tasks(tact_id);
CREATE INDEX idx_tasks_type ON tasks(task_type);
```

### 3.4 tacts（タクトマスタ）
タクト（工程）定義のマスタテーブル（TmpTaskIdTableに対応）

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|----------|------|------------|------|
| id | INT | NO | | 主キー（tact_id） |
| name | VARCHAR(100) | NO | | タクト名 |
| capacity | INT | NO | 1 | 容量 |
| next_tact_id | INT | YES | | 次タクトID |
| task_queue_name | VARCHAR(100) | YES | | タスクキュー名 |
| description | TEXT | YES | | 説明 |
| position_x | FLOAT | YES | | X座標 |
| position_y | FLOAT | YES | | Y座標 |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 作成時刻 |

```sql
CREATE TABLE tacts (
    id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    capacity INT NOT NULL DEFAULT 1,
    next_tact_id INT REFERENCES tacts(id),
    task_queue_name VARCHAR(100),
    description TEXT,
    position_x FLOAT,
    position_y FLOAT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tacts_next_tact_id ON tacts(next_tact_id);
```

### 3.5 work_progress（工程進捗）
現在の工程進捗状態（WorksProgressTableBackupに対応）

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|----------|------|------------|------|
| id | UUID | NO | uuid_generate_v4() | 主キー |
| work_item_id | VARCHAR(100) | NO | | ワークアイテムID |
| progress_id | INT | NO | | 進捗ID |
| current_tact_id | INT | YES | | 現在タクトID |
| current_task_id | INT | YES | | 現在タスクID |
| status | VARCHAR(20) | NO | | 状態 |
| completion_percentage | FLOAT | NO | 0 | 完了率 |
| ar_marker_id | VARCHAR(100) | YES | | ARマーカーID |
| updated_by | VARCHAR(50) | NO | | 更新者 |
| updated_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 更新時刻 |

```sql
CREATE TABLE work_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_item_id VARCHAR(100) NOT NULL,
    progress_id INT NOT NULL,
    current_tact_id INT REFERENCES tacts(id),
    current_task_id INT REFERENCES tasks(id),
    status VARCHAR(20) NOT NULL,
    completion_percentage FLOAT NOT NULL DEFAULT 0,
    ar_marker_id VARCHAR(100),
    updated_by VARCHAR(50) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_work_progress_item_id ON work_progress(work_item_id);
CREATE INDEX idx_work_progress_status ON work_progress(status);
CREATE UNIQUE INDEX idx_work_progress_item_progress ON work_progress(work_item_id, progress_id);
```

### 3.6 work_progress_history（工程進捗履歴）
工程進捗の変更履歴

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|----------|------|------------|------|
| id | UUID | NO | uuid_generate_v4() | 主キー |
| work_progress_id | UUID | NO | | 工程進捗ID |
| work_item_id | VARCHAR(100) | NO | | ワークアイテムID |
| from_tact_id | INT | YES | | 変更前タクトID |
| to_tact_id | INT | YES | | 変更後タクトID |
| from_task_id | INT | YES | | 変更前タスクID |
| to_task_id | INT | YES | | 変更後タスクID |
| action | VARCHAR(50) | NO | | アクション |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 作成時刻 |

```sql
CREATE TABLE work_progress_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    work_progress_id UUID NOT NULL REFERENCES work_progress(id),
    work_item_id VARCHAR(100) NOT NULL,
    from_tact_id INT REFERENCES tacts(id),
    to_tact_id INT REFERENCES tacts(id),
    from_task_id INT REFERENCES tasks(id),
    to_task_id INT REFERENCES tasks(id),
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_work_progress_history_progress_id ON work_progress_history(work_progress_id);
CREATE INDEX idx_work_progress_history_created_at ON work_progress_history(created_at DESC);
```

### 3.7 task_queues（タスクキュー）
実行待ちタスクのキュー管理

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|----------|------|------------|------|
| id | UUID | NO | uuid_generate_v4() | 主キー |
| queue_name | VARCHAR(100) | NO | | キュー名 |
| simulation_id | UUID | YES | | シミュレーションID |
| tact_id | INT | NO | | タクトID |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 作成時刻 |

```sql
CREATE TABLE task_queues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_name VARCHAR(100) NOT NULL,
    simulation_id UUID REFERENCES simulations(id),
    tact_id INT NOT NULL REFERENCES tacts(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_queues_name ON task_queues(queue_name);
CREATE INDEX idx_task_queues_simulation_id ON task_queues(simulation_id);
```

### 3.8 task_queue_items（タスクキュー項目）
キュー内のタスク項目

| カラム名 | データ型 | NULL | デフォルト | 説明 |
|---------|----------|------|------------|------|
| id | UUID | NO | uuid_generate_v4() | 主キー |
| queue_id | UUID | NO | | キューID |
| task_id | INT | NO | | タスクID |
| priority | INT | NO | 0 | 優先度 |
| evaluation_value | FLOAT | YES | | 評価値 |
| status | VARCHAR(20) | NO | 'pending' | 状態 |
| created_at | TIMESTAMP | NO | CURRENT_TIMESTAMP | 作成時刻 |

```sql
CREATE TABLE task_queue_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID NOT NULL REFERENCES task_queues(id) ON DELETE CASCADE,
    task_id INT NOT NULL REFERENCES tasks(id),
    priority INT NOT NULL DEFAULT 0,
    evaluation_value FLOAT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_queue_items_queue_id ON task_queue_items(queue_id);
CREATE INDEX idx_task_queue_items_status ON task_queue_items(status);
CREATE INDEX idx_task_queue_items_priority ON task_queue_items(priority DESC);
```

## 4. ビューの定義

### 4.1 v_current_simulation_status
現在のシミュレーション状態を表示するビュー

```sql
CREATE VIEW v_current_simulation_status AS
SELECT 
    s.id,
    s.status,
    s.started_at,
    s.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(s.completed_at, CURRENT_TIMESTAMP) - s.started_at)) as duration_seconds,
    sr.completed_tasks,
    sr.worker_utilization,
    sr.throughput
FROM simulations s
LEFT JOIN simulation_results sr ON s.id = sr.simulation_id
ORDER BY s.created_at DESC;
```

### 4.2 v_task_execution_statistics
タスク実行統計ビュー

```sql
CREATE VIEW v_task_execution_statistics AS
SELECT 
    t.id as task_id,
    t.name as task_name,
    t.task_type,
    tact.name as tact_name,
    COUNT(te.id) as execution_count,
    AVG(te.actual_time) as avg_execution_time,
    MIN(te.actual_time) as min_execution_time,
    MAX(te.actual_time) as max_execution_time,
    t.standard_time,
    AVG(te.actual_time) - t.standard_time as avg_deviation
FROM tasks t
JOIN tacts tact ON t.tact_id = tact.id
LEFT JOIN task_executions te ON t.id = te.task_id
GROUP BY t.id, t.name, t.task_type, tact.name, t.standard_time;
```

## 5. ストアドプロシージャ/関数

### 5.1 シミュレーション結果保存関数
```sql
CREATE OR REPLACE FUNCTION save_simulation_result(
    p_simulation_id UUID,
    p_result_data JSONB
) RETURNS UUID AS $$
DECLARE
    v_result_id UUID;
BEGIN
    -- 結果を保存
    INSERT INTO simulation_results (
        simulation_id,
        total_time,
        completed_tasks,
        worker_utilization,
        throughput,
        cycle_time,
        metrics,
        bottlenecks,
        suggestions
    ) VALUES (
        p_simulation_id,
        (p_result_data->>'total_time')::FLOAT,
        (p_result_data->>'completed_tasks')::INT,
        (p_result_data->>'worker_utilization')::FLOAT,
        (p_result_data->>'throughput')::FLOAT,
        (p_result_data->>'cycle_time')::FLOAT,
        p_result_data->'metrics',
        p_result_data->'bottlenecks',
        p_result_data->'suggestions'
    ) RETURNING id INTO v_result_id;
    
    -- シミュレーション状態を更新
    UPDATE simulations 
    SET status = 'completed',
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_simulation_id;
    
    RETURN v_result_id;
END;
$$ LANGUAGE plpgsql;
```

### 5.2 タスク評価値計算関数
```sql
CREATE OR REPLACE FUNCTION calculate_task_evaluation(
    p_task_id INT,
    p_simulation_id UUID
) RETURNS FLOAT AS $$
DECLARE
    v_task_type VARCHAR(20);
    v_tact_id INT;
    v_next_task_id INT;
    v_next_tact_id INT;
    v_evaluation FLOAT;
BEGIN
    -- タスク情報取得
    SELECT task_type, tact_id, next_task_id
    INTO v_task_type, v_tact_id, v_next_task_id
    FROM tasks
    WHERE id = p_task_id;
    
    -- タスクタイプ別評価
    IF v_task_type = 'main' THEN
        -- 主作業タスクの評価
        -- 依存関係チェック
        IF EXISTS (
            SELECT 1 FROM task_dependencies td
            WHERE td.task_id = p_task_id
            AND NOT EXISTS (
                SELECT 1 FROM task_executions te
                WHERE te.task_id = td.depends_on_task_id
                AND te.simulation_id = p_simulation_id
                AND te.status = 'completed'
            )
        ) THEN
            v_evaluation := 0;
        ELSE
            v_evaluation := 1;
        END IF;
    ELSIF v_task_type = 'transport' THEN
        -- 運搬タスクの評価
        -- 次タクトの空き確認
        SELECT next_tact_id INTO v_next_tact_id
        FROM tacts WHERE id = v_tact_id;
        
        IF v_next_tact_id IS NOT NULL THEN
            IF EXISTS (
                SELECT 1 FROM tact_states
                WHERE tact_id = v_next_tact_id
                AND simulation_id = p_simulation_id
                AND state = 'occupied'
            ) THEN
                v_evaluation := 0;
            ELSE
                v_evaluation := 1;
            END IF;
        ELSE
            v_evaluation := 1; -- 最終タクト
        END IF;
    ELSE
        v_evaluation := 0;
    END IF;
    
    RETURN v_evaluation;
END;
$$ LANGUAGE plpgsql;
```

## 6. インデックス戦略

### 6.1 主要インデックス
```sql
-- パフォーマンス向上のための追加インデックス
CREATE INDEX idx_simulation_results_created_at ON simulation_results(created_at DESC);
CREATE INDEX idx_work_progress_updated_at ON work_progress(updated_at DESC);
CREATE INDEX idx_task_executions_simulation_task ON task_executions(simulation_id, task_id);
CREATE INDEX idx_tact_states_simulation_tact ON tact_states(simulation_id, tact_id);

-- 複合インデックス
CREATE INDEX idx_work_progress_item_tact_task ON work_progress(work_item_id, current_tact_id, current_task_id);
```

## 7. データ移行とシード

### 7.1 初期データ投入
```sql
-- タクトマスタ
INSERT INTO tacts (id, name, capacity, next_tact_id, task_queue_name) VALUES
(1, 'Tact A', 1, 2, 'TaskQueueA1'),
(2, 'Tact B', 1, 3, 'TaskQueueA2'),
(3, 'Tact C', 1, NULL, 'TaskQueueA3');

-- タスクマスタ
INSERT INTO tasks (id, name, task_type, tact_id, standard_time, next_task_id) VALUES
(1, 'A1Task1', 'main', 1, 30.0, 2),
(2, 'A1Task2', 'main', 1, 20.0, 3),
(3, 'A1Task3', 'transport', 1, 10.0, 4),
(4, 'A2Task1', 'main', 2, 25.0, 5),
(5, 'A2Task2', 'main', 2, 35.0, 6),
(6, 'A2Task3', 'transport', 2, 10.0, 7),
(7, 'A3Task1', 'main', 3, 40.0, 8),
(8, 'A3Task2', 'main', 3, 30.0, 9),
(9, 'A3Task3', 'transport', 3, 15.0, NULL);
```

## 8. バックアップとリストア

### 8.1 バックアップ戦略
```bash
# 日次バックアップスクリプト
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="simulation_db"
BACKUP_DIR="/backup/postgresql"

pg_dump -h localhost -U postgres -d $DB_NAME -f "$BACKUP_DIR/backup_$DATE.sql"

# 7日以上前のバックアップを削除
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

### 8.2 リストア手順
```bash
# リストアコマンド
psql -h localhost -U postgres -d simulation_db < backup_20250918_103000.sql
```

## 9. パフォーマンスチューニング

### 9.1 PostgreSQL設定推奨値
```ini
# postgresql.conf
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
```

### 9.2 接続プール設定
```python
# SQLAlchemy接続プール設定
DATABASE_URL = "postgresql://user:pass@localhost/simulation_db"

engine = create_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

## 10. 監視とメンテナンス

### 10.1 監視クエリ
```sql
-- テーブルサイズ確認
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 長時間実行クエリ確認
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

### 10.2 定期メンテナンス
```sql
-- 週次VACUUM ANALYZE
VACUUM ANALYZE simulations;
VACUUM ANALYZE simulation_results;
VACUUM ANALYZE work_progress;
VACUUM ANALYZE task_executions;

-- 月次REINDEX
REINDEX TABLE simulations;
REINDEX TABLE simulation_results;
```