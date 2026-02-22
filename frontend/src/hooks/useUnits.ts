import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { unitsApi } from '../services/api'

export function useUnitDetail(unitId: string) {
  return useQuery({
    queryKey: ['units', unitId],
    queryFn: () => unitsApi.getDetail(unitId).then((r) => r.data),
    enabled: !!unitId,
  })
}

export function useProcessUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (unitId: string) => unitsApi.process(unitId).then((r) => r.data),
    onSuccess: (processingStatus, unitId) => {
      queryClient.invalidateQueries({ queryKey: ['units', unitId] })
      queryClient.setQueryData(
        ['units', unitId, 'processing-status'],
        processingStatus,
      )
    },
  })
}

export function useProcessingStatus(unitId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['units', unitId, 'processing-status'],
    queryFn: () => unitsApi.getProcessingStatus(unitId).then((r) => r.data),
    enabled,
    refetchInterval: (query) => {
      const data = query.state.data
      if (data?.status === 'processing') return 2000
      return false
    },
  })
}

export function useUpdateUnitStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ unitId, status }: { unitId: string; status: string }) =>
      unitsApi.updateStatus(unitId, status),
    onSuccess: (_, { unitId }) => {
      queryClient.invalidateQueries({ queryKey: ['units', unitId] })
      queryClient.invalidateQueries({ queryKey: ['books'] })
    },
  })
}
