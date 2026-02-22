import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { UnitTreeNode } from '../types/book'
import Badge from './ui/Badge'

interface UnitTreeItemProps {
  unit: UnitTreeNode
  depth?: number
}

const statusConfig = {
  not_started: { label: 'Not Started', variant: 'gray' as const },
  in_progress: { label: 'In Progress', variant: 'yellow' as const },
  completed: { label: 'Completed', variant: 'green' as const },
}

export default function UnitTreeItem({ unit, depth = 0 }: UnitTreeItemProps) {
  const [expanded, setExpanded] = useState(depth < 1)
  const hasChildren = unit.children.length > 0
  const config = statusConfig[unit.status] || statusConfig.not_started

  return (
    <div>
      <div
        className={`flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-amber-50/70 ${
          depth > 0 ? 'ml-6' : ''
        }`}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-400 hover:text-gray-600"
          >
            <svg
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="w-5" />
        )}

        <Link
          to={`/units/${unit.id}`}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              unit.status === 'completed'
                ? 'bg-green-500'
                : unit.status === 'in_progress'
                  ? 'bg-amber-500'
                  : 'bg-gray-300'
            }`}
          />
          <span className="truncate text-sm text-gray-900">{unit.title}</span>
          <Badge variant={config.variant}>{config.label}</Badge>
          <span className="meta-font ml-auto shrink-0 text-[11px] text-gray-500">
            p.{unit.start_page}-{unit.end_page}
          </span>
        </Link>
      </div>

      {expanded &&
        hasChildren &&
        unit.children.map((child) => (
          <UnitTreeItem key={child.id} unit={child} depth={depth + 1} />
        ))}
    </div>
  )
}
