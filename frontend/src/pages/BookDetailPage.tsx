import { useParams, useNavigate } from 'react-router-dom'
import { useBookDetail, useBookProgress, useDeleteBook } from '../hooks/useBooks'
import usePageTitle from '../hooks/usePageTitle'
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
  usePageTitle(book?.title ? `${book.title} - Book Odyssey` : 'Book Odyssey')

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (isError || !book) {
    return (
      <p className="py-12 text-center text-[var(--error)]">
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
        className="mb-4 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        &larr; Back to Books
      </button>

      <div className="surface-card p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)]">{book.title}</h1>
            {book.author && (
              <p className="mt-1 text-[var(--text-secondary)]">{book.author}</p>
            )}
            <p className="meta-font mt-1 text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
              {book.total_pages} pages
            </p>
          </div>
          <button
            onClick={handleDelete}
            className="rounded-lg px-3 py-1.5 text-sm text-[var(--error)] hover:bg-[var(--error-soft)]"
          >
            Delete
          </button>
        </div>

        {progress && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-[var(--text-secondary)]">Course Progress</span>
              <span className="font-semibold text-[var(--primary)]">
                {formatPercentage(progress.progress.completion_percentage)}
              </span>
            </div>
            <ProgressBar value={progress.progress.completion_percentage} />
            <div className="meta-font mt-2 flex gap-4 text-xs text-[var(--text-tertiary)]">
              <span>{progress.progress.completed_units} completed</span>
              <span>{progress.progress.in_progress_units} in progress</span>
              <span>{progress.progress.not_started_units} not started</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold text-[var(--text-primary)]">
          Course Roadmap
        </h2>
        <div className="surface-card">
          {book.units.map((unit) => (
            <UnitTreeItem key={unit.id} unit={unit} />
          ))}
        </div>
      </div>
    </div>
  )
}
