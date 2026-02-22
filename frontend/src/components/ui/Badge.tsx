const variants: Record<string, string> = {
  green: 'bg-green-100 text-green-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  gray: 'bg-gray-100 text-gray-800',
  indigo: 'bg-teal-100 text-teal-800',
  red: 'bg-red-100 text-red-800',
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
