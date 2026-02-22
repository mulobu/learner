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
      className="card-lift group block rounded-2xl border border-white/80 bg-white/85 p-6 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.6)]"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="meta-font rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-teal-700">
          Book
        </span>
        <span className="meta-font text-[11px] uppercase tracking-wide text-gray-500">
          {book.total_pages} pages
        </span>
      </div>
      <h3 className="line-clamp-2 text-lg font-semibold text-gray-900 transition-colors group-hover:text-teal-800">
        {book.title}
      </h3>
      {book.author && (
        <p className="mt-1 text-sm text-gray-600">{book.author}</p>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
        <span className="meta-font">{formatDate(book.created_at)}</span>
        <span className="text-teal-700">Open roadmap</span>
      </div>
    </Link>
  )
}
