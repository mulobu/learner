import type { BookSummary } from './book'

export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  book_limit_reached: boolean
  created_at: string
}

export interface AdminUserWithCourses {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  created_at: string
  books: BookSummary[]
  total_courses: number
}

export interface Auth0Session {
  access_token: string
  id_token: string
  expires_at: number
}
