import { useRef, useState, DragEvent } from 'react'

interface PhotoUploadProps {
  onUpload: (files: File[]) => void
  label?: string
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

export default function PhotoUpload({ onUpload, label = 'Fotos hochladen' }: PhotoUploadProps) {
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files) return
    const accepted = Array.from(files).filter((f) => ACCEPTED.includes(f.type))
    if (accepted.length === 0) return
    const newPreviews = accepted.map((f) => ({ url: URL.createObjectURL(f), name: f.name }))
    setPreviews((prev) => [...prev, ...newPreviews])
    onUpload(accepted)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function removePreview(idx: number) {
    setPreviews((prev) => {
      const next = [...prev]
      URL.revokeObjectURL(next[idx].url)
      next.splice(idx, 1)
      return next
    })
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-accent bg-accent/10'
            : 'border-slate-600 hover:border-accent/60 hover:bg-slate-800/50'
        }`}
      >
        <div className="text-3xl mb-2 text-slate-500">&#128247;</div>
        <p className="text-slate-400 text-sm">{label}</p>
        <p className="text-slate-600 text-xs mt-1">JPG, PNG, WebP &ndash; Drag &amp; Drop oder klicken</p>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {previews.map((p, i) => (
            <div key={i} className="relative group">
              <img
                src={p.url}
                alt={p.name}
                className="w-full h-20 object-cover rounded border border-slate-700"
              />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removePreview(i) }}
                className="absolute top-1 right-1 bg-danger text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                &#215;
              </button>
              <p className="text-xs text-slate-500 truncate mt-0.5">{p.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
