import { Link } from 'react-router-dom'
import type { VehicleSummary } from '../types'
import KmUpdateInput from './KmUpdateInput'
import AlertBadge from './AlertBadge'

interface VehicleCardProps {
  summary: VehicleSummary
}

function getPhotoUrl(path?: string): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `/static/${path}`
}

function VehicleAvatar({ photoPath, name }: { photoPath?: string; name: string }) {
  const url = getPhotoUrl(photoPath)
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 flex-shrink-0"
      />
    )
  }
  return (
    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 border-2 border-slate-200">
      <span className="text-2xl">&#128663;</span>
    </div>
  )
}

export default function VehicleCard({ summary }: VehicleCardProps) {
  const { vehicle, overdue_count, upcoming_count, cost_ytd } = summary

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 hover:shadow-sm transition-all">
      <div className="flex items-start gap-4">
        <VehicleAvatar photoPath={vehicle.photo_path} name={vehicle.name} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <Link
                to={`/vehicles/${vehicle.id}`}
                className="text-slate-900 font-bold text-lg hover:text-accent transition-colors leading-tight"
              >
                {vehicle.name}
              </Link>
              <p className="text-slate-500 text-sm">
                {vehicle.make} {vehicle.model} &middot; {vehicle.year}
              </p>
              {vehicle.license_plate && (
                <p className="text-slate-400 text-xs font-mono mt-0.5">{vehicle.license_plate}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-accent font-semibold text-sm">
                {cost_ytd.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
              <p className="text-slate-400 text-xs">Kosten YTD</p>
            </div>
          </div>

          <div className="mt-3 flex items-center flex-wrap gap-3">
            <KmUpdateInput vehicleId={vehicle.id} currentKm={vehicle.current_km} />
            <AlertBadge overdue={overdue_count} upcoming={upcoming_count} />
          </div>

          {summary.next_service && (
            <div className="mt-2 text-xs text-slate-500">
              <span className="text-slate-400">Nächster Service: </span>
              <span className="text-slate-700">{summary.next_service.task_name}</span>
              {summary.next_service.due_date && (
                <span className="ml-1 text-slate-500">
                  &mdash;{' '}
                  {new Date(summary.next_service.due_date).toLocaleDateString('de-DE')}
                </span>
              )}
              {summary.next_service.due_km && (
                <span className="ml-1 font-mono text-slate-500">
                  / {summary.next_service.due_km.toLocaleString('de-DE')} km
                </span>
              )}
            </div>
          )}

          <div className="mt-3 flex gap-2">
            <Link
              to={`/vehicles/${vehicle.id}`}
              className="text-xs text-slate-500 hover:text-accent transition-colors"
            >
              Details &#8594;
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              to={`/services/new?vehicleId=${vehicle.id}`}
              className="text-xs text-slate-500 hover:text-accent transition-colors"
            >
              + Service
            </Link>
            <span className="text-slate-300">|</span>
            <Link
              to={`/vehicles/${vehicle.id}/plans`}
              className="text-xs text-slate-500 hover:text-accent transition-colors"
            >
              Wartungspläne
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
