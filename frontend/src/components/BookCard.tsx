import { Link } from 'react-router-dom'
import type { BookSummary } from '../types/book'
import { formatDate } from '../utils/formatters'

interface BookCardProps {
  book: BookSummary
}

export default function BookCard({ book }: BookCardProps) {
  return (
    <Link
      to={`/books/${book.id}`}
      data-book-card
      className="card-lift group block surface-card p-6 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="meta-font rounded-full bg-[var(--primary-soft)] px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[var(--primary)]">
          Book
        </span>
        <span className="meta-font text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
          {book.total_pages} pages
        </span>
      </div>
      <h3 className="line-clamp-2 text-lg font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[var(--primary)]">
        {book.title}
      </h3>
      {book.author && (
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{book.author}</p>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-[var(--border-soft)] pt-3 text-xs text-[var(--text-tertiary)]">
        <span className="meta-font">{formatDate(book.created_at)}</span>
        <span className="text-[var(--primary)]">Open roadmap</span>
      </div>
    </Link>
  )
}
