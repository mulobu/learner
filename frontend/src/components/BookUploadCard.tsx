import { useCallback, useState } from 'react'
import { useUploadBook } from '../hooks/useBooks'
import Spinner from './ui/Spinner'

export default function BookUploadCard() {
  const upload = useUploadBook()
  const [dragActive, setDragActive] = useState(false)

  const handleFile = useCallback(
    (file: File) => {
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are accepted.')
        return
      }
      upload.mutate(file)
    },
    [upload],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      className={`card-lift flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition-colors ${
        dragActive
          ? 'border-teal-500 bg-teal-50'
          : 'border-amber-300/70 bg-white/80 hover:border-teal-400'
      }`}
    >
      {upload.isPending ? (
        <div className="flex flex-col items-center gap-2">
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-gray-700">Uploading and extracting table of contents...</p>
        </div>
      ) : (
        <>
          <svg
            className="mx-auto h-12 w-12 text-teal-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1"
            />
          </svg>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            Drop a PDF book here
          </p>
          <p className="mt-1 text-xs text-gray-600">or click to browse</p>
          <label className="mt-4 cursor-pointer rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800">
            Select PDF
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleChange}
              className="hidden"
            />
          </label>
        </>
      )}
      {upload.isError && (
        <p className="mt-3 text-sm text-red-700">
          {(upload.error as Error & { response?: { data?: { detail?: string } } })
            ?.response?.data?.detail || 'Upload failed. Please try again.'}
        </p>
      )}
    </div>
  )
}
