import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import api from '../api/client'
import type { MaintenancePlan } from '../types'

interface PlanFormData {
  task_name: string
  interval_km?: number
  interval_days?: number
  last_done_km?: number
  last_done_date?: string
  notes?: string
}

function PlanForm({
  plan,
  vehicleId,
  onSuccess,
  onCancel,
}: {
  plan?: MaintenancePlan
  vehicleId: number
  onSuccess: () => void
  onCancel: () => void
}) {
  const qc = useQueryClient()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PlanFormData>({
    defaultValues: plan
      ? {
          task_name: plan.task_name,
          interval_km: plan.interval_km,
          interval_days: plan.interval_days,
          last_done_km: plan.last_done_km,
          last_done_date: plan.last_done_date,
          notes: plan.notes ?? '',
        }
      : {},
  })

  async function onSubmit(data: PlanFormData) {
    setServerError('')
    const payload: PlanFormData = {
      task_name: data.task_name,
      notes: data.notes || undefined,
      interval_km: data.interval_km ? Number(data.interval_km) : undefined,
      interval_days: data.interval_days ? Number(data.interval_days) : undefined,
      last_done_km: data.last_done_km ? Number(data.last_done_km) : undefined,
      last_done_date: data.last_done_date || undefined,
    }
    try {
      if (plan) {
        await api.maintenancePlans.update(vehicleId, plan.id, payload)
      } else {
        await api.maintenancePlans.create(vehicleId, payload)
      }
      await qc.invalidateQueries({ queryKey: ['plans', vehicleId] })
      onSuccess()
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : 'Fehler beim Speichern')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {serverError && (
        <p className="text-danger text-sm bg-danger/10 border border-danger/30 rounded p-3">
          {serverError}
        </p>
      )}

      <div>
        <label className="form-label">Aufgabe *</label>
        <input
          {...register('task_name', { required: 'Pflichtfeld' })}
          className="form-input"
          placeholder="z.B. Ölwechsel"
        />
        {errors.task_name && <p className="form-error">{errors.task_name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Intervall (km)</label>
          <input
            type="number"
            {...register('interval_km')}
            className="form-input font-mono"
            placeholder="z.B. 10000"
          />
        </div>
        <div>
          <label className="form-label">Intervall (Tage)</label>
          <input
            type="number"
            {...register('interval_days')}
            className="form-input"
            placeholder="z.B. 365"
          />
        </div>
        <div>
          <label className="form-label">Zuletzt bei (km)</label>
          <input
            type="number"
            {...register('last_done_km')}
            className="form-input font-mono"
            placeholder="z.B. 45000"
          />
        </div>
        <div>
          <label className="form-label">Zuletzt am</label>
          <input
            type="date"
            {...register('last_done_date')}
            className="form-input"
          />
        </div>
      </div>

      <div>
        <label className="form-label">Notizen</label>
        <textarea
          {...register('notes')}
          className="form-input"
          rows={2}
          placeholder="Weitere Hinweise..."
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={isSubmitting} className="btn-accent flex-1">
          {isSubmitting ? 'Speichert...' : plan ? 'Aktualisieren' : 'Erstellen'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Abbrechen
        </button>
      </div>
    </form>
  )
}

export default function MaintenancePlans() {
  const { vehicleId } = useParams<{ vehicleId: string }>()
  const id = Number(vehicleId)
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editPlan, setEditPlan] = useState<MaintenancePlan | undefined>()
  const [deletePlan, setDeletePlan] = useState<MaintenancePlan | undefined>()

  const { data: vehicle } = useQuery({
    queryKey: ['vehicles', id],
    queryFn: () => api.vehicles.getById(id),
    enabled: !isNaN(id),
  })

  const { data: plans = [], isLoading, isError } = useQuery({
    queryKey: ['plans', id],
    queryFn: () => api.maintenancePlans.getByVehicle(id),
    enabled: !isNaN(id),
  })

  const deleteMutation = useMutation({
    mutationFn: (planId: number) => api.maintenancePlans.delete(id, planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans', id] })
      setDeletePlan(undefined)
    },
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/vehicles/${id}`} className="text-slate-500 hover:text-slate-900 transition-colors">
          &#8592;
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Wartungspläne</h1>
          {vehicle && (
            <p className="text-slate-500 text-sm">{vehicle.name} &middot; {vehicle.make} {vehicle.model}</p>
          )}
        </div>
        <button
          onClick={() => { setEditPlan(undefined); setShowForm(true) }}
          className="btn-accent ml-auto"
        >
          + Neuer Plan
        </button>
      </div>

      {isError && (
        <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-4 mb-4">
          Fehler beim Laden der Wartungspläne.
        </div>
      )}

      {/* Inline Form */}
      {showForm && !editPlan && (
        <div className="bg-white border border-accent/30 rounded-xl p-6 mb-4 shadow-sm">
          <h3 className="text-slate-900 font-semibold mb-4">Neuer Wartungsplan</h3>
          <PlanForm
            vehicleId={id}
            onSuccess={() => setShowForm(false)}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {isLoading && (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white rounded-xl border border-slate-200" />)}
        </div>
      )}

      {!isLoading && plans.length === 0 && !showForm && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">&#128197;</div>
          <p className="text-slate-500 mb-4">Noch keine Wartungspläne für dieses Fahrzeug.</p>
          <button onClick={() => setShowForm(true)} className="btn-accent">
            + Ersten Plan anlegen
          </button>
        </div>
      )}

      <div className="space-y-3">
        {plans.map((plan) => (
          <div key={plan.id}>
            {editPlan?.id === plan.id ? (
              <div className="bg-white border border-accent/30 rounded-xl p-6 shadow-sm">
                <h3 className="text-slate-900 font-semibold mb-4">Plan bearbeiten</h3>
                <PlanForm
                  plan={plan}
                  vehicleId={id}
                  onSuccess={() => setEditPlan(undefined)}
                  onCancel={() => setEditPlan(undefined)}
                />
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-slate-900 font-semibold">{plan.task_name}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 text-sm">
                      {plan.interval_km && (
                        <div>
                          <p className="text-slate-400 text-xs">Intervall km</p>
                          <p className="font-mono text-accent">
                            {plan.interval_km.toLocaleString('de-DE')} km
                          </p>
                        </div>
                      )}
                      {plan.interval_days && (
                        <div>
                          <p className="text-slate-400 text-xs">Intervall Zeit</p>
                          <p className="text-slate-700">{plan.interval_days} Tage</p>
                        </div>
                      )}
                      {plan.last_done_km && (
                        <div>
                          <p className="text-slate-400 text-xs">Zuletzt bei</p>
                          <p className="font-mono text-slate-700">
                            {plan.last_done_km.toLocaleString('de-DE')} km
                          </p>
                        </div>
                      )}
                      {plan.last_done_date && (
                        <div>
                          <p className="text-slate-400 text-xs">Zuletzt am</p>
                          <p className="text-slate-700">
                            {new Date(plan.last_done_date).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                      )}
                    </div>
                    {plan.notes && (
                      <p className="text-slate-400 text-xs mt-2 italic">{plan.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setEditPlan(plan); setShowForm(false) }}
                      className="text-slate-400 hover:text-accent transition-colors"
                      title="Bearbeiten"
                    >
                      &#9998;
                    </button>
                    <button
                      onClick={() => setDeletePlan(plan)}
                      className="text-slate-400 hover:text-danger transition-colors"
                      title="Löschen"
                    >
                      &#128465;
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {deletePlan && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-slate-900 font-semibold mb-2">Wartungsplan löschen?</h3>
            <p className="text-slate-500 text-sm mb-4">
              <span className="text-slate-800">{deletePlan.task_name}</span> wird unwiderruflich gelöscht.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate(deletePlan.id)}
                disabled={deleteMutation.isPending}
                className="btn-danger flex-1"
              >
                {deleteMutation.isPending ? 'Lösche...' : 'Löschen'}
              </button>
              <button onClick={() => setDeletePlan(undefined)} className="btn-secondary flex-1">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
