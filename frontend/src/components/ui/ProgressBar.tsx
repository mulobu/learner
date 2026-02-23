interface ProgressBarProps {
  value: number
  className?: string
}

export default function ProgressBar({ value, className = '' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-muted)] ${className}`}>
      <div
        className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
