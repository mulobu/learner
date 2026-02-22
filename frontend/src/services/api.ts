import axios from 'axios'
import type { BookSummary, BookDetail, BookProgress, Dashboard } from '../types/book'
import type { UnitDetail, ProcessingStatus } from '../types/unit'
import type { Quiz, QuizAttempt, QuizResult, QuizAttemptSummary, AnswerSubmission } from '../types/quiz'
import type { VideoResource } from '../types/resource'
import type { User, AdminUserWithCourses } from '../types/auth'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

export function setAuthToken(token: string | null) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete apiClient.defaults.headers.common.Authorization
  }
}

export const booksApi = {
  upload: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post<BookSummary>('/books/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  list: () => apiClient.get<BookSummary[]>('/books'),
  getDetail: (bookId: string) => apiClient.get<BookDetail>(`/books/${bookId}`),
  delete: (bookId: string) => apiClient.delete(`/books/${bookId}`),
  getProgress: (bookId: string) => apiClient.get<BookProgress>(`/books/${bookId}/progress`),
}

export const unitsApi = {
  getDetail: (unitId: string) => apiClient.get<UnitDetail>(`/units/${unitId}`),
  process: (unitId: string) => apiClient.post<ProcessingStatus>(`/units/${unitId}/process`),
  getProcessingStatus: (unitId: string) =>
    apiClient.get<ProcessingStatus>(`/units/${unitId}/processing-status`),
  updateStatus: (unitId: string, status: string) =>
    apiClient.patch(`/units/${unitId}/status`, { status }),
}

export const quizApi = {
  getQuiz: (unitId: string) => apiClient.get<Quiz>(`/units/${unitId}/quiz`),
  createAttempt: (unitId: string) =>
    apiClient.post<QuizAttempt>(`/units/${unitId}/quiz/attempts`),
  submitAttempt: (attemptId: string, answers: AnswerSubmission[]) =>
    apiClient.post<QuizResult>(`/quiz/attempts/${attemptId}/submit`, { answers }),
  getAttemptHistory: (unitId: string) =>
    apiClient.get<QuizAttemptSummary[]>(`/units/${unitId}/quiz/attempts`),
  getAttemptDetail: (attemptId: string) =>
    apiClient.get<QuizResult>(`/quiz/attempts/${attemptId}`),
}

export const resourcesApi = {
  getResources: (unitId: string) =>
    apiClient.get<VideoResource[]>(`/units/${unitId}/resources`),
}

export const dashboardApi = {
  get: () => apiClient.get<Dashboard>('/dashboard'),
}

export const authApi = {
  me: () => apiClient.get<User>('/auth/me'),
}

export const adminApi = {
  listUsers: () => apiClient.get<AdminUserWithCourses[]>('/admin/users'),
}
