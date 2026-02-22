export default function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent text-indigo-600 ${className}`}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}
