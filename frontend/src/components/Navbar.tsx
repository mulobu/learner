import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth()

  return (
    <nav className="sticky top-0 z-20 border-b border-white/60 bg-white/60 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between py-3">
          <Link to="/" className="display-font text-2xl font-semibold text-teal-800">
            Learner Studio
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-950">
              My Books
            </Link>
            {isAdmin && (
              <Link
                to="/admin/users"
                className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-950"
              >
                Admin
              </Link>
            )}
            <div className="glass-panel rounded-lg px-3 py-1 text-right">
              <p className="text-xs font-medium text-gray-800">
                {user?.full_name || user?.email}
              </p>
              <p className="meta-font text-[11px] uppercase tracking-wide text-gray-500">
                {user?.role}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-100"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
