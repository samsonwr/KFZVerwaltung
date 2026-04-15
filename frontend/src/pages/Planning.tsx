import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { UpcomingService } from '../types'

function getPhotoUrl(path?: string): string | null {
  if (!path) return null
  return path.startsWith('http') ? path : `/static/${path}`
}

function UrgencyBadge({ item }: { item: UpcomingService }) {
  if (item.is_overdue) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-danger/10 text-danger border border-danger/40">
        &#9888; ÜBERFÄLLIG
      </span>
    )
  }

  const daysSoon = item.urgency_days !== undefined && item.urgency_days <= 14
  const kmSoon = item.urgency_km !== undefined && item.urgency_km <= 500

  if (daysSoon || kmSoon) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-accent/10 text-amber-700 border border-accent/40">
        &#9650; BALD FÄLLIG
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-300">
      &#10003; OK
    </span>
  )
}

function sortItems(items: UpcomingService[]): UpcomingService[] {
  return [...items].sort((a, b) => {
    if (a.is_overdue && !b.is_overdue) return -1
    if (!a.is_overdue && b.is_overdue) return 1

    const aUrgency = Math.min(
      a.urgency_days !== undefined ? a.urgency_days : Infinity,
      a.urgency_km !== undefined ? a.urgency_km / 100 : Infinity
    )
    const bUrgency = Math.min(
      b.urgency_days !== undefined ? b.urgency_days : Infinity,
      b.urgency_km !== undefined ? b.urgency_km / 100 : Infinity
    )
    return aUrgency - bUrgency
  })
}

export default function Planning() {
  const qc = useQueryClient()
  const [vehicleFilter, setVehicleFilter] = useState<string>('all')
  const [actionError, setActionError] = useState('')

  const { data: items = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['planning', 'upcoming'],
    queryFn: () => api.planning.getUpcoming(60, 1000),
    staleTime: 30_000,
  })

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: number
      status: 'done' | 'skipped'
    }) => api.planning.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['planning'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e: unknown) => {
      setActionError(e instanceof Error ? e.message : 'Fehler beim Aktualisieren')
    },
  })

  // Extract unique vehicles for filter
  const vehicles = Array.from(
    new Map(items.map((i) => [i.vehicle_id, i.vehicle_name])).entries()
  )

  const filtered =
    vehicleFilter === 'all'
      ? items
      : items.filter((i) => String(i.vehicle_id) === vehicleFilter)

  const sorted = sortItems(filtered)
  const overdueCount = items.filter((i) => i.is_overdue).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Serviceplanung</h1>
          <p className="text-slate-500 text-sm">
            Nächste 60 Tage &middot; bis 1.000 km Puffer
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {vehicles.length > 1 && (
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="form-input py-2 text-sm"
            >
              <option value="all">Alle Fahrzeuge</option>
              {vehicles.map(([id, name]) => (
                <option key={id} value={String(id)}>
                  {name}
                </option>
              ))}
            </select>
          )}
          <button onClick={() => refetch()} className="btn-secondary text-sm" title="Aktualisieren">
            &#8635;
          </button>
        </div>
      </div>

      {overdueCount > 0 && (
        <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">&#9888;</span>
          <p className="font-bold">
            {overdueCount} überfällige{overdueCount > 1 ? '' : 'r'} Service – sofortiger Handlungsbedarf!
          </p>
        </div>
      )}

      {actionError && (
        <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-3 mb-4 text-sm">
          {actionError}
          <button onClick={() => setActionError('')} className="ml-2 text-danger/60 hover:text-danger">&#215;</button>
        </div>
      )}

      {isError && (
        <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-4 mb-4">
          Fehler beim Laden der Planungsdaten.
        </div>
      )}

      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">&#9989;</div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Alles im grünen Bereich</h2>
          <p className="text-slate-500">
            Keine anstehenden Services in den nächsten 60 Tagen oder 1.000 km.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {sorted.map((item) => {
          const photoUrl = getPhotoUrl(item.vehicle_photo_path)
          const borderColor = item.is_overdue
            ? 'border-danger/40 hover:border-danger/60'
            : item.urgency_days !== undefined && item.urgency_days <= 14
            ? 'border-accent/40 hover:border-accent/60'
            : 'border-slate-200 hover:border-slate-300'
          const bgColor = item.is_overdue
            ? 'bg-danger/5'
            : 'bg-white'

          return (
            <div
              key={item.planned_service_id}
              className={`${bgColor} border ${borderColor} rounded-xl p-4 transition-colors`}
            >
              <div className="flex items-start gap-4">
                {/* Vehicle avatar */}
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={item.vehicle_name}
                    className="w-12 h-12 rounded-full object-cover border border-slate-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
                    <span className="text-xl">&#128663;</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start flex-wrap gap-2 mb-1">
                    <Link
                      to={`/vehicles/${item.vehicle_id}`}
                      className="text-slate-700 hover:text-accent text-sm font-medium transition-colors"
                    >
                      {item.vehicle_name}
                    </Link>
                    <UrgencyBadge item={item} />
                  </div>

                  <p className="text-slate-900 font-semibold">{item.task_name}</p>

                  <div className="flex flex-wrap gap-4 mt-1 text-xs text-slate-500">
                    {item.due_date && (
                      <span>
                        &#128197;{' '}
                        <span className={item.is_overdue ? 'text-danger' : 'text-slate-700'}>
                          {new Date(item.due_date).toLocaleDateString('de-DE')}
                        </span>
                        {item.urgency_days !== undefined && (
                          <span className="ml-1 text-slate-400">
                            ({item.urgency_days > 0 ? `in ${item.urgency_days} Tagen` : `${Math.abs(item.urgency_days)} Tage überfällig`})
                          </span>
                        )}
                      </span>
                    )}
                    {item.due_km && (
                      <span>
                        &#128207;{' '}
                        <span className="font-mono text-slate-700">
                          {item.due_km.toLocaleString('de-DE')} km
                        </span>
                        {item.urgency_km !== undefined && (
                          <span className="ml-1 text-slate-400">
                            ({item.urgency_km > 0 ? `noch ${item.urgency_km.toLocaleString('de-DE')} km` : `${Math.abs(item.urgency_km).toLocaleString('de-DE')} km überfällig`})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() =>
                      statusMutation.mutate({
                        id: item.planned_service_id,
                        status: 'done',
                      })
                    }
                    disabled={statusMutation.isPending}
                    className="bg-green-50 hover:bg-green-100 text-green-700 border border-green-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    title="Als erledigt markieren"
                  >
                    &#10003; Erledigt
                  </button>
                  <button
                    onClick={() =>
                      statusMutation.mutate({
                        id: item.planned_service_id,
                        status: 'skipped',
                      })
                    }
                    disabled={statusMutation.isPending}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    title="Überspringen"
                  >
                    &#8594; Überspringen
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
