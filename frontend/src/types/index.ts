export interface Vehicle {
  id: number
  name: string
  make: string
  model: string
  year: number
  vin?: string
  license_plate?: string
  current_km: number
  photo_path?: string
  registration_doc_path?: string
  // Zusätzliche Felder
  key_number?: string
  fuel_type?: string
  engine_oil_type?: string
  engine_oil_capacity?: number
  gearbox_oil_type?: string
  gearbox_oil_capacity?: number
  coolant_type?: string
  coolant_capacity?: number
  brake_fluid_type?: string
  tire_size_summer?: string
  tire_size_winter?: string
  next_inspection_date?: string
}

export interface MaintenancePlan {
  id: number
  vehicle_id: number
  task_name: string
  interval_km?: number
  interval_days?: number
  last_done_km?: number
  last_done_date?: string // ISO date string
  notes?: string
}

export interface PartUsed {
  name: string
  cost: number
}

export interface ServiceRecord {
  id: number
  vehicle_id: number
  date: string // ISO date string
  km_at_service: number
  tasks: string[]
  parts_used: PartUsed[]
  total_cost: number
  notes?: string
  photos: string[]
}

export interface PlannedService {
  id: number
  vehicle_id: number
  maintenance_plan_id?: number
  due_date?: string
  due_km?: number
  status: 'pending' | 'done' | 'skipped'
}

export interface UpcomingService {
  planned_service_id: number
  vehicle_id: number
  vehicle_name: string
  task_name: string
  due_date?: string
  due_km?: number
  urgency_days?: number
  urgency_km?: number
  is_overdue: boolean
  vehicle_photo_path?: string
}

export interface VehicleSummary {
  vehicle: Vehicle
  next_service?: UpcomingService
  overdue_count: number
  upcoming_count: number
  cost_ytd: number
}

export interface KmHistoryEntry {
  id: number
  vehicle_id: number
  km: number
  reported_at: string // ISO datetime
  note?: string
}

export interface DashboardSummary {
  vehicles: VehicleSummary[]
  total_overdue: number
}
