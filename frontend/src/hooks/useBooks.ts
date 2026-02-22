import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, booksApi, dashboardApi } from '../services/api'

export function useBooks() {
  return useQuery({
    queryKey: ['books'],
    queryFn: () => booksApi.list().then((r) => r.data),
  })
}

export function useBookDetail(bookId: string) {
  return useQuery({
    queryKey: ['books', bookId],
    queryFn: () => booksApi.getDetail(bookId).then((r) => r.data),
    enabled: !!bookId,
  })
}

export function useBookProgress(bookId: string) {
  return useQuery({
    queryKey: ['books', bookId, 'progress'],
    queryFn: () => booksApi.getProgress(bookId).then((r) => r.data),
    enabled: !!bookId,
  })
}

export function useUploadBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => booksApi.upload(file).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteBook() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (bookId: string) => booksApi.delete(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then((r) => r.data),
  })
}

export function useAdminUsersWithCourses(enabled: boolean = true) {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.listUsers().then((r) => r.data),
    enabled,
  })
}
