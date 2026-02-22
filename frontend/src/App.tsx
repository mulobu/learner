import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAdmin from './components/RequireAdmin'
import RequireAuth from './components/RequireAuth'
import AdminUsersPage from './pages/AdminUsersPage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import BookDetailPage from './pages/BookDetailPage'
import UnitPage from './pages/UnitPage'
import QuizPage from './pages/QuizPage'
import QuizResultsPage from './pages/QuizResultsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/books/:bookId" element={<BookDetailPage />} />
          <Route path="/units/:unitId" element={<UnitPage />} />
          <Route path="/units/:unitId/quiz" element={<QuizPage />} />
          <Route path="/units/:unitId/quiz/results/:attemptId" element={<QuizResultsPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
