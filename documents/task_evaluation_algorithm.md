# タスク実施可否判定アルゴリズム仕様書

## 1. 概要
本文書は、FlexSimにおける工場シミュレーションでタスクの実施可否を判定するアルゴリズムとFlexScriptの実装例を定義します。
鉄道車両のような大型ワークの製造工程を想定し、3つのタクトが直列に接続されたラインでの作業管理を行います。

## 2. システム構成

### 2.1 グローバルテーブル構成

#### TasksTable
タスクの基本定義を格納
| カラム名 | 型 | 説明 |
|---------|-----|------|
| task_id | int | タスクID |
| name | string | タスク名 |
| task_type | string | タスクタイプ（main/transport） |
| tact_id | int | 実行タクトID |
| next_task_id | int | 次タスクID |
| standard_time | double | 標準作業時間 |

#### TmpTaskIdTable  
実行待ちタスクキューを管理
| カラム名 | 型 | 説明 |
|---------|-----|------|
| tact_id | int | タクトID |
| name | string | タクト名 |
| task_queue | string | タスクキュー（TaskQueueA1等） |
| next_tact_id | int | 次タクトID |
| description | string | 説明 |

#### WorksProgressTableBackup
工程進捗状況を記録
| カラム名 | 型 | 説明 |
|---------|-----|------|
| item_id | int | アイテムID |
| progress_id | int | 進捗ID |
| current_tact_id | int | 現在タクトID |
| current_task_id | int | 現在タスクID |
| status | string | ステータス |
| updated_at | datetime | 更新時刻 |

## 3. タスク実施可否判定アルゴリズム

### 3.1 基本判定フロー

```
1. タスクリストから評価対象タスクを取得
2. タスクタイプを判定（main/transport）
3. 依存関係チェック
4. リソース利用可能性チェック
5. evaluation_value（評価値）を計算
6. 実行可能タスクを選択
```

### 3.2 評価値（evaluation_value）の算出

現時点では単純な2値評価：
- **1（実行可能）**: すべての条件を満たす
- **0（実行不可）**: いずれかの条件を満たさない

### 3.3 判定条件

#### 3.3.1 主作業タスク（task_type = "main"）
1. **前提タスク完了確認**
   - 同一ワークの前タスクが完了していること
   - current_task_idがnext_task_idと一致

2. **タクト利用可能確認**
   - 対象タクトにワークが配置されていること
   - タクトがビジー状態でないこと

#### 3.3.2 運搬タスク（task_type = "transport"）
1. **前工程完了確認**
   - 現タクトでの全作業が完了

2. **次タクト空き確認**
   - 次タクトが空いていること
   - 次タクトがワーク受入可能状態

3. **搬送経路確認**
   - 搬送経路が利用可能

## 4. FlexScript実装例

### 4.1 タスク評価関数

```c
// タスク実施可否判定関数
double evaluateTaskFeasibility(int taskId) {
    // グローバルテーブル参照
    Table tasksTable = Table("TasksTable");
    Table tmpTaskTable = Table("TmpTaskIdTable");
    Table progressTable = Table("WorksProgressTableBackup");
    
    // タスク情報取得
    int rowNum = findTaskRow(taskId);
    if (rowNum == 0) return 0;
    
    string taskType = tasksTable[rowNum]["task_type"];
    int tactId = tasksTable[rowNum]["tact_id"];
    int nextTaskId = tasksTable[rowNum]["next_task_id"];
    
    // タスクタイプ別判定
    if (taskType == "main") {
        return evaluateMainTask(taskId, tactId, nextTaskId);
    } else if (taskType == "transport") {
        return evaluateTransportTask(taskId, tactId);
    }
    
    return 0;
}

// 主作業タスク評価
double evaluateMainTask(int taskId, int tactId, int nextTaskId) {
    Table progressTable = Table("WorksProgressTableBackup");
    
    // 前提タスク完了確認
    for (int i = 1; i <= progressTable.numRows; i++) {
        if (progressTable[i]["current_tact_id"] == tactId) {
            // 前タスクが未完了の場合
            if (nextTaskId > 0 && progressTable[i]["current_task_id"] != nextTaskId - 1) {
                return 0;
            }
        }
    }
    
    // タクト利用可能確認
    Object tact = Model.find("Tact" + numtostring(tactId));
    if (!tact || tact.stats.state().value != STATE_IDLE) {
        return 0;
    }
    
    return 1;
}

// 運搬タスク評価
double evaluateTransportTask(int taskId, int tactId) {
    Table tmpTaskTable = Table("TmpTaskIdTable");
    
    // 現タクトの情報取得
    int tactRow = findTactRow(tactId);
    if (tactRow == 0) return 0;
    
    int nextTactId = tmpTaskTable[tactRow]["next_tact_id"];
    
    // 次タクトが存在しない場合
    if (nextTactId == 0) {
        return evaluateFinalTransport(taskId, tactId);
    }
    
    // 次タクト空き確認
    Object nextTact = Model.find("Tact" + numtostring(nextTactId));
    if (!nextTact) return 0;
    
    // 次タクトにワークが存在する場合は実行不可
    if (nextTact.subnodes.length > 0) {
        return 0;
    }
    
    // 現タクトの全作業完了確認
    if (!isAllTasksCompleted(tactId)) {
        return 0;
    }
    
    return 1;
}

// タクトの全タスク完了確認
int isAllTasksCompleted(int tactId) {
    Table tasksTable = Table("TasksTable");
    Table progressTable = Table("WorksProgressTableBackup");
    
    // 該当タクトの全タスクを確認
    for (int i = 1; i <= tasksTable.numRows; i++) {
        if (tasksTable[i]["tact_id"] == tactId && 
            tasksTable[i]["task_type"] == "main") {
            
            int taskId = tasksTable[i]["task_id"];
            // 未完了タスクが存在する場合
            if (!isTaskCompleted(taskId)) {
                return 0;
            }
        }
    }
    return 1;
}

// ヘルパー関数：タスク行検索
int findTaskRow(int taskId) {
    Table tasksTable = Table("TasksTable");
    for (int i = 1; i <= tasksTable.numRows; i++) {
        if (tasksTable[i]["task_id"] == taskId) {
            return i;
        }
    }
    return 0;
}

// ヘルパー関数：タクト行検索
int findTactRow(int tactId) {
    Table tmpTaskTable = Table("TmpTaskIdTable");
    for (int i = 1; i <= tmpTaskTable.numRows; i++) {
        if (tmpTaskTable[i]["tact_id"] == tactId) {
            return i;
        }
    }
    return 0;
}
```

### 4.2 タスク選択関数

```c
// 実行可能タスクの選択
int selectExecutableTask(Array taskList) {
    double maxEvaluation = 0;
    int selectedTask = 0;
    
    // 全タスクを評価
    for (int i = 1; i <= taskList.length; i++) {
        int taskId = taskList[i];
        double evaluation = evaluateTaskFeasibility(taskId);
        
        // 評価値が高いタスクを選択
        if (evaluation > maxEvaluation) {
            maxEvaluation = evaluation;
            selectedTask = taskId;
        }
    }
    
    return selectedTask;
}

// タスクキューからのタスク取得と実行
void processTaskQueue(Object operator) {
    Table tmpTaskTable = Table("TmpTaskIdTable");
    
    // オペレータが担当するタクトを特定
    int tactId = operator.tactId;
    int tactRow = findTactRow(tactId);
    
    if (tactRow == 0) return;
    
    // タスクキューを取得
    string queueName = tmpTaskTable[tactRow]["task_queue"];
    Array taskQueue = getTaskQueue(queueName);
    
    // 実行可能タスクを選択
    int taskId = selectExecutableTask(taskQueue);
    
    if (taskId > 0) {
        // タスクを実行
        executeTask(operator, taskId);
        // キューから削除
        removeFromQueue(queueName, taskId);
    }
}
```

### 4.3 タスク実行管理

```c
// タスク実行関数
void executeTask(Object operator, int taskId) {
    Table tasksTable = Table("TasksTable");
    int rowNum = findTaskRow(taskId);
    
    if (rowNum == 0) return;
    
    string taskType = tasksTable[rowNum]["task_type"];
    double standardTime = tasksTable[rowNum]["standard_time"];
    
    // タスクタイプに応じた処理
    if (taskType == "main") {
        executeMainTask(operator, taskId, standardTime);
    } else if (taskType == "transport") {
        executeTransportTask(operator, taskId, standardTime);
    }
    
    // 進捗テーブル更新
    updateProgress(taskId);
}

// 主作業タスク実行
void executeMainTask(Object operator, int taskId, double duration) {
    // オペレータをビジー状態に
    operator.stats.state().value = STATE_BUSY;
    
    // 作業時間待機
    await(duration);
    
    // タスク完了処理
    completeTask(taskId);
    
    // オペレータをアイドル状態に
    operator.stats.state().value = STATE_IDLE;
}

// 運搬タスク実行
void executeTransportTask(Object operator, int taskId, double duration) {
    Table tasksTable = Table("TasksTable");
    Table tmpTaskTable = Table("TmpTaskIdTable");
    
    int rowNum = findTaskRow(taskId);
    int tactId = tasksTable[rowNum]["tact_id"];
    int tactRow = findTactRow(tactId);
    int nextTactId = tmpTaskTable[tactRow]["next_tact_id"];
    
    // ワークを取得
    Object currentTact = Model.find("Tact" + numtostring(tactId));
    Object work = currentTact.first;
    
    if (!work) return;
    
    // 運搬処理
    Object nextTact = Model.find("Tact" + numtostring(nextTactId));
    moveobject(work, nextTact);
    
    // 運搬時間待機
    await(duration);
    
    // タスク完了処理
    completeTask(taskId);
}

// 進捗更新関数
void updateProgress(int taskId) {
    Table progressTable = Table("WorksProgressTableBackup");
    
    // 該当レコードを検索
    for (int i = 1; i <= progressTable.numRows; i++) {
        if (progressTable[i]["current_task_id"] == taskId) {
            // ステータスを完了に更新
            progressTable[i]["status"] = "completed";
            progressTable[i]["updated_at"] = Model.time;
            
            // 次タスクがある場合は更新
            Table tasksTable = Table("TasksTable");
            int rowNum = findTaskRow(taskId);
            int nextTaskId = tasksTable[rowNum]["next_task_id"];
            
            if (nextTaskId > 0) {
                progressTable[i]["current_task_id"] = nextTaskId;
                progressTable[i]["status"] = "waiting";
            }
            break;
        }
    }
}
```

## 5. 拡張性と今後の改善点

### 5.1 評価値の高度化
現在の2値評価（0/1）から、以下の要素を考慮した連続値評価への拡張：

- **優先度スコア**: タスクの重要度に基づく重み付け
- **待機時間**: タスクの待機時間による優先度調整
- **締切考慮**: 納期までの残時間による緊急度
- **作業者スキル**: 作業者の熟練度による効率性

### 5.2 並列タスク対応
- 複数作業者による同時作業
- タスク間の部分的依存関係の管理
- リソース競合の解決アルゴリズム

### 5.3 動的スケジューリング
- リアルタイムでの計画変更対応
- 異常発生時の再スケジューリング
- 学習による最適化

## 6. 実装上の注意事項

1. **グローバルテーブルの整合性**
   - テーブル間の参照整合性を保つ
   - 更新タイミングの同期

2. **パフォーマンス最適化**
   - 評価関数の呼び出し頻度の最適化
   - キャッシュの活用

3. **エラーハンドリング**
   - テーブル参照エラーの処理
   - 不正なタスクIDの検出

4. **デバッグ機能**
   - 評価値の詳細ログ出力
   - タスク実行履歴の記録

## 7. テスト項目

### 7.1 単体テスト
- 各評価関数の正常動作確認
- 境界値テスト
- 異常値テスト

### 7.2 結合テスト
- タスクフロー全体の動作確認
- 複数ワークの並行処理
- タクト間の連携動作

### 7.3 性能テスト
- 大量タスクでの処理速度
- メモリ使用量の確認
- 同時実行数の限界値

## 8. 参考資料

- CLAUDE.md: プロジェクト全体の前提と進め方
- FlexSimグローバルテーブル仕様書（20250918時点）
- 展示企画資料