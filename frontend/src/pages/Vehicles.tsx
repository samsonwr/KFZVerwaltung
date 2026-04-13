import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { Vehicle } from '../types'
import PhotoUpload from '../components/PhotoUpload'

interface VehicleFormData {
  name: string
  make: string
  model: string
  year: number
  vin?: string
  license_plate?: string
  current_km: number
}

function VehicleModal({
  vehicle,
  onClose,
}: {
  vehicle?: Vehicle
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VehicleFormData>({
    defaultValues: vehicle
      ? {
          name: vehicle.name,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          vin: vehicle.vin ?? '',
          license_plate: vehicle.license_plate ?? '',
          current_km: vehicle.current_km,
        }
      : { year: new Date().getFullYear(), current_km: 0 },
  })

  async function onSubmit(data: VehicleFormData) {
    setServerError('')
    try {
      let saved: Vehicle
      if (vehicle) {
        saved = await api.vehicles.update(vehicle.id, data)
      } else {
        saved = await api.vehicles.create({ ...data, photo_path: undefined })
      }
      if (photoFiles.length > 0) {
        await api.vehicles.uploadPhoto(saved.id, photoFiles[0])
      }
      await qc.invalidateQueries({ queryKey: ['vehicles'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : 'Fehler beim Speichern')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">
            {vehicle ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 text-xl">
            &#215;
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {serverError && (
            <p className="text-danger text-sm bg-danger/10 border border-danger/30 rounded p-3">
              {serverError}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="form-label">Bezeichnung *</label>
              <input
                {...register('name', { required: 'Pflichtfeld' })}
                className="form-input"
                placeholder="z.B. Mein VW Golf"
              />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>

            <div>
              <label className="form-label">Marke *</label>
              <input
                {...register('make', { required: 'Pflichtfeld' })}
                className="form-input"
                placeholder="VW"
              />
              {errors.make && <p className="form-error">{errors.make.message}</p>}
            </div>

            <div>
              <label className="form-label">Modell *</label>
              <input
                {...register('model', { required: 'Pflichtfeld' })}
                className="form-input"
                placeholder="Golf"
              />
              {errors.model && <p className="form-error">{errors.model.message}</p>}
            </div>

            <div>
              <label className="form-label">Baujahr *</label>
              <input
                type="number"
                {...register('year', {
                  required: 'Pflichtfeld',
                  min: { value: 1900, message: 'Mindestens 1900' },
                  max: { value: new Date().getFullYear() + 1, message: 'Ungültig' },
                })}
                className="form-input"
              />
              {errors.year && <p className="form-error">{errors.year.message}</p>}
            </div>

            <div>
              <label className="form-label">Kilometerstand *</label>
              <input
                type="number"
                {...register('current_km', { required: 'Pflichtfeld', min: 0 })}
                className="form-input font-mono"
              />
              {errors.current_km && <p className="form-error">{errors.current_km.message}</p>}
            </div>

            <div>
              <label className="form-label">Kennzeichen</label>
              <input
                {...register('license_plate')}
                className="form-input font-mono uppercase"
                placeholder="AB CD 123"
              />
            </div>

            <div>
              <label className="form-label">Fahrgestellnummer (VIN)</label>
              <input
                {...register('vin')}
                className="form-input font-mono uppercase"
                placeholder="WVW..."
              />
            </div>
          </div>

          <div>
            <label className="form-label">Fahrzeugfoto</label>
            <PhotoUpload onUpload={setPhotoFiles} label="Foto hochladen (optional)" />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-accent flex-1"
            >
              {isSubmitting ? 'Speichert...' : vehicle ? 'Aktualisieren' : 'Erstellen'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirm({ vehicle, onConfirm, onCancel, isDeleting }: {
  vehicle: Vehicle
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-slate-100 font-semibold mb-2">Fahrzeug löschen?</h3>
        <p className="text-slate-400 text-sm mb-1">
          <span className="text-slate-200">{vehicle.name}</span> wird unwiderruflich gelöscht.
        </p>
        <p className="text-slate-500 text-xs mb-4">Alle Service-Einträge und Wartungspläne werden ebenfalls entfernt.</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={isDeleting} className="btn-danger flex-1">
            {isDeleting ? 'Lösche...' : 'Löschen'}
          </button>
          <button onClick={onCancel} className="btn-secondary flex-1">Abbrechen</button>
        </div>
      </div>
    </div>
  )
}

export default function Vehicles() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editVehicle, setEditVehicle] = useState<Vehicle | undefined>()
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | undefined>()

  const { data: vehicles = [], isLoading, isError } = useQuery({
    queryKey: ['vehicles'],
    queryFn: api.vehicles.getAll,
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.vehicles.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setDeleteVehicle(undefined)
    },
  })

  function getPhotoUrl(path?: string) {
    if (!path) return null
    return path.startsWith('http') ? path : `/static/${path}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Fahrzeuge</h1>
          <p className="text-slate-400 text-sm mt-0.5">{vehicles.length} Fahrzeug{vehicles.length !== 1 ? 'e' : ''}</p>
        </div>
        <button onClick={() => { setEditVehicle(undefined); setShowModal(true) }} className="btn-accent">
          + Neues Fahrzeug
        </button>
      </div>

      {isError && (
        <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-4 mb-4">
          Fehler beim Laden der Fahrzeuge.
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-card rounded-xl animate-pulse border border-slate-700" />
          ))}
        </div>
      )}

      {!isLoading && vehicles.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">&#128663;</div>
          <h2 className="text-xl font-semibold text-slate-300 mb-2">Noch keine Fahrzeuge</h2>
          <button onClick={() => { setEditVehicle(undefined); setShowModal(true) }} className="btn-accent mt-4">
            + Erstes Fahrzeug hinzufügen
          </button>
        </div>
      )}

      {vehicles.length > 0 && (
        <div className="bg-card border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Fahrzeug</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Kennzeichen</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">Kilometerstand</th>
                <th className="text-right px-4 py-3 hidden lg:table-cell">VIN</th>
                <th className="text-right px-4 py-3">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {vehicles.map((v) => {
                const photoUrl = getPhotoUrl(v.photo_path)
                return (
                  <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {photoUrl ? (
                          <img src={photoUrl} alt={v.name} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg border border-slate-600">
                            &#128663;
                          </div>
                        )}
                        <div>
                          <Link to={`/vehicles/${v.id}`} className="text-slate-100 font-medium hover:text-accent transition-colors">
                            {v.name}
                          </Link>
                          <p className="text-slate-500 text-xs">{v.make} {v.model} &middot; {v.year}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="font-mono text-slate-300 text-xs">{v.license_plate || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-right">
                      <span className="font-mono text-accent">{v.current_km.toLocaleString('de-DE')} km</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-right">
                      <span className="font-mono text-slate-500 text-xs">{v.vin || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/vehicles/${v.id}`}
                          className="text-slate-400 hover:text-accent transition-colors text-xs"
                        >
                          Details
                        </Link>
                        <button
                          onClick={() => { setEditVehicle(v); setShowModal(true) }}
                          className="text-slate-400 hover:text-accent transition-colors text-xs"
                        >
                          &#9998;
                        </button>
                        <button
                          onClick={() => setDeleteVehicle(v)}
                          className="text-slate-400 hover:text-danger transition-colors text-xs"
                        >
                          &#128465;
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {(showModal) && (
        <VehicleModal
          vehicle={editVehicle}
          onClose={() => { setShowModal(false); setEditVehicle(undefined) }}
        />
      )}

      {deleteVehicle && (
        <DeleteConfirm
          vehicle={deleteVehicle}
          onConfirm={() => deleteMutation.mutate(deleteVehicle.id)}
          onCancel={() => setDeleteVehicle(undefined)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  )
}
