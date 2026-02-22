import { useQuery } from '@tanstack/react-query'
import { resourcesApi } from '../services/api'

export function useResources(unitId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['units', unitId, 'resources'],
    queryFn: () => resourcesApi.getResources(unitId).then((r) => r.data),
    enabled: !!unitId && enabled,
  })
}
