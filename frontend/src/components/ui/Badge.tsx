const variants: Record<string, string> = {
  green: 'bg-[var(--success-soft)] text-[var(--success)]',
  yellow: 'bg-[var(--warning-soft)] text-[var(--warning)]',
  gray: 'bg-[var(--bg-muted)] text-[var(--text-secondary)]',
  indigo: 'bg-[var(--primary-soft)] text-[var(--primary)]',
  red: 'bg-[var(--error-soft)] text-[var(--error)]',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: keyof typeof variants
}

export default function Badge({ children, variant = 'gray' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant] || variants.gray}`}
    >
      {children}
    </span>
  )
}
