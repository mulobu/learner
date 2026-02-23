import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useBookDetail } from '../hooks/useBooks'
import type { UnitTreeNode } from '../types/book'

interface BookSidebarProps {
  bookId: string
}

function flattenUnits(units: UnitTreeNode[]): UnitTreeNode[] {
  const flat: UnitTreeNode[] = []
  for (const u of units) {
    flat.push(u)
    if (u.children.length > 0) {
      flat.push(...flattenUnits(u.children))
    }
  }
  return flat
}

function SidebarUnit({ unit, depth, isActive }: { unit: UnitTreeNode; depth: number; isActive: boolean }) {
  return (
    <Link
      to={`/units/${unit.id}`}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        isActive
          ? 'bg-[var(--primary-soft)] text-[var(--primary)] font-medium border-l-2 border-[var(--primary)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-primary)]'
      }`}
      style={{ paddingLeft: `${12 + depth * 16}px` }}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${
          unit.status === 'completed'
            ? 'bg-[var(--success)]'
            : unit.status === 'in_progress'
              ? 'bg-[var(--warning)]'
              : 'bg-[var(--bg-elevated)]'
        }`}
      />
      <span className="truncate">{unit.title}</span>
    </Link>
  )
}

function renderUnits(units: UnitTreeNode[], depth: number, activeUnitId: string | undefined) {
  return units.map((unit) => (
    <div key={unit.id}>
      <SidebarUnit unit={unit} depth={depth} isActive={unit.id === activeUnitId} />
      {unit.children.length > 0 && renderUnits(unit.children, depth + 1, activeUnitId)}
    </div>
  ))
}

export default function BookSidebar({ bookId }: BookSidebarProps) {
  const { data: book } = useBookDetail(bookId)
  const { unitId } = useParams<{ unitId?: string }>()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('learner_sidebar_collapsed') === 'true' } catch { return false }
  })
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try { localStorage.setItem('learner_sidebar_collapsed', String(collapsed)) } catch { /* ignore */ }
  }, [collapsed])

  if (!book) return null

  const unitCount = flattenUnits(book.units).length

  // Desktop sidebar
  const sidebarContent = (
    <div className="space-y-0.5">
      <div className="mb-3 px-3">
        <p className="meta-font text-[10px] uppercase tracking-wider text-[var(--text-tertiary)]">
          {unitCount} units
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-[var(--text-primary)]">
          {book.title}
        </p>
      </div>
      {renderUnits(book.units, 0, unitId)}
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:block sticky top-20 shrink-0 self-start overflow-y-auto rounded-2xl transition-all duration-200 ${
          collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-64'
        }`}
        style={{ maxHeight: 'calc(100vh - 6rem)' }}
      >
        <div className="surface-muted p-3">
          {sidebarContent}
        </div>
      </aside>

      {/* Desktop collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex fixed left-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        title={collapsed ? 'Show sidebar' : 'Hide sidebar'}
      >
        <svg className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-lg"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile bottom sheet */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-[var(--bg-surface)] p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Units</p>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div onClick={() => setMobileOpen(false)}>
              {sidebarContent}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
