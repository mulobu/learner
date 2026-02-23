import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth()

  return (
    <nav className="sticky top-0 z-20 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between py-3">
          <Link to="/" className="flex items-center gap-2 text-[var(--primary)]">
            <span
              aria-hidden="true"
              className="meta-font flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-[11px] font-bold uppercase tracking-widest text-white shadow-sm"
            >
              LS
            </span>
            <span className="display-font text-2xl font-semibold">Learner Studio</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
              My Books
            </Link>
            {isAdmin && (
              <Link
                to="/admin/users"
                className="text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Admin
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin/pitch-deck"
                className="text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                Pitch Deck
              </Link>
            )}
            <div className="glass-panel rounded-lg px-3 py-1 text-right">
              <p className="text-xs font-medium text-[var(--text-primary)]">
                {user?.full_name || user?.email}
              </p>
              <p className="meta-font text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
                {user?.role}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-[var(--border)] bg-[var(--primary-soft)] px-3 py-1.5 text-xs font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary-muted)]"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
