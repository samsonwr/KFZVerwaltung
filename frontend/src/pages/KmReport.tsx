import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import type { Vehicle, KmHistoryEntry } from '../types'

type Step = 'select' | 'input' | 'done'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function VehicleHistory({ vehicleId }: { vehicleId: number }) {
  const { data: history = [] } = useQuery<KmHistoryEntry[]>({
    queryKey: ['km-history', vehicleId],
    queryFn: () => api.kmHistory.getByVehicle(vehicleId),
  })
  if (history.length === 0) return null
  return (
    <div className="mt-6">
      <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Letzte Meldungen</p>
      <div className="flex flex-col gap-1">
        {history.slice(0, 8).map((h) => (
          <div key={h.id} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-200 last:border-0">
            <span className="text-accent font-mono">{h.km.toLocaleString('de-DE')} km</span>
            <div className="text-right">
              <span className="text-slate-500 text-xs">{formatDate(h.reported_at)}</span>
              {h.note && <p className="text-slate-400 text-xs">{h.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function KmReport() {
  const [step, setStep] = useState<Step>('select')
  const [selected, setSelected] = useState<Vehicle | null>(null)
  const [km, setKm] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedKm, setSavedKm] = useState(0)
  const qc = useQueryClient()

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: api.vehicles.getAll,
  })

  function pickVehicle(v: Vehicle) {
    setSelected(v)
    setKm(String(v.current_km))
    setNote('')
    setError('')
    setStep('input')
  }

  async function submit() {
    const parsed = parseInt(km, 10)
    if (isNaN(parsed) || parsed < 0) {
      setError('Bitte einen gültigen KM-Stand eingeben.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await api.vehicles.updateKm(selected!.id, parsed, note.trim() || undefined)
      await qc.invalidateQueries({ queryKey: ['vehicles'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      await qc.invalidateQueries({ queryKey: ['km-history', selected!.id] })
      setSavedKm(parsed)
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
    setNote('')
    setError('')
  }

  if (step === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="text-6xl">✅</div>
        <div>
          <p className="text-slate-900 text-xl font-bold">{savedKm.toLocaleString('de-DE')} km gespeichert</p>
          <p className="text-slate-500 text-sm mt-1">{selected?.name}</p>
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
    const parsed = parseInt(km, 10)
    const isCorrection = !isNaN(parsed) && parsed < selected.current_km

    return (
      <div className="max-w-sm mx-auto mt-4">
        <button onClick={reset} className="text-slate-500 hover:text-slate-900 text-sm mb-6 flex items-center gap-1">
          ← Zurück
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 flex items-center gap-4 shadow-sm">
          <span className="text-3xl shrink-0">🚗</span>
          <div>
            <p className="text-slate-900 font-semibold">{selected.name}</p>
            <p className="text-slate-500 text-sm">{selected.make} {selected.model} · {selected.year}</p>
            <p className="text-accent text-sm font-mono mt-1">
              Aktuell: {selected.current_km.toLocaleString('de-DE')} km
            </p>
          </div>
        </div>

        <label className="block text-slate-700 text-sm font-medium mb-2">
          Neuer KM-Stand
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={km}
          onChange={(e) => { setKm(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          autoFocus
          className="w-full bg-white border border-slate-300 focus:border-accent rounded-xl px-4 py-4 text-2xl font-mono text-slate-900 focus:outline-none text-center"
        />

        {isCorrection && (
          <p className="text-amber-600 text-xs mt-2">
            ⚠ Korrektur: Wert liegt unter dem aktuellen KM-Stand.
          </p>
        )}

        <label className="block text-slate-700 text-sm font-medium mt-4 mb-2">
          Notiz <span className="text-slate-400">(optional)</span>
        </label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="z. B. Tankstelle, Kilometerkorrektur…"
          className="w-full bg-white border border-slate-300 focus:border-accent rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none"
        />

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

        <button
          onClick={submit}
          disabled={saving || km === '' || km === String(selected.current_km)}
          className="mt-5 w-full bg-accent hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold py-4 rounded-xl text-base transition-colors"
        >
          {saving ? 'Speichert…' : 'KM speichern'}
        </button>

        <VehicleHistory vehicleId={selected.id} />
      </div>
    )
  }

  // Step: select
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">KM melden</h1>
        <p className="text-slate-500 text-sm mt-1">Fahrzeug auswählen</p>
      </div>

      {isLoading && <p className="text-slate-400 text-sm">Lade Fahrzeuge…</p>}
      {!isLoading && vehicles.length === 0 && (
        <p className="text-slate-500 text-sm">Keine Fahrzeuge vorhanden.</p>
      )}

      <div className="flex flex-col gap-3">
        {vehicles.map((v) => (
          <button
            key={v.id}
            onClick={() => pickVehicle(v)}
            className="bg-white border border-slate-200 hover:border-accent/50 hover:shadow-sm rounded-2xl p-4 flex items-center gap-4 text-left transition-all w-full"
          >
            <span className="text-3xl shrink-0">🚗</span>
            <div className="flex-1 min-w-0">
              <p className="text-slate-900 font-semibold truncate">{v.name}</p>
              <p className="text-slate-500 text-sm truncate">{v.make} {v.model} · {v.year}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-accent font-mono text-sm">{v.current_km.toLocaleString('de-DE')} km</p>
              <p className="text-slate-400 text-xs">{v.license_plate ?? ''}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
