import { Link } from 'react-router-dom'
import { useAdminUsersWithCourses } from '../hooks/useBooks'
import Spinner from '../components/ui/Spinner'

export default function AdminUsersPage() {
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
      <p className="py-12 text-center text-red-600">
        Failed to load users and courses.
      </p>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Users and Courses</h1>
      <p className="mt-1 text-sm text-gray-500">
        Admin view of all users and the books/courses they own.
      </p>

      <div className="mt-8 space-y-4">
        {data.map((user) => (
          <div
            key={user.id}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-gray-900">
                  {user.full_name || user.email}
                </p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
              <div className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {user.role} | {user.total_courses} course(s)
              </div>
            </div>

            <div className="mt-4">
              {user.books.length === 0 ? (
                <p className="text-sm text-gray-500">No courses yet.</p>
              ) : (
                <ul className="space-y-2">
                  {user.books.map((book) => (
                    <li
                      key={book.id}
                      className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{book.title}</p>
                        <p className="text-xs text-gray-500">{book.total_pages} pages</p>
                      </div>
                      <Link
                        to={`/books/${book.id}`}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
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
