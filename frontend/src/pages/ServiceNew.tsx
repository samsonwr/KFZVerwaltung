import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import api from '../api/client'
import PhotoUpload from '../components/PhotoUpload'

interface PartField {
  name: string
  cost: number
}

interface ServiceFormData {
  vehicle_id: number
  date: string
  km_at_service: number
  tasks: { value: string }[]
  parts_used: PartField[]
  notes: string
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

export default function ServiceNew() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedVehicleId = searchParams.get('vehicleId')

  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [serverError, setServerError] = useState('')

  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: api.vehicles.getAll,
  })

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormData>({
    defaultValues: {
      vehicle_id: preselectedVehicleId ? Number(preselectedVehicleId) : undefined,
      date: today(),
      km_at_service: 0,
      tasks: [{ value: '' }],
      parts_used: [],
      notes: '',
    },
  })

  const tasksArray = useFieldArray({ control, name: 'tasks' })
  const partsArray = useFieldArray({ control, name: 'parts_used' })
  const watchedParts = watch('parts_used')

  const totalCost = (watchedParts ?? []).reduce((sum, p) => {
    const c = parseFloat(String(p.cost))
    return sum + (isNaN(c) ? 0 : c)
  }, 0)

  // Pre-fill km when vehicle changes
  const watchedVehicleId = watch('vehicle_id')
  useEffect(() => {
    if (watchedVehicleId) {
      const v = vehicles.find((x) => x.id === Number(watchedVehicleId))
      if (v) setValue('km_at_service', v.current_km)
    }
  }, [watchedVehicleId, vehicles, setValue])

  async function onSubmit(data: ServiceFormData) {
    setServerError('')
    const tasks = data.tasks.map((t) => t.value).filter(Boolean)
    const parts_used = data.parts_used
      .filter((p) => p.name)
      .map((p) => ({ name: p.name, cost: parseFloat(String(p.cost)) || 0 }))

    try {
      const service = await api.services.create({
        vehicle_id: Number(data.vehicle_id),
        date: data.date,
        km_at_service: Number(data.km_at_service),
        tasks,
        parts_used,
        total_cost: totalCost,
        notes: data.notes || undefined,
      })

      if (photoFiles.length > 0) {
        await api.services.uploadPhotos(service.id, photoFiles)
      }

      navigate(`/services/${service.id}`)
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : 'Fehler beim Speichern')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-slate-100 transition-colors"
        >
          &#8592;
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Service erfassen</h1>
          <p className="text-slate-400 text-sm">Neuen Serviceeintrag anlegen</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
        {serverError && (
          <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-4">
            {serverError}
          </div>
        )}

        {/* Basic Info */}
        <div className="bg-card border border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="text-slate-100 font-semibold">Grunddaten</h2>

          <div>
            <label className="form-label">Fahrzeug *</label>
            <Controller
              control={control}
              name="vehicle_id"
              rules={{ required: 'Pflichtfeld' }}
              render={({ field }) => (
                <select
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className="form-input"
                  disabled={vehiclesLoading}
                >
                  <option value="">Fahrzeug auswählen...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} &mdash; {v.make} {v.model} ({v.year})
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.vehicle_id && <p className="form-error">{errors.vehicle_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Datum *</label>
              <input
                type="date"
                {...register('date', { required: 'Pflichtfeld' })}
                className="form-input"
              />
              {errors.date && <p className="form-error">{errors.date.message}</p>}
            </div>
            <div>
              <label className="form-label">Kilometerstand *</label>
              <input
                type="number"
                {...register('km_at_service', {
                  required: 'Pflichtfeld',
                  min: { value: 0, message: 'Muss >= 0 sein' },
                })}
                className="form-input font-mono"
              />
              {errors.km_at_service && (
                <p className="form-error">{errors.km_at_service.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tasks */}
        <div className="bg-card border border-slate-700 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-100 font-semibold">Durchgeführte Arbeiten</h2>
            <button
              type="button"
              onClick={() => tasksArray.append({ value: '' })}
              className="btn-secondary text-sm"
            >
              + Hinzufügen
            </button>
          </div>

          {tasksArray.fields.length === 0 && (
            <p className="text-slate-500 text-sm italic">Noch keine Arbeiten erfasst.</p>
          )}

          {tasksArray.fields.map((field, idx) => (
            <div key={field.id} className="flex gap-2">
              <input
                {...register(`tasks.${idx}.value`)}
                className="form-input flex-1"
                placeholder={`Arbeit ${idx + 1} (z.B. Ölwechsel)`}
              />
              <button
                type="button"
                onClick={() => tasksArray.remove(idx)}
                className="text-slate-400 hover:text-danger transition-colors px-2"
              >
                &#215;
              </button>
            </div>
          ))}
        </div>

        {/* Parts & Costs */}
        <div className="bg-card border border-slate-700 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-slate-100 font-semibold">Verwendete Teile &amp; Kosten</h2>
            <button
              type="button"
              onClick={() => partsArray.append({ name: '', cost: 0 })}
              className="btn-secondary text-sm"
            >
              + Teil
            </button>
          </div>

          {partsArray.fields.length === 0 && (
            <p className="text-slate-500 text-sm italic">Noch keine Teile erfasst.</p>
          )}

          {partsArray.fields.map((field, idx) => (
            <div key={field.id} className="flex gap-2">
              <input
                {...register(`parts_used.${idx}.name`)}
                className="form-input flex-1"
                placeholder="Teilname"
              />
              <input
                type="number"
                step="0.01"
                {...register(`parts_used.${idx}.cost`)}
                className="form-input w-28 font-mono"
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={() => partsArray.remove(idx)}
                className="text-slate-400 hover:text-danger transition-colors px-2"
              >
                &#215;
              </button>
            </div>
          ))}

          <div className="flex justify-end pt-2 border-t border-slate-700">
            <div className="text-right">
              <p className="text-slate-400 text-xs uppercase tracking-wide">Gesamtkosten</p>
              <p className="text-accent font-bold text-xl font-mono">
                {totalCost.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-card border border-slate-700 rounded-xl p-6">
          <label className="form-label">Notizen</label>
          <textarea
            {...register('notes')}
            className="form-input"
            rows={3}
            placeholder="Weitere Bemerkungen..."
          />
        </div>

        {/* Photos */}
        <div className="bg-card border border-slate-700 rounded-xl p-6">
          <h2 className="text-slate-100 font-semibold mb-3">Fotos</h2>
          <PhotoUpload
            onUpload={(files) => setPhotoFiles((prev) => [...prev, ...files])}
            label="Service-Fotos hochladen"
          />
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting} className="btn-accent flex-1">
            {isSubmitting ? 'Speichert...' : 'Service speichern'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary flex-1"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  )
}
