

# 
```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Clock, Train, Users } from "lucide-react"

type ViewMode = "worker" | "vehicle"

interface ManufacturingTask {
  id: string
  vehicleId: string
  vehicleType: 1 | 2 | 3
  processName: string
  workerName: string
  startDay: number
  startTime: string
  endDay: number
  endTime: string
  duration: number
}

const generateManufacturingTasks = (): ManufacturingTask[] => {
  const tasks: ManufacturingTask[] = []
  const processes = [
    { name: "フレーム溶接", taktHours: 18 }, // 2+ days
    { name: "車体塗装", taktHours: 14 }, // 1.5+ days
    { name: "内装組立", taktHours: 22 }, // 2+ days (crosses weekend)
    { name: "配線作業", taktHours: 16 }, // 1.5+ days
    { name: "機能検査", taktHours: 12 }, // 1+ days
    { name: "最終検査", taktHours: 8 }, // Less than 1 day
  ]

  const workers = [
    "溶接班A",
    "溶接班B",
    "塗装班A",
    "塗装班B",
    "組立班A",
    "組立班B",
    "配線班A",
    "配線班B",
    "検査班A",
    "検査班B",
    "品質管理班A",
    "品質管理班B",
  ]

  let currentDay = 0
  let currentHour = 8

  // Vehicle Type 1: 16 vehicles
  for (let vehicleNum = 1; vehicleNum <= 16; vehicleNum++) {
    processes.forEach((process, processIndex) => {
      const workerIndex = processIndex % workers.length
      const baseTaktHours = process.taktHours
      const variation = Math.floor(Math.random() * 4) - 2 // -2 to +2 hours variation
      const actualTaktHours = Math.max(baseTaktHours + variation, 4) // Minimum 4 hours

      const startDay = Math.floor(currentDay)
      const startHour = currentHour

      let remainingHours = actualTaktHours
      let endDay = startDay
      let endHour = startHour

      while (remainingHours > 0) {
        const hoursUntilEndOfDay = 19 - endHour
        const hoursToWork = Math.min(remainingHours, hoursUntilEndOfDay)

        endHour += hoursToWork
        remainingHours -= hoursToWork

        if (remainingHours > 0) {
          endDay += 1
          if (endDay % 7 === 5) endDay += 2 // Skip weekend
          endHour = 8
        }
      }

      tasks.push({
        id: `type1-${vehicleNum}-${processIndex}`,
        vehicleId: `N700S-${vehicleNum.toString().padStart(3, "0")}`,
        vehicleType: 1,
        processName: process.name,
        workerName: workers[workerIndex],
        startDay: startDay,
        startTime: `${startHour.toString().padStart(2, "0")}:00`,
        endDay: endDay,
        endTime: `${endHour.toString().padStart(2, "0")}:00`,
        duration: Math.ceil(actualTaktHours / 11), // Convert to days
      })

      currentDay = endDay
      currentHour = endHour

      // Small gap between processes (30 minutes)
      currentHour += 0.5
      if (currentHour >= 19) {
        currentDay += 1
        if (currentDay % 7 === 5) currentDay += 2 // Skip weekend
        currentHour = 8
      }
    })
  }

  for (let vehicleNum = 1; vehicleNum <= 8; vehicleNum++) {
    processes.forEach((process, processIndex) => {
      const workerIndex = (processIndex + 4) % workers.length
      const baseTaktHours = process.taktHours
      const variation = Math.floor(Math.random() * 3) - 1
      const actualTaktHours = Math.max(baseTaktHours + variation, 4)

      const startDay = Math.floor(currentDay)
      const startHour = currentHour

      let remainingHours = actualTaktHours
      let endDay = startDay
      let endHour = startHour

      while (remainingHours > 0) {
        const hoursUntilEndOfDay = 19 - endHour
        const hoursToWork = Math.min(remainingHours, hoursUntilEndOfDay)

        endHour += hoursToWork
        remainingHours -= hoursToWork

        if (remainingHours > 0) {
          endDay += 1
          if (endDay % 7 === 5) endDay += 2
          endHour = 8
        }
      }

      tasks.push({
        id: `type2-${vehicleNum}-${processIndex}`,
        vehicleId: `E5系-${vehicleNum.toString().padStart(3, "0")}`,
        vehicleType: 2,
        processName: process.name,
        workerName: workers[workerIndex],
        startDay: startDay,
        startTime: `${startHour.toString().padStart(2, "0")}:00`,
        endDay: endDay,
        endTime: `${endHour.toString().padStart(2, "0")}:00`,
        duration: Math.ceil(actualTaktHours / 11),
      })

      currentDay = endDay
      currentHour = endHour + 0.5
      if (currentHour >= 19) {
        currentDay += 1
        if (currentDay % 7 === 5) currentDay += 2
        currentHour = 8
      }
    })
  }

  // Vehicle Type 3: 8 vehicles
  for (let vehicleNum = 1; vehicleNum <= 8; vehicleNum++) {
    processes.forEach((process, processIndex) => {
      const workerIndex = (processIndex + 8) % workers.length
      const baseTaktHours = process.taktHours
      const variation = Math.floor(Math.random() * 3) - 1
      const actualTaktHours = Math.max(baseTaktHours + variation, 4)

      const startDay = Math.floor(currentDay)
      const startHour = currentHour

      let remainingHours = actualTaktHours
      let endDay = startDay
      let endHour = startHour

      while (remainingHours > 0) {
        const hoursUntilEndOfDay = 19 - endHour
        const hoursToWork = Math.min(remainingHours, hoursUntilEndOfDay)

        endHour += hoursToWork
        remainingHours -= hoursToWork

        if (remainingHours > 0) {
          endDay += 1
          if (endDay % 7 === 5) endDay += 2
          endHour = 8
        }
      }

      tasks.push({
        id: `type3-${vehicleNum}-${processIndex}`,
        vehicleId: `E6系-${vehicleNum.toString().padStart(3, "0")}`,
        vehicleType: 3,
        processName: process.name,
        workerName: workers[workerIndex],
        startDay: startDay,
        startTime: `${startHour.toString().padStart(2, "0")}:00`,
        endDay: endDay,
        endTime: `${endHour.toString().padStart(2, "0")}:00`,
        duration: Math.ceil(actualTaktHours / 11),
      })

      currentDay = endDay
      currentHour = endHour + 0.5
      if (currentHour >= 19) {
        currentDay += 1
        if (currentDay % 7 === 5) currentDay += 2
        currentHour = 8
      }
    })
  }

  return tasks
}

const mockTasks = generateManufacturingTasks()

const weekDays = ["月", "火", "水", "木", "金", "土", "日", "月+", "火+", "水+"]

const getVehicleTypeColor = (vehicleType: 1 | 2 | 3) => {
  switch (vehicleType) {
    case 1:
      return "bg-[var(--color-vehicle-type-1)]"
    case 2:
      return "bg-[var(--color-vehicle-type-2)]"
    case 3:
      return "bg-[var(--color-vehicle-type-3)]"
  }
}

const getTaskPosition = (task: ManufacturingTask) => {
  const totalSlots = 10 * 11 // 10 days × 11 hours per day
  const startSlot = Math.min(task.startDay * 11 + (Number.parseInt(task.startTime.split(":")[0]) - 8), totalSlots - 1)
  const endSlot = Math.min(task.endDay * 11 + (Number.parseInt(task.endTime.split(":")[0]) - 8), totalSlots)
  const left = (startSlot / totalSlots) * 100
  const width = Math.max(((endSlot - startSlot) / totalSlots) * 100, 1) // Minimum 1% width
  return { left: `${left}%`, width: `${width}%` }
}

const groupedTasks = mockTasks.reduce(
  (acc, task) => {
    if (!acc[task.workerName]) acc[task.workerName] = []
    acc[task.workerName].push(task)
    return acc
  },
  {} as Record<string, ManufacturingTask[]>,
)

export default function GanttChart() {
  const [viewMode, setViewMode] = useState<ViewMode>("worker")
  const [selectedWeek, setSelectedWeek] = useState("2024-01-15")

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="w-8 h-8 bg-[var(--color-gold)] rounded-full flex items-center justify-center">
                <Train className="w-5 h-5 text-[var(--color-gold-foreground)]" />
              </div>
              鉄道車両製造スケジュール
            </h1>
            <p className="text-muted-foreground mt-1">シーケンシャル製造ライン - 32両編成管理</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedWeek} onValueChange={setSelectedWeek}>
              <SelectTrigger className="w-48">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024-01-15">2024年1月15日週</SelectItem>
                <SelectItem value="2024-01-22">2024年1月22日週</SelectItem>
                <SelectItem value="2024-01-29">2024年1月29日週</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "worker" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("worker")}
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                作業者別
              </Button>
              <Button
                variant={viewMode === "vehicle" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("vehicle")}
                className="flex items-center gap-2"
              >
                <Train className="w-4 h-4" />
                車両別
              </Button>
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {viewMode === "worker" ? "作業者別製造スケジュール" : "車両別製造スケジュール"}
              <div className="ml-auto flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[var(--color-vehicle-type-1)] rounded-sm"></div>
                  <span>N700S系 (16両)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[var(--color-vehicle-type-2)] rounded-sm"></div>
                  <span>E5系 (8両)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[var(--color-vehicle-type-3)] rounded-sm"></div>
                  <span>E6系 (8両)</span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex border-b border-border pb-2 mb-4">
              <div className="w-48 flex-shrink-0"></div>
              <div className="flex-1 flex">
                {weekDays.map((day, dayIndex) => (
                  <div key={day} className="flex-1">
                    <div className="text-center text-sm font-bold text-foreground mb-2 border-r border-border/50 last:border-r-0">
                      {day}曜日
                    </div>
                    <div className="flex">
                      {Array.from({ length: 11 }, (_, i) => i + 8).map((hour) => (
                        <div
                          key={`${dayIndex}-${hour}`}
                          className="flex-1 text-center text-xs text-muted-foreground border-r border-border/30 last:border-r-0"
                        >
                          {hour}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1 max-h-[600px] overflow-y-auto">
              {Object.entries(groupedTasks).map(([groupKey, tasks]) => {
                const firstTask = tasks[0]
                return (
                  <div key={groupKey} className="flex items-center">
                    {/* Row Label */}
                    <div className="w-48 flex-shrink-0 pr-4">
                      <div className="font-medium text-foreground text-sm flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-sm ${getVehicleTypeColor(firstTask.vehicleType)}`}></div>
                        {groupKey}
                      </div>
                      <div className="text-xs text-muted-foreground">{tasks.length}工程</div>
                    </div>

                    {/* Timeline */}
                    <div className="flex-1 relative h-12 bg-muted/30 rounded-md border border-border">
                      {weekDays.map((_, dayIndex) => (
                        <div key={dayIndex}>
                          {/* Day separator */}
                          <div
                            className="absolute top-0 bottom-0 w-px bg-border"
                            style={{ left: `${(dayIndex / 10) * 100}%` }}
                          />
                          {/* Hour lines within each day */}
                          {Array.from({ length: 11 }, (_, i) => i + 8)
                            .slice(1)
                            .map((hour) => (
                              <div
                                key={`${dayIndex}-${hour}`}
                                className="absolute top-0 bottom-0 w-px bg-border/30"
                                style={{ left: `${((dayIndex * 11 + (hour - 8)) / 110) * 100}%` }}
                              />
                            ))}
                        </div>
                      ))}

                      {/* Task Bars */}
                      {tasks.map((task) => {
                        const position = getTaskPosition(task)
                        const colorClass = getVehicleTypeColor(task.vehicleType)

                        return (
                          <div
                            key={task.id}
                            className={`absolute top-1 bottom-1 ${colorClass} rounded-sm border border-white/20 flex items-center px-2 cursor-pointer hover:opacity-80 transition-opacity`}
                            style={position}
                            title={`${task.processName} - ${task.vehicleId} (${task.startDay < 7 ? weekDays[task.startDay] : "週末"} ${task.startTime} - ${task.endDay < 7 ? weekDays[task.endDay] : "週末"} ${task.endTime})`}
                          >
                            <div className="text-xs text-white font-medium truncate">
                              {viewMode === "worker" ? task.vehicleId : task.processName}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[var(--color-gold)] rounded-sm"></div>
                    <span>シーケンシャル製造ライン</span>
                  </div>
                  <div className="text-muted-foreground">6工程 × 32両 = 192タスク</div>
                </div>
                <div className="text-sm text-muted-foreground">
                  総車両数: 32両 | 就業時間: 8:00-19:00 | 週末スキップ
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

```