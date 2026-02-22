import { useParams, useNavigate } from 'react-router-dom'
import { useBookDetail, useBookProgress, useDeleteBook } from '../hooks/useBooks'
import UnitTreeItem from '../components/UnitTreeItem'
import ProgressBar from '../components/ui/ProgressBar'
import Spinner from '../components/ui/Spinner'
import { formatPercentage } from '../utils/formatters'

export default function BookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()
  const { data: book, isLoading, isError } = useBookDetail(bookId!)
  const { data: progress } = useBookProgress(bookId!)
  const deleteBook = useDeleteBook()

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (isError || !book) {
    return (
      <p className="py-12 text-center text-red-600">
        Failed to load book details.
      </p>
    )
  }

  const handleDelete = () => {
    if (window.confirm(`Delete "${book.title}"? This cannot be undone.`)) {
      deleteBook.mutate(book.id, { onSuccess: () => navigate('/') })
    }
  }

  return (
    <div>
      <button
        onClick={() => navigate('/')}
        className="mb-4 text-sm text-gray-600 hover:text-gray-800"
      >
        &larr; Back to Books
      </button>

      <div className="rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.55)]">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{book.title}</h1>
            {book.author && (
              <p className="mt-1 text-gray-600">{book.author}</p>
            )}
            <p className="meta-font mt-1 text-xs uppercase tracking-wide text-gray-500">
              {book.total_pages} pages
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="rounded-lg px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>

        {progress && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-700">Course Progress</span>
              <span className="font-semibold text-teal-700">
                {formatPercentage(progress.progress.completion_percentage)}
              </span>
            </div>
            <ProgressBar value={progress.progress.completion_percentage} />
            <div className="meta-font mt-2 flex gap-4 text-xs text-gray-500">
              <span>{progress.progress.completed_units} completed</span>
              <span>{progress.progress.in_progress_units} in progress</span>
              <span>{progress.progress.not_started_units} not started</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Course Roadmap
        </h2>
        <div className="rounded-2xl border border-white/85 bg-white/90">
          {book.units.map((unit) => (
            <UnitTreeItem key={unit.id} unit={unit} />
          ))}
        </div>
      </div>
    </div>
  )
}
