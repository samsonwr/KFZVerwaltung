import axios from 'axios'
import type {
  Vehicle,
  MaintenancePlan,
  ServiceRecord,
  PlannedService,
  UpcomingService,
  DashboardSummary,
} from '../types'

const http = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// ── Vehicles ────────────────────────────────────────────────────────────────

export const vehicles = {
  getAll: () => http.get<Vehicle[]>('/vehicles').then((r) => r.data),

  getById: (id: number) =>
    http.get<Vehicle>(`/vehicles/${id}`).then((r) => r.data),

  create: (data: Omit<Vehicle, 'id'>) =>
    http.post<Vehicle>('/vehicles', data).then((r) => r.data),

  update: (id: number, data: Partial<Omit<Vehicle, 'id'>>) =>
    http.put<Vehicle>(`/vehicles/${id}`, data).then((r) => r.data),

  delete: (id: number) => http.delete(`/vehicles/${id}`),

  updateKm: (id: number, km: number) =>
    http.post<Vehicle>(`/vehicles/${id}/km`, { km }).then((r) => r.data),

  uploadPhoto: (id: number, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return http
      .post<{ photo_path: string }>(`/vehicles/${id}/photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}

// ── Maintenance Plans ────────────────────────────────────────────────────────

export const maintenancePlans = {
  getByVehicle: (vehicleId: number) =>
    http
      .get<MaintenancePlan[]>(`/vehicles/${vehicleId}/maintenance-plans`)
      .then((r) => r.data),

  create: (vehicleId: number, data: Omit<MaintenancePlan, 'id' | 'vehicle_id'>) =>
    http
      .post<MaintenancePlan>(`/vehicles/${vehicleId}/maintenance-plans`, data)
      .then((r) => r.data),

  update: (
    vehicleId: number,
    planId: number,
    data: Partial<Omit<MaintenancePlan, 'id' | 'vehicle_id'>>
  ) =>
    http
      .put<MaintenancePlan>(`/vehicles/${vehicleId}/maintenance-plans/${planId}`, data)
      .then((r) => r.data),

  delete: (vehicleId: number, planId: number) =>
    http.delete(`/vehicles/${vehicleId}/maintenance-plans/${planId}`),
}

// ── Services ─────────────────────────────────────────────────────────────────

export const services = {
  getAll: (vehicleId?: number) => {
    const params = vehicleId !== undefined ? { vehicle_id: vehicleId } : {}
    return http.get<ServiceRecord[]>('/services', { params }).then((r) => r.data)
  },

  getById: (id: number) =>
    http.get<ServiceRecord>(`/services/${id}`).then((r) => r.data),

  create: (data: Omit<ServiceRecord, 'id' | 'photos'>) =>
    http.post<ServiceRecord>('/services', data).then((r) => r.data),

  update: (id: number, data: Partial<Omit<ServiceRecord, 'id' | 'photos'>>) =>
    http.put<ServiceRecord>(`/services/${id}`, data).then((r) => r.data),

  delete: (id: number) => http.delete(`/services/${id}`),

  uploadPhotos: (id: number, files: File[]) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('photos', f))
    return http
      .post<{ photos: string[] }>(`/services/${id}/photos`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  getPhotos: (id: number) =>
    http.get<{ photos: string[] }>(`/services/${id}/photos`).then((r) => r.data.photos),

  deletePhoto: (id: number, filename: string) =>
    http.delete(`/services/${id}/photos/${encodeURIComponent(filename)}`),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboard = {
  getSummary: () =>
    http.get<DashboardSummary>('/dashboard/summary').then((r) => r.data),
}

// ── Planning ──────────────────────────────────────────────────────────────────

export const planning = {
  getUpcoming: (days = 60, kmThreshold = 1000) =>
    http
      .get<UpcomingService[]>('/planning/upcoming', {
        params: { days, km_threshold: kmThreshold },
      })
      .then((r) => r.data),

  updateStatus: (plannedServiceId: number, status: PlannedService['status']) =>
    http
      .patch<PlannedService>(`/planning/${plannedServiceId}/status`, { status })
      .then((r) => r.data),
}

// ── Push Notifications ────────────────────────────────────────────────────────

export const push = {
  subscribe: (subscription: PushSubscriptionJSON) =>
    http.post('/push/subscribe', subscription).then((r) => r.data),
}

// ── Export ────────────────────────────────────────────────────────────────────

export const exportApi = {
  getVehiclePdfUrl: (id: number) => `/api/v1/export/vehicles/${id}/pdf`,
  getDashboardPdfUrl: () => `/api/v1/export/dashboard/pdf`,
}

const api = { vehicles, maintenancePlans, services, dashboard, planning, push, export: exportApi }
export default api
