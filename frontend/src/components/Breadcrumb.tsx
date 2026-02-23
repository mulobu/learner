import { Link } from 'react-router-dom'

interface BreadcrumbSegment {
  label: string
  to?: string
}

interface BreadcrumbProps {
  segments: BreadcrumbSegment[]
}

export default function Breadcrumb({ segments }: BreadcrumbProps) {
  if (segments.length === 0) return null

  return (
    <nav className="mb-6 flex items-center gap-1.5 text-sm">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <svg className="h-3.5 w-3.5 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
            {isLast || !seg.to ? (
              <span className="font-medium text-[var(--text-primary)]">{seg.label}</span>
            ) : (
              <Link to={seg.to} className="text-[var(--text-secondary)] hover:text-[var(--primary)]">
                {seg.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
