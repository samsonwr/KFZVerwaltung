import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import api from '../api/client'
import type { Vehicle } from '../types'
import PhotoUpload from './PhotoUpload'

interface VehicleFormData {
  name: string
  make: string
  model: string
  year: number
  vin?: string
  license_plate?: string
  current_km: number
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

interface VehicleFormModalProps {
  vehicle?: Vehicle
  onClose: () => void
  onSaved?: (vehicle: Vehicle) => void
}

export default function VehicleFormModal({ vehicle, onClose, onSaved }: VehicleFormModalProps) {
  const qc = useQueryClient()
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [regDocFiles, setRegDocFiles] = useState<File[]>([])
  const [serverError, setServerError] = useState('')
  const [activeSection, setActiveSection] = useState<'basic' | 'fluids' | 'tires' | 'photos'>('basic')

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
          key_number: vehicle.key_number ?? '',
          fuel_type: vehicle.fuel_type ?? '',
          engine_oil_type: vehicle.engine_oil_type ?? '',
          engine_oil_capacity: vehicle.engine_oil_capacity ?? undefined,
          gearbox_oil_type: vehicle.gearbox_oil_type ?? '',
          gearbox_oil_capacity: vehicle.gearbox_oil_capacity ?? undefined,
          coolant_type: vehicle.coolant_type ?? '',
          coolant_capacity: vehicle.coolant_capacity ?? undefined,
          brake_fluid_type: vehicle.brake_fluid_type ?? '',
          tire_size_summer: vehicle.tire_size_summer ?? '',
          tire_size_winter: vehicle.tire_size_winter ?? '',
          next_inspection_date: vehicle.next_inspection_date ?? '',
        }
      : { year: new Date().getFullYear(), current_km: 0 },
  })

  async function onSubmit(data: VehicleFormData) {
    setServerError('')
    try {
      let saved: Vehicle
      const payload = {
        name: data.name,
        make: data.make,
        model: data.model,
        year: Number(data.year),
        vin: data.vin || undefined,
        license_plate: data.license_plate || undefined,
        current_km: Number(data.current_km),
        key_number: data.key_number || undefined,
        fuel_type: data.fuel_type || undefined,
        engine_oil_type: data.engine_oil_type || undefined,
        engine_oil_capacity: data.engine_oil_capacity ? Number(data.engine_oil_capacity) : undefined,
        gearbox_oil_type: data.gearbox_oil_type || undefined,
        gearbox_oil_capacity: data.gearbox_oil_capacity ? Number(data.gearbox_oil_capacity) : undefined,
        coolant_type: data.coolant_type || undefined,
        coolant_capacity: data.coolant_capacity ? Number(data.coolant_capacity) : undefined,
        brake_fluid_type: data.brake_fluid_type || undefined,
        tire_size_summer: data.tire_size_summer || undefined,
        tire_size_winter: data.tire_size_winter || undefined,
        next_inspection_date: data.next_inspection_date || undefined,
      }

      if (vehicle) {
        saved = await api.vehicles.update(vehicle.id, payload)
      } else {
        saved = await api.vehicles.create({ ...payload, photo_path: undefined })
      }

      if (photoFiles.length > 0) {
        saved = await api.vehicles.uploadPhoto(saved.id, photoFiles[0])
      }
      if (regDocFiles.length > 0) {
        saved = await api.vehicles.uploadRegistrationDoc(saved.id, regDocFiles[0])
      }

      await qc.invalidateQueries({ queryKey: ['vehicles'] })
      await qc.invalidateQueries({ queryKey: ['vehicles', saved.id] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      onSaved?.(saved)
      onClose()
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : 'Fehler beim Speichern')
    }
  }

  const sections = [
    { id: 'basic', label: 'Grunddaten' },
    { id: 'fluids', label: 'Wartungsmaterial' },
    { id: 'tires', label: 'Reifen & HU' },
    { id: 'photos', label: 'Fotos' },
  ] as const

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900">
            {vehicle ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl">
            &#215;
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex border-b border-slate-200 px-6 flex-shrink-0 overflow-x-auto">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeSection === s.id
                  ? 'border-accent text-amber-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {serverError && (
              <p className="text-danger text-sm bg-danger/10 border border-danger/30 rounded p-3">
                {serverError}
              </p>
            )}

            {/* === GRUNDDATEN === */}
            {activeSection === 'basic' && (
              <div className="space-y-4">
                <div className="col-span-2">
                  <label className="form-label">Bezeichnung *</label>
                  <input
                    {...register('name', { required: 'Pflichtfeld' })}
                    className="form-input"
                    placeholder="z.B. Mein VW Golf"
                  />
                  {errors.name && <p className="form-error">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <label className="form-label">Kraftstoffart</label>
                    <select {...register('fuel_type')} className="form-input">
                      <option value="">Bitte wählen…</option>
                      <option value="Benzin">Benzin</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Elektro">Elektro</option>
                      <option value="Hybrid (Benzin)">Hybrid (Benzin)</option>
                      <option value="Hybrid (Diesel)">Hybrid (Diesel)</option>
                      <option value="LPG">LPG (Autogas)</option>
                      <option value="CNG">CNG (Erdgas)</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Fahrgestellnummer (FIN/VIN)</label>
                    <input
                      {...register('vin')}
                      className="form-input font-mono uppercase"
                      placeholder="WVW..."
                    />
                  </div>

                  <div>
                    <label className="form-label">Schlüsselnummer (HSN/TSN)</label>
                    <input
                      {...register('key_number')}
                      className="form-input font-mono"
                      placeholder="z.B. 0603 AHX"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* === WARTUNGSMATERIAL === */}
            {activeSection === 'fluids' && (
              <div className="space-y-5">
                <p className="text-slate-500 text-sm">
                  Hinterlege hier die fahrzeugspezifischen Wartungsmedien für schnellen Zugriff bei jedem Service.
                </p>

                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <h3 className="text-slate-700 font-semibold text-sm flex items-center gap-2">
                    🛢 Motoröl
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Spezifikation / Typ</label>
                      <input
                        {...register('engine_oil_type')}
                        className="form-input"
                        placeholder="z.B. 5W-30 VW 504.00"
                      />
                    </div>
                    <div>
                      <label className="form-label">Füllmenge (Liter)</label>
                      <input
                        type="number"
                        step="0.1"
                        {...register('engine_oil_capacity')}
                        className="form-input font-mono"
                        placeholder="z.B. 4.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <h3 className="text-slate-700 font-semibold text-sm flex items-center gap-2">
                    ⚙️ Getriebeöl
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Spezifikation / Typ</label>
                      <input
                        {...register('gearbox_oil_type')}
                        className="form-input"
                        placeholder="z.B. ATF DSG G 052 182"
                      />
                    </div>
                    <div>
                      <label className="form-label">Füllmenge (Liter)</label>
                      <input
                        type="number"
                        step="0.1"
                        {...register('gearbox_oil_capacity')}
                        className="form-input font-mono"
                        placeholder="z.B. 6.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <h3 className="text-slate-700 font-semibold text-sm flex items-center gap-2">
                    🌡 Kühlmittel
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Typ / Farbe</label>
                      <input
                        {...register('coolant_type')}
                        className="form-input"
                        placeholder="z.B. G12+ (rot)"
                      />
                    </div>
                    <div>
                      <label className="form-label">Füllmenge (Liter)</label>
                      <input
                        type="number"
                        step="0.1"
                        {...register('coolant_capacity')}
                        className="form-input font-mono"
                        placeholder="z.B. 8.0"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                  <h3 className="text-slate-700 font-semibold text-sm flex items-center gap-2">
                    🔴 Bremsflüssigkeit
                  </h3>
                  <div>
                    <label className="form-label">DOT-Klasse</label>
                    <select {...register('brake_fluid_type')} className="form-input">
                      <option value="">Bitte wählen…</option>
                      <option value="DOT 3">DOT 3</option>
                      <option value="DOT 4">DOT 4</option>
                      <option value="DOT 4 LV">DOT 4 LV (Low Viscosity)</option>
                      <option value="DOT 5">DOT 5</option>
                      <option value="DOT 5.1">DOT 5.1</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* === REIFEN & HU === */}
            {activeSection === 'tires' && (
              <div className="space-y-4">
                <p className="text-slate-500 text-sm">
                  Reifengrößen und nächster Hauptuntersuchungstermin.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Reifengröße Sommer</label>
                    <input
                      {...register('tire_size_summer')}
                      className="form-input font-mono"
                      placeholder="z.B. 205/55 R16 91V"
                    />
                  </div>
                  <div>
                    <label className="form-label">Reifengröße Winter</label>
                    <input
                      {...register('tire_size_winter')}
                      className="form-input font-mono"
                      placeholder="z.B. 205/55 R16 91H"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Nächste Hauptuntersuchung (HU/TÜV)</label>
                  <input
                    type="date"
                    {...register('next_inspection_date')}
                    className="form-input"
                  />
                </div>
              </div>
            )}

            {/* === FOTOS === */}
            {activeSection === 'photos' && (
              <div className="space-y-6">
                <div>
                  <label className="form-label">Fahrzeugfoto</label>
                  {vehicle?.photo_path && (
                    <img
                      src={`/uploads/${vehicle.photo_path}`}
                      alt="Aktuelles Foto"
                      className="w-32 h-24 object-cover rounded-lg border border-slate-200 mb-3"
                    />
                  )}
                  <PhotoUpload onUpload={setPhotoFiles} label="Fahrzeugfoto hochladen (optional)" />
                </div>

                <div>
                  <label className="form-label">Fahrzeugschein (Foto)</label>
                  {vehicle?.registration_doc_path && (
                    <a
                      href={`/uploads/${vehicle.registration_doc_path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mb-3"
                    >
                      <img
                        src={`/uploads/${vehicle.registration_doc_path}`}
                        alt="Aktueller Fahrzeugschein"
                        className="w-40 h-28 object-cover rounded-lg border border-slate-200 hover:border-accent/50 transition-colors"
                      />
                      <p className="text-xs text-slate-400 mt-1">Aktueller Fahrzeugschein (klicken zum Vergrößern)</p>
                    </a>
                  )}
                  <PhotoUpload
                    onUpload={setRegDocFiles}
                    label="Fahrzeugschein als Foto hochladen"
                  />
                  <p className="text-slate-400 text-xs mt-1">
                    Vorder- und Rückseite des Fahrzeugscheins als ein Foto oder separat
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 px-6 py-4 flex gap-3 flex-shrink-0">
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
