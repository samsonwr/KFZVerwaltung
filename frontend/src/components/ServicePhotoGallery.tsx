import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'

interface ServicePhotoGalleryProps {
  photos: string[]
  serviceId: number
  onDelete?: (filename: string) => void
}

function getPhotoUrl(path: string): string {
  if (path.startsWith('http')) return path
  return `/static/${path}`
}

function getFilename(path: string): string {
  return path.split('/').pop() ?? path
}

export default function ServicePhotoGallery({
  photos,
  serviceId,
  onDelete,
}: ServicePhotoGalleryProps) {
  const qc = useQueryClient()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (filename: string) => api.services.deletePhoto(serviceId, filename),
    onSuccess: (_data, filename) => {
      qc.invalidateQueries({ queryKey: ['service', serviceId] })
      onDelete?.(filename)
      setConfirmDelete(null)
    },
  })

  if (photos.length === 0) {
    return (
      <p className="text-slate-500 text-sm italic">Keine Fotos vorhanden.</p>
    )
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {photos.map((photo, i) => {
          const filename = getFilename(photo)
          return (
            <div key={i} className="relative group">
              <a href={getPhotoUrl(photo)} target="_blank" rel="noopener noreferrer">
                <img
                  src={getPhotoUrl(photo)}
                  alt={`Foto ${i + 1}`}
                  className="w-full h-24 object-cover rounded border border-slate-700 hover:border-accent/60 transition-colors cursor-pointer"
                />
              </a>
              <button
                onClick={() => setConfirmDelete(filename)}
                className="absolute top-1 right-1 bg-danger/90 hover:bg-danger text-white rounded-full w-6 h-6 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                title="Foto löschen"
              >
                &#215;
              </button>
            </div>
          )
        })}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-slate-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-slate-100 font-semibold mb-2">Foto löschen?</h3>
            <p className="text-slate-400 text-sm mb-4 break-all">{confirmDelete}</p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate(confirmDelete)}
                disabled={deleteMutation.isPending}
                className="btn-danger flex-1"
              >
                {deleteMutation.isPending ? 'Lösche...' : 'Löschen'}
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary flex-1"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
