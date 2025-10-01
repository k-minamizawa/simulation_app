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