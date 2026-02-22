import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="app-shell min-h-screen">
      <div className="pointer-events-none absolute -left-28 top-24 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-14 h-72 w-72 rounded-full bg-teal-200/50 blur-3xl" />
      <div className="pointer-events-none absolute bottom-6 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-orange-100/60 blur-3xl" />
      <Navbar />
      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
