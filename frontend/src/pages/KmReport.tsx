import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import type { Vehicle } from '../types'

type Step = 'select' | 'input' | 'done'

export default function KmReport() {
  const [step, setStep] = useState<Step>('select')
  const [selected, setSelected] = useState<Vehicle | null>(null)
  const [km, setKm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const qc = useQueryClient()

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: api.vehicles.getAll,
  })

  function pickVehicle(v: Vehicle) {
    setSelected(v)
    setKm(String(v.current_km))
    setError('')
    setStep('input')
  }

  async function submit() {
    const parsed = parseInt(km, 10)
    if (isNaN(parsed) || parsed < 0) {
      setError('Bitte einen gültigen KM-Stand eingeben.')
      return
    }
    if (parsed < (selected?.current_km ?? 0)) {
      setError(`KM-Stand darf nicht kleiner als ${selected!.current_km.toLocaleString('de-DE')} km sein.`)
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.vehicles.updateKm(selected!.id, parsed)
      await qc.invalidateQueries({ queryKey: ['vehicles'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      setStep('done')
    } catch {
      setError('Fehler beim Speichern. Bitte erneut versuchen.')
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setStep('select')
    setSelected(null)
    setKm('')
    setError('')
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="text-6xl">✅</div>
        <div>
          <p className="text-slate-100 text-xl font-bold">{parseInt(km).toLocaleString('de-DE')} km gespeichert</p>
          <p className="text-slate-400 text-sm mt-1">{selected?.name}</p>
        </div>
        <button
          onClick={reset}
          className="bg-accent hover:bg-amber-400 text-slate-900 font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
        >
          Weiteres Fahrzeug melden
        </button>
      </div>
    )
  }

  if (step === 'input' && selected) {
    return (
      <div className="max-w-sm mx-auto mt-4">
        <button onClick={reset} className="text-slate-400 hover:text-slate-100 text-sm mb-6 flex items-center gap-1">
          ← Zurück
        </button>

        <div className="bg-card border border-slate-700/50 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <span className="text-3xl">🚗</span>
          <div>
            <p className="text-slate-100 font-semibold">{selected.name}</p>
            <p className="text-slate-400 text-sm">{selected.make} {selected.model} · {selected.year}</p>
            <p className="text-accent text-sm font-mono mt-1">
              Aktuell: {selected.current_km.toLocaleString('de-DE')} km
            </p>
          </div>
        </div>

        <label className="block text-slate-300 text-sm font-medium mb-2">
          Neuer KM-Stand
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={km}
          onChange={(e) => { setKm(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={String(selected.current_km)}
          autoFocus
          className="w-full bg-surface border border-slate-600 focus:border-accent rounded-xl px-4 py-4 text-2xl font-mono text-slate-100 focus:outline-none text-center"
        />

        {error && (
          <p className="text-red-400 text-sm mt-2">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={saving || km === String(selected.current_km)}
          className="mt-5 w-full bg-accent hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold py-4 rounded-xl text-base transition-colors"
        >
          {saving ? 'Speichert…' : 'KM speichern'}
        </button>
      </div>
    )
  }

  // Step: select
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">KM melden</h1>
        <p className="text-slate-400 text-sm mt-1">Fahrzeug auswählen</p>
      </div>

      {isLoading && (
        <p className="text-slate-400 text-sm">Lade Fahrzeuge…</p>
      )}

      {!isLoading && vehicles.length === 0 && (
        <p className="text-slate-400 text-sm">Keine Fahrzeuge vorhanden.</p>
      )}

      <div className="flex flex-col gap-3">
        {vehicles.map((v) => (
          <button
            key={v.id}
            onClick={() => pickVehicle(v)}
            className="bg-card border border-slate-700/50 hover:border-accent/50 hover:bg-slate-800 rounded-2xl p-4 flex items-center gap-4 text-left transition-colors w-full"
          >
            <span className="text-3xl shrink-0">🚗</span>
            <div className="flex-1 min-w-0">
              <p className="text-slate-100 font-semibold truncate">{v.name}</p>
              <p className="text-slate-400 text-sm truncate">{v.make} {v.model} · {v.year}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-accent font-mono text-sm">{v.current_km.toLocaleString('de-DE')} km</p>
              <p className="text-slate-500 text-xs">{v.license_plate ?? ''}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
