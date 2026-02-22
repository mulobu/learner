interface EmptyStateProps {
  title: string
  description: string
  children?: React.ReactNode
}

export default function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
      <h3 className="mt-2 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  )
}
