interface EmptyStateProps {
  title: string
  description: string
  children?: React.ReactNode
}

export default function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] p-12 text-center">
      <h3 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}
