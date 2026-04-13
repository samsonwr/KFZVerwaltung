import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import KmUpdateInput from '../components/KmUpdateInput'
import AlertBadge from '../components/AlertBadge'

type Tab = 'history' | 'plans'

export default function VehicleDetail() {
  const { vehicleId } = useParams<{ vehicleId: string }>()
  const id = Number(vehicleId)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('history')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data: vehicle, isLoading: vLoading, isError: vError } = useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => api.vehicles.getById(id),
    enabled: !isNaN(id),
  })

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.dashboard.getSummary,
    staleTime: 30_000,
  })

  const vehicleSummary = dashboardData?.vehicles.find((v) => v.vehicle.id === id)

  const { data: services = [], isLoading: sLoading } = useQuery({
    queryKey: ['services', id],
    queryFn: () => api.services.getAll(id),
    enabled: !isNaN(id) && tab === 'history',
  })

  const { data: plans = [], isLoading: pLoading } = useQuery({
    queryKey: ['plans', id],
    queryFn: () => api.maintenancePlans.getByVehicle(id),
    enabled: !isNaN(id) && tab === 'plans',
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.vehicles.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      navigate('/vehicles')
    },
  })

  function getPhotoUrl(path?: string) {
    if (!path) return null
    return path.startsWith('http') ? path : `/static/${path}`
  }

  if (vLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-card rounded w-1/3" />
        <div className="h-48 bg-card rounded-xl" />
      </div>
    )
  }

  if (vError || !vehicle) {
    return (
      <div className="text-center py-16">
        <p className="text-danger text-lg mb-4">Fahrzeug nicht gefunden.</p>
        <Link to="/vehicles" className="btn-secondary">Zurück zur Übersicht</Link>
      </div>
    )
  }

  const photoUrl = getPhotoUrl(vehicle.photo_path)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/vehicles" className="text-slate-400 hover:text-slate-100 transition-colors">
          &#8592;
        </Link>
        <h1 className="text-2xl font-bold text-slate-100">{vehicle.name}</h1>
      </div>

      {/* Vehicle Info Card */}
      <div className="bg-card border border-slate-700 rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={vehicle.name}
              className="w-full sm:w-48 h-36 sm:h-36 object-cover rounded-lg border border-slate-700"
            />
          ) : (
            <div className="w-full sm:w-48 h-36 bg-slate-700 rounded-lg flex items-center justify-center border border-slate-600">
              <span className="text-5xl">&#128663;</span>
            </div>
          )}

          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide">Marke</p>
              <p className="text-slate-100 font-medium">{vehicle.make}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide">Modell</p>
              <p className="text-slate-100 font-medium">{vehicle.model}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide">Baujahr</p>
              <p className="text-slate-100 font-medium">{vehicle.year}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide">Kilometerstand</p>
              <KmUpdateInput vehicleId={vehicle.id} currentKm={vehicle.current_km} />
            </div>
            {vehicle.license_plate && (
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide">Kennzeichen</p>
                <p className="text-slate-100 font-mono">{vehicle.license_plate}</p>
              </div>
            )}
            {vehicle.vin && (
              <div className="col-span-2 md:col-span-1">
                <p className="text-slate-500 text-xs uppercase tracking-wide">VIN</p>
                <p className="text-slate-100 font-mono text-sm break-all">{vehicle.vin}</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-700 pt-4">
          <AlertBadge
            overdue={vehicleSummary?.overdue_count ?? 0}
            upcoming={vehicleSummary?.upcoming_count ?? 0}
          />
          <div className="flex gap-2 ml-auto">
            <Link to={`/services/new?vehicleId=${vehicle.id}`} className="btn-accent text-sm">
              + Neuer Service
            </Link>
            <Link to={`/vehicles/${vehicle.id}/plans`} className="btn-secondary text-sm">
              Wartungspläne
            </Link>
            <a
              href={api.export.getVehiclePdfUrl(vehicle.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-sm"
            >
              &#128196; PDF
            </a>
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn-danger text-sm"
            >
              &#128465;
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-card border border-slate-700 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'history'
              ? 'bg-accent/20 text-accent border border-accent/30'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          Service-Historie
        </button>
        <button
          onClick={() => setTab('plans')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'plans'
              ? 'bg-accent/20 text-accent border border-accent/30'
              : 'text-slate-400 hover:text-slate-100'
          }`}
        >
          Wartungspläne
        </button>
      </div>

      {/* Service History Tab */}
      {tab === 'history' && (
        <div>
          {sLoading && (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map(i => <div key={i} className="h-20 bg-card rounded-xl border border-slate-700" />)}
            </div>
          )}
          {!sLoading && services.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">&#128295;</div>
              <p className="text-slate-400 mb-4">Noch keine Service-Einträge.</p>
              <Link to={`/services/new?vehicleId=${vehicle.id}`} className="btn-accent">
                + Ersten Service erfassen
              </Link>
            </div>
          )}
          {services.length > 0 && (
            <div className="space-y-3">
              {[...services]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((s) => (
                  <Link
                    key={s.id}
                    to={`/services/${s.id}`}
                    className="block bg-card border border-slate-700 hover:border-slate-600 rounded-xl p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-slate-100 font-medium">
                            {new Date(s.date).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="font-mono text-accent text-sm">
                            {s.km_at_service.toLocaleString('de-DE')} km
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {s.tasks.map((t, i) => (
                            <span
                              key={i}
                              className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        {s.notes && (
                          <p className="text-slate-500 text-sm mt-1 line-clamp-1">{s.notes}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-accent font-semibold">
                          {s.total_cost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </p>
                        {s.photos.length > 0 && (
                          <p className="text-slate-500 text-xs mt-1">
                            &#128247; {s.photos.length}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Plans Tab */}
      {tab === 'plans' && (
        <div>
          {pLoading && (
            <div className="space-y-2 animate-pulse">
              {[1, 2].map(i => <div key={i} className="h-16 bg-card rounded-xl border border-slate-700" />)}
            </div>
          )}
          {!pLoading && plans.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">&#128197;</div>
              <p className="text-slate-400 mb-4">Noch keine Wartungspläne.</p>
              <Link to={`/vehicles/${vehicle.id}/plans`} className="btn-accent">
                + Wartungsplan anlegen
              </Link>
            </div>
          )}
          {plans.length > 0 && (
            <div className="space-y-3">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-card border border-slate-700 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-slate-100 font-medium">{plan.task_name}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-slate-400">
                        {plan.interval_km && (
                          <span className="font-mono">alle {plan.interval_km.toLocaleString('de-DE')} km</span>
                        )}
                        {plan.interval_days && (
                          <span>alle {plan.interval_days} Tage</span>
                        )}
                        {plan.last_done_date && (
                          <span>
                            Zuletzt: {new Date(plan.last_done_date).toLocaleDateString('de-DE')}
                          </span>
                        )}
                        {plan.last_done_km && (
                          <span className="font-mono">bei {plan.last_done_km.toLocaleString('de-DE')} km</span>
                        )}
                      </div>
                      {plan.notes && <p className="text-slate-500 text-xs mt-1">{plan.notes}</p>}
                    </div>
                    <Link
                      to={`/vehicles/${vehicle.id}/plans`}
                      className="text-slate-400 hover:text-accent transition-colors text-xs flex-shrink-0"
                    >
                      Bearbeiten &#8594;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-slate-100 font-semibold mb-2">Fahrzeug löschen?</h3>
            <p className="text-slate-400 text-sm mb-4">
              <span className="text-slate-200">{vehicle.name}</span> und alle zugehörigen Daten werden unwiderruflich gelöscht.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="btn-danger flex-1"
              >
                {deleteMutation.isPending ? 'Lösche...' : 'Löschen'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary flex-1">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
