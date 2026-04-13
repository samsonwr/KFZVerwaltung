import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import api from '../api/client'
import type { ServiceRecord } from '../types'
import ServicePhotoGallery from '../components/ServicePhotoGallery'
import PhotoUpload from '../components/PhotoUpload'

interface ServiceFormData {
  vehicle_id: number
  date: string
  km_at_service: number
  tasks: { value: string }[]
  parts_used: { name: string; cost: number }[]
  notes: string
}

function EditForm({
  service,
  onCancel,
  onSuccess,
}: {
  service: ServiceRecord
  onCancel: () => void
  onSuccess: () => void
}) {
  const qc = useQueryClient()
  const [serverError, setServerError] = useState('')
  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: api.vehicles.getAll,
  })

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { isSubmitting },
  } = useForm<ServiceFormData>({
    defaultValues: {
      vehicle_id: service.vehicle_id,
      date: service.date,
      km_at_service: service.km_at_service,
      tasks: service.tasks.map((t) => ({ value: t })),
      parts_used: service.parts_used.map((p) => ({ name: p.name, cost: p.cost })),
      notes: service.notes ?? '',
    },
  })

  const tasksArray = useFieldArray({ control, name: 'tasks' })
  const partsArray = useFieldArray({ control, name: 'parts_used' })
  const watchedParts = watch('parts_used')
  const totalCost = (watchedParts ?? []).reduce((sum, p) => {
    const c = parseFloat(String(p.cost))
    return sum + (isNaN(c) ? 0 : c)
  }, 0)

  async function onSubmit(data: ServiceFormData) {
    setServerError('')
    try {
      await api.services.update(service.id, {
        vehicle_id: Number(data.vehicle_id),
        date: data.date,
        km_at_service: Number(data.km_at_service),
        tasks: data.tasks.map((t) => t.value).filter(Boolean),
        parts_used: data.parts_used
          .filter((p) => p.name)
          .map((p) => ({ name: p.name, cost: parseFloat(String(p.cost)) || 0 })),
        total_cost: totalCost,
        notes: data.notes || undefined,
      })
      await qc.invalidateQueries({ queryKey: ['service', service.id] })
      await qc.invalidateQueries({ queryKey: ['services'] })
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
        <label className="form-label">Fahrzeug</label>
        <Controller
          control={control}
          name="vehicle_id"
          render={({ field }) => (
            <select
              {...field}
              onChange={(e) => field.onChange(Number(e.target.value))}
              className="form-input"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="form-label">Datum</label>
          <input type="date" {...register('date')} className="form-input" />
        </div>
        <div>
          <label className="form-label">Kilometerstand</label>
          <input type="number" {...register('km_at_service')} className="form-input font-mono" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="form-label mb-0">Arbeiten</label>
          <button type="button" onClick={() => tasksArray.append({ value: '' })} className="btn-secondary text-xs">
            + Arbeit
          </button>
        </div>
        {tasksArray.fields.map((f, idx) => (
          <div key={f.id} className="flex gap-2 mb-2">
            <input {...register(`tasks.${idx}.value`)} className="form-input flex-1" />
            <button type="button" onClick={() => tasksArray.remove(idx)} className="text-slate-400 hover:text-danger px-2">
              &#215;
            </button>
          </div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="form-label mb-0">Teile</label>
          <button type="button" onClick={() => partsArray.append({ name: '', cost: 0 })} className="btn-secondary text-xs">
            + Teil
          </button>
        </div>
        {partsArray.fields.map((f, idx) => (
          <div key={f.id} className="flex gap-2 mb-2">
            <input {...register(`parts_used.${idx}.name`)} className="form-input flex-1" placeholder="Name" />
            <input type="number" step="0.01" {...register(`parts_used.${idx}.cost`)} className="form-input w-28 font-mono" placeholder="0.00" />
            <button type="button" onClick={() => partsArray.remove(idx)} className="text-slate-400 hover:text-danger px-2">
              &#215;
            </button>
          </div>
        ))}
        <div className="text-right text-sm font-mono text-accent">
          Gesamt: {totalCost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
        </div>
      </div>

      <div>
        <label className="form-label">Notizen</label>
        <textarea {...register('notes')} className="form-input" rows={2} />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={isSubmitting} className="btn-accent flex-1">
          {isSubmitting ? 'Speichert...' : 'Aktualisieren'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Abbrechen
        </button>
      </div>
    </form>
  )
}

export default function ServiceDetail() {
  const { serviceId } = useParams<{ serviceId: string }>()
  const id = Number(serviceId)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [addingPhotos, setAddingPhotos] = useState(false)
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  const { data: service, isLoading, isError } = useQuery({
    queryKey: ['service', id],
    queryFn: () => api.services.getById(id),
    enabled: !isNaN(id),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.services.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['services'] })
      navigate(-1)
    },
  })

  async function uploadNewPhotos() {
    if (newPhotos.length === 0) return
    setUploadingPhotos(true)
    try {
      await api.services.uploadPhotos(id, newPhotos)
      await qc.invalidateQueries({ queryKey: ['service', id] })
      setNewPhotos([])
      setAddingPhotos(false)
    } finally {
      setUploadingPhotos(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-card rounded w-1/3" />
        <div className="h-48 bg-card rounded-xl border border-slate-700" />
      </div>
    )
  }

  if (isError || !service) {
    return (
      <div className="text-center py-16">
        <p className="text-danger text-lg mb-4">Service-Eintrag nicht gefunden.</p>
        <button onClick={() => navigate(-1)} className="btn-secondary">
          Zurück
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-100 transition-colors">
          &#8592;
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Service-Detail</h1>
          <p className="text-slate-400 text-sm">
            {new Date(service.date).toLocaleDateString('de-DE', {
              weekday: 'long',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </p>
        </div>
        {!editing && (
          <div className="ml-auto flex gap-2">
            <button onClick={() => setEditing(true)} className="btn-secondary text-sm">
              &#9998; Bearbeiten
            </button>
            <button onClick={() => setConfirmDelete(true)} className="btn-danger text-sm">
              &#128465;
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="bg-card border border-accent/30 rounded-xl p-6 mb-6">
          <h2 className="text-slate-100 font-semibold mb-4">Eintrag bearbeiten</h2>
          <EditForm
            service={service}
            onCancel={() => setEditing(false)}
            onSuccess={() => setEditing(false)}
          />
        </div>
      ) : (
        <>
          {/* Main Info */}
          <div className="bg-card border border-slate-700 rounded-xl p-6 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide">Datum</p>
                <p className="text-slate-100 font-medium">
                  {new Date(service.date).toLocaleDateString('de-DE')}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide">Kilometerstand</p>
                <p className="font-mono text-accent font-semibold">
                  {service.km_at_service.toLocaleString('de-DE')} km
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide">Gesamtkosten</p>
                <p className="text-accent font-bold text-lg">
                  {service.total_cost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide">Fotos</p>
                <p className="text-slate-300">{service.photos.length}</p>
              </div>
            </div>

            {/* Tasks */}
            {service.tasks.length > 0 && (
              <div className="mb-4">
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Durchgeführte Arbeiten</p>
                <div className="flex flex-wrap gap-2">
                  {service.tasks.map((t, i) => (
                    <span key={i} className="bg-slate-700 text-slate-200 text-sm px-3 py-1 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Parts */}
            {service.parts_used.length > 0 && (
              <div className="mb-4">
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Verwendete Teile</p>
                <div className="bg-surface rounded-lg overflow-hidden border border-slate-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400 text-xs">
                        <th className="text-left px-4 py-2">Teil</th>
                        <th className="text-right px-4 py-2">Kosten</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {service.parts_used.map((p, i) => (
                        <tr key={i}>
                          <td className="px-4 py-2 text-slate-300">{p.name}</td>
                          <td className="px-4 py-2 text-right font-mono text-accent">
                            {p.cost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-700 font-semibold">
                        <td className="px-4 py-2 text-slate-300">Gesamt</td>
                        <td className="px-4 py-2 text-right font-mono text-accent">
                          {service.total_cost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {service.notes && (
              <div>
                <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Notizen</p>
                <p className="text-slate-300 text-sm whitespace-pre-wrap">{service.notes}</p>
              </div>
            )}
          </div>

          {/* Photos */}
          <div className="bg-card border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-100 font-semibold">Fotos</h2>
              <button
                onClick={() => setAddingPhotos(!addingPhotos)}
                className="btn-secondary text-sm"
              >
                + Fotos hinzufügen
              </button>
            </div>

            {addingPhotos && (
              <div className="mb-4 space-y-3">
                <PhotoUpload
                  onUpload={(files) => setNewPhotos((prev) => [...prev, ...files])}
                  label="Weitere Fotos hochladen"
                />
                {newPhotos.length > 0 && (
                  <button
                    onClick={uploadNewPhotos}
                    disabled={uploadingPhotos}
                    className="btn-accent"
                  >
                    {uploadingPhotos ? 'Hochladen...' : `${newPhotos.length} Foto(s) hochladen`}
                  </button>
                )}
              </div>
            )}

            <ServicePhotoGallery
              photos={service.photos}
              serviceId={service.id}
            />
          </div>

          {/* Link to vehicle */}
          <div className="mt-4">
            <Link
              to={`/vehicles/${service.vehicle_id}`}
              className="text-slate-400 hover:text-accent transition-colors text-sm"
            >
              &#8592; Zum Fahrzeug
            </Link>
          </div>
        </>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-slate-100 font-semibold mb-2">Service-Eintrag löschen?</h3>
            <p className="text-slate-400 text-sm mb-4">
              Dieser Service-Eintrag und alle zugehörigen Fotos werden unwiderruflich gelöscht.
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
