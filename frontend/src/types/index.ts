export interface ScenarioResult {
  scenario_id: number
  scenario_name: string
  average_total_costs: number
  average_delivery_rate: number
}

export interface SimulationRequest {
  simulation_id?: string
  timestamp?: string
}

export interface SimulationResponse {
  status: 'pending' | 'running' | 'completed' | 'error'
  message?: string
  results?: ScenarioResult[]
}

export interface WebSocketMessage {
  type: 'simulation_started' | 'simulation_completed' | 'error'
  data?: any
  timestamp: string
}

export type TaskState = 'start' | 'end' | 'pause' | 'resume'

export interface ReplicationInfo {
  replication: number
  total_labor_costs: number
  ontime_delivery_rate: number
}

export interface ScenarioDetail {
  scenario_id: number
  scenario_name: string
  replications: ReplicationInfo[]
}

export interface TaskLogWithDetails {
  task_log_id: number
  scenario_id: number
  replication: number
  time_stamp: string
  task_name: string
  tact_name: string | null
  work_name: string
  operator_name: string
  state: TaskState
}

export interface GanttTask {
  id: string
  workId: string
  workName: string
  taskName: string
  operatorName: string
  startTime: Date
  endTime: Date
}