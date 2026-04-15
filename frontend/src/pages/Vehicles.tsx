import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../api/client'
import type { Vehicle } from '../types'
import VehicleFormModal from '../components/VehicleFormModal'

function DeleteConfirm({ vehicle, onConfirm, onCancel, isDeleting }: {
  vehicle: Vehicle
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-slate-900 font-semibold mb-2">Fahrzeug löschen?</h3>
        <p className="text-slate-500 text-sm mb-1">
          <span className="text-slate-800">{vehicle.name}</span> wird unwiderruflich gelöscht.
        </p>
        <p className="text-slate-400 text-xs mb-4">Alle Service-Einträge und Wartungspläne werden ebenfalls entfernt.</p>
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
    return path.startsWith('http') ? path : `/uploads/${path}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fahrzeuge</h1>
          <p className="text-slate-500 text-sm mt-0.5">{vehicles.length} Fahrzeug{vehicles.length !== 1 ? 'e' : ''}</p>
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
            <div key={i} className="h-16 bg-white rounded-xl animate-pulse border border-slate-200" />
          ))}
        </div>
      )}

      {!isLoading && vehicles.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">&#128663;</div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Noch keine Fahrzeuge</h2>
          <button onClick={() => { setEditVehicle(undefined); setShowModal(true) }} className="btn-accent mt-4">
            + Erstes Fahrzeug hinzufügen
          </button>
        </div>
      )}

      {vehicles.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wide bg-slate-50">
                <th className="text-left px-4 py-3">Fahrzeug</th>
                <th className="text-left px-4 py-3 hidden sm:table-cell">Kennzeichen</th>
                <th className="text-right px-4 py-3 hidden md:table-cell">Kilometerstand</th>
                <th className="text-right px-4 py-3 hidden lg:table-cell">VIN</th>
                <th className="text-right px-4 py-3">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((v) => {
                const photoUrl = getPhotoUrl(v.photo_path)
                return (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {photoUrl ? (
                          <img src={photoUrl} alt={v.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg border border-slate-200">
                            &#128663;
                          </div>
                        )}
                        <div>
                          <Link to={`/vehicles/${v.id}`} className="text-slate-900 font-medium hover:text-accent transition-colors">
                            {v.name}
                          </Link>
                          <p className="text-slate-400 text-xs">{v.make} {v.model} &middot; {v.year}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="font-mono text-slate-600 text-xs">{v.license_plate || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-right">
                      <span className="font-mono text-accent">{v.current_km.toLocaleString('de-DE')} km</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-right">
                      <span className="font-mono text-slate-400 text-xs">{v.vin || '—'}</span>
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

      {showModal && (
        <VehicleFormModal
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
