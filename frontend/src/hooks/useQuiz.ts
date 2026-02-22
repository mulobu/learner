import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { quizApi } from '../services/api'
import type { AnswerSubmission } from '../types/quiz'

export function useQuiz(unitId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['units', unitId, 'quiz'],
    queryFn: () => quizApi.getQuiz(unitId).then((r) => r.data),
    enabled: !!unitId && enabled,
  })
}

export function useCreateAttempt() {
  return useMutation({
    mutationFn: (unitId: string) => quizApi.createAttempt(unitId).then((r) => r.data),
  })
}

export function useSubmitQuiz() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      attemptId,
      answers,
    }: {
      attemptId: string
      answers: AnswerSubmission[]
    }) => quizApi.submitAttempt(attemptId, answers).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
    },
  })
}

export function useAttemptHistory(unitId: string) {
  return useQuery({
    queryKey: ['units', unitId, 'quiz', 'attempts'],
    queryFn: () => quizApi.getAttemptHistory(unitId).then((r) => r.data),
    enabled: !!unitId,
  })
}

export function useAttemptDetail(attemptId: string) {
  return useQuery({
    queryKey: ['quiz', 'attempts', attemptId],
    queryFn: () => quizApi.getAttemptDetail(attemptId).then((r) => r.data),
    enabled: !!attemptId,
  })
}
