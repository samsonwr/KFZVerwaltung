import { useQuery } from '@tanstack/react-query'
import api from '../api/client'
import VehicleCard from '../components/VehicleCard'
import { Link } from 'react-router-dom'

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
      <div className="flex gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-100" />
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-slate-100 rounded w-1/2" />
          <div className="h-4 bg-slate-100 rounded w-1/3" />
          <div className="h-4 bg-slate-100 rounded w-2/3" />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.dashboard.getSummary,
    staleTime: 30_000,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Übersicht aller Fahrzeuge</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/vehicles"
            className="btn-secondary text-sm"
          >
            + Fahrzeug
          </Link>
          <a
            href={api.export.getDashboardPdfUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm"
          >
            &#128196; PDF
          </a>
        </div>
      </div>

      {isError && (
        <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-4 mb-6">
          <p className="font-semibold">Fehler beim Laden</p>
          <p className="text-sm mt-1 text-danger/80">
            {error instanceof Error ? error.message : 'Unbekannter Fehler'}
          </p>
        </div>
      )}

      {data && data.total_overdue > 0 && (
        <div className="bg-danger/10 border border-danger/30 text-danger rounded-lg p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">&#9888;</span>
          <div>
            <p className="font-bold">
              {data.total_overdue} überfällige{data.total_overdue === 1 ? 'r' : ''} Service
            </p>
            <p className="text-sm text-danger/80">
              Sofortige Aufmerksamkeit erforderlich &mdash;{' '}
              <Link to="/planning" className="underline hover:no-underline">
                Zur Planung
              </Link>
            </p>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {data && data.vehicles.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">&#128663;</div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Keine Fahrzeuge</h2>
          <p className="text-slate-500 mb-6">Füge dein erstes Fahrzeug hinzu, um loszulegen.</p>
          <Link to="/vehicles" className="btn-accent">
            + Erstes Fahrzeug hinzufügen
          </Link>
        </div>
      )}

      {data && data.vehicles.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.vehicles.map((summary) => (
            <VehicleCard key={summary.vehicle.id} summary={summary} />
          ))}
        </div>
      )}
    </div>
  )
}
