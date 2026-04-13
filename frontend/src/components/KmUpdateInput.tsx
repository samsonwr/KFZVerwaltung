import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

interface KmUpdateInputProps {
  vehicleId: number
  currentKm: number
}

export default function KmUpdateInput({ vehicleId, currentKm }: KmUpdateInputProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(currentKm))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  function startEdit() {
    setValue(String(currentKm))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  async function commit() {
    const parsed = parseInt(value, 10)
    if (isNaN(parsed) || parsed < 0 || parsed === currentKm) {
      setEditing(false)
      return
    }
    setSaving(true)
    try {
      await api.vehicles.updateKm(vehicleId, parsed)
      await qc.invalidateQueries({ queryKey: ['vehicles'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch {
      setValue(String(currentKm))
    } finally {
      setSaving(false)
      setEditing(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') {
      setValue(String(currentKm))
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        disabled={saving}
        className="w-32 font-mono text-accent bg-surface border border-accent/60 rounded px-2 py-0.5 text-sm focus:outline-none focus:border-accent"
      />
    )
  }

  return (
    <button
      onClick={startEdit}
      title="Klicken zum Bearbeiten"
      className="font-mono text-accent hover:text-amber-300 transition-colors text-sm flex items-center gap-1 group"
    >
      {currentKm.toLocaleString('de-DE')} km
      <span className="opacity-0 group-hover:opacity-60 text-xs">&#9998;</span>
    </button>
  )
}
