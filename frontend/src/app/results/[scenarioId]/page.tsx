'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Button from '@/components/Button'
import type { ScenarioDetail, TaskLogWithDetails, GanttTask } from '@/types'

// タスクログをガントチャートタスクに変換
function convertTaskLogsToGanttTasks(logs: TaskLogWithDetails[]): GanttTask[] {
  const ganttTasks: GanttTask[] = []
  const taskMap = new Map<string, { start?: Date; work: TaskLogWithDetails }>()

  logs.forEach((log) => {
    const key = `${log.work_name}-${log.task_name}-${log.operator_name}`

    if (log.state === 'start') {
      taskMap.set(key, {
        start: parseTimestamp(log.time_stamp),
        work: log
      })
    } else if (log.state === 'end') {
      const entry = taskMap.get(key)
      if (entry && entry.start) {
        ganttTasks.push({
          id: `${log.task_log_id}`,
          workId: log.work_name,
          workName: log.work_name,
          taskName: log.task_name,
          operatorName: log.operator_name,
          startTime: entry.start,
          endTime: parseTimestamp(log.time_stamp)
        })
        taskMap.delete(key)
      }
    }
  })

  return ganttTasks
}

// タイムスタンプをパース (例: "2025-10-23_09:21:11")
function parseTimestamp(timestamp: string): Date {
  const [datePart, timePart] = timestamp.split('_')
  return new Date(`${datePart}T${timePart}`)
}

// 時間範囲を計算
function getTimeRange(tasks: GanttTask[]): { start: Date; end: Date; durationHours: number } {
  if (tasks.length === 0) {
    const now = new Date()
    return { start: now, end: now, durationHours: 0 }
  }

  const allTimes = tasks.flatMap(t => [t.startTime, t.endTime])
  const start = new Date(Math.min(...allTimes.map(t => t.getTime())))
  const end = new Date(Math.max(...allTimes.map(t => t.getTime())))
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

  return { start, end, durationHours }
}

// タスクの位置を計算
function getTaskPosition(task: GanttTask, timeRange: { start: Date; end: Date; durationHours: number }) {
  const totalMs = timeRange.end.getTime() - timeRange.start.getTime()
  const startMs = task.startTime.getTime() - timeRange.start.getTime()
  const durationMs = task.endTime.getTime() - task.startTime.getTime()

  const left = (startMs / totalMs) * 100
  const width = Math.max((durationMs / totalMs) * 100, 0.5) // 最小幅0.5%

  return { left: `${left}%`, width: `${width}%` }
}

// 作業ごとにタスクをグループ化
function groupTasksByWork(tasks: GanttTask[]): Record<string, GanttTask[]> {
  const grouped: Record<string, GanttTask[]> = {}

  tasks.forEach(task => {
    if (!grouped[task.workName]) {
      grouped[task.workName] = []
    }
    grouped[task.workName].push(task)
  })

  return grouped
}

// 時間軸のラベルを生成
function generateTimeLabels(timeRange: { start: Date; end: Date; durationHours: number }, count: number = 10): string[] {
  const labels: string[] = []
  const interval = timeRange.durationHours / count

  for (let i = 0; i <= count; i++) {
    const time = new Date(timeRange.start.getTime() + interval * i * 60 * 60 * 1000)
    labels.push(time.toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }))
  }

  return labels
}

export default function ScenarioDetailPage() {
  const router = useRouter()
  const params = useParams()
  const scenarioId = params?.scenarioId as string

  const [scenarioDetail, setScenarioDetail] = useState<ScenarioDetail | null>(null)
  const [selectedReplication, setSelectedReplication] = useState<number | null>(null)
  const [taskLogs, setTaskLogs] = useState<TaskLogWithDetails[]>([])
  const [ganttTasks, setGanttTasks] = useState<GanttTask[]>([])
  const [loading, setLoading] = useState(true)

  // シナリオ詳細を取得
  useEffect(() => {
    const fetchScenarioDetail = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/scenarios/${scenarioId}`)
        if (!response.ok) {
          throw new Error(`HTTPエラー: ${response.status}`)
        }
        const data: ScenarioDetail = await response.json()
        setScenarioDetail(data)

        // 最初のレプリケーションを自動選択
        if (data.replications.length > 0) {
          setSelectedReplication(data.replications[0].replication)
        }
      } catch (error) {
        console.error('シナリオ詳細の取得エラー:', error)
      } finally {
        setLoading(false)
      }
    }

    if (scenarioId) {
      fetchScenarioDetail()
    }
  }, [scenarioId])

  // タスクログを取得
  useEffect(() => {
    const fetchTaskLogs = async () => {
      if (!selectedReplication) return

      try {
        const response = await fetch(
          `http://localhost:8000/api/scenarios/${scenarioId}/replications/${selectedReplication}/task-logs`
        )
        if (!response.ok) {
          throw new Error(`HTTPエラー: ${response.status}`)
        }
        const data: TaskLogWithDetails[] = await response.json()
        setTaskLogs(data)

        // ガントチャート用のタスクに変換
        const tasks = convertTaskLogsToGanttTasks(data)
        setGanttTasks(tasks)
      } catch (error) {
        console.error('タスクログの取得エラー:', error)
      }
    }

    if (selectedReplication !== null) {
      fetchTaskLogs()
    }
  }, [scenarioId, selectedReplication])

  const handleBackToResults = () => {
    router.push('/results')
  }

  const containerStyles: React.CSSProperties = {
    padding: 'var(--spacing-xl)',
    maxWidth: '1400px',
    margin: '0 auto'
  }

  const headingStyles: React.CSSProperties = {
    fontSize: 'var(--font-size-2xl)',
    fontWeight: 'bold',
    color: 'var(--color-main)',
    marginBottom: 'var(--spacing-lg)',
  }

  const cardStyles: React.CSSProperties = {
    backgroundColor: 'var(--color-background)',
    border: '1px solid var(--color-gray-border)',
    borderRadius: 'var(--border-radius)',
    padding: 'var(--spacing-lg)',
    marginBottom: 'var(--spacing-xl)'
  }

  const selectStyles: React.CSSProperties = {
    padding: 'var(--spacing-sm) var(--spacing-md)',
    fontSize: 'var(--font-size-base)',
    border: '1px solid var(--color-gray-border)',
    borderRadius: 'var(--border-radius)',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    cursor: 'pointer',
    marginBottom: 'var(--spacing-lg)'
  }

  if (loading) {
    return (
      <div style={containerStyles}>
        <p>読み込み中...</p>
      </div>
    )
  }

  if (!scenarioDetail) {
    return (
      <div style={containerStyles}>
        <p>シナリオが見つかりません</p>
        <Button onClick={handleBackToResults} variant="secondary">結果一覧に戻る</Button>
      </div>
    )
  }

  const timeRange = getTimeRange(ganttTasks)
  const groupedTasks = groupTasksByWork(ganttTasks)
  const timeLabels = generateTimeLabels(timeRange)

  return (
    <div style={containerStyles}>
      <h1 style={headingStyles}>{scenarioDetail.scenario_name} - 作業計画</h1>

      <div style={cardStyles}>
        <h2 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-main)' }}>
          レプリケーション選択
        </h2>
        <select
          value={selectedReplication ?? ''}
          onChange={(e) => setSelectedReplication(Number(e.target.value))}
          style={selectStyles}
        >
          {scenarioDetail.replications.map((rep) => (
            <option key={rep.replication} value={rep.replication}>
              レプリケーション {rep.replication} (コスト: ¥{rep.total_labor_costs.toLocaleString()},
              納期遵守率: {(rep.ontime_delivery_rate * 100).toFixed(1)}%)
            </option>
          ))}
        </select>

        {ganttTasks.length > 0 ? (
          <div>
            <h3 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--color-main)' }}>
              ガントチャート
            </h3>

            {/* 時間軸 */}
            <div style={{ display: 'flex', borderBottom: '2px solid var(--color-gray-border)', paddingBottom: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
              <div style={{ width: '200px', flexShrink: 0 }}></div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
                {timeLabels.map((label, index) => (
                  <div key={index} style={{ fontSize: '10px' }}>{label}</div>
                ))}
              </div>
            </div>

            {/* タスク行 */}
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {Object.entries(groupedTasks).map(([workName, tasks]) => (
                <div key={workName} style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                  {/* 作業名 */}
                  <div style={{ width: '200px', flexShrink: 0, paddingRight: 'var(--spacing-md)' }}>
                    <div style={{ fontWeight: 'bold', fontSize: 'var(--font-size-sm)' }}>{workName}</div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text)', opacity: 0.7 }}>
                      {tasks.length}タスク
                    </div>
                  </div>

                  {/* タイムライン */}
                  <div style={{ flex: 1, position: 'relative', height: '50px', backgroundColor: 'var(--color-gray-light)', borderRadius: 'var(--border-radius)', border: '1px solid var(--color-gray-border)' }}>
                    {tasks.map((task) => {
                      const position = getTaskPosition(task, timeRange)
                      return (
                        <div
                          key={task.id}
                          style={{
                            position: 'absolute',
                            top: '5px',
                            bottom: '5px',
                            left: position.left,
                            width: position.width,
                            backgroundColor: 'var(--color-main)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 8px',
                            cursor: 'pointer',
                            opacity: 0.9
                          }}
                          title={`${task.taskName} - ${task.operatorName}\n${task.startTime.toLocaleString()} - ${task.endTime.toLocaleString()}`}
                        >
                          <div style={{ color: 'white', fontSize: '11px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {task.taskName}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--color-gray-border)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text)' }}>
              <p>総タスク数: {ganttTasks.length} | 作業期間: {timeRange.durationHours.toFixed(1)}時間</p>
            </div>
          </div>
        ) : (
          <p style={{ color: 'var(--color-text)', opacity: 0.7 }}>
            このレプリケーションにはタスクログがありません
          </p>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Button onClick={handleBackToResults} variant="secondary">
          結果一覧に戻る
        </Button>
      </div>
    </div>
  )
}
