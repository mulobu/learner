import { Link } from 'react-router-dom'
import { useAdminUsersWithCourses } from '../hooks/useBooks'
import usePageTitle from '../hooks/usePageTitle'
import Spinner from '../components/ui/Spinner'

export default function AdminUsersPage() {
  usePageTitle('Crew Roster')
  const { data, isLoading, isError } = useAdminUsersWithCourses(true)

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <p className="py-12 text-center text-[var(--error)]">
        Failed to load users and courses.
      </p>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Users and Courses</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Admin view of all users and the books/courses they own.
      </p>

      <div className="mt-8 space-y-4">
        {data.map((user) => (
          <div
            key={user.id}
            className="surface-card p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-[var(--text-primary)]">
                  {user.full_name || user.email}
                </p>
                <p className="text-sm text-[var(--text-secondary)]">{user.email}</p>
              </div>
              <div className="rounded-lg bg-[var(--bg-muted)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
                {user.role} | {user.total_courses} course(s)
              </div>
            </div>

            <div className="mt-4">
              {user.books.length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)]">No courses yet.</p>
              ) : (
                <ul className="space-y-2">
                  {user.books.map((book) => (
                    <li
                      key={book.id}
                      className="flex items-center justify-between rounded-lg border border-[var(--border-soft)] px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{book.title}</p>
                        <p className="text-xs text-[var(--text-tertiary)]">{book.total_pages} pages</p>
                      </div>
                      <Link
                        to={`/books/${book.id}`}
                        className="text-xs font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]"
                      >
                        Open
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
