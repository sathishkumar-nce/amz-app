import { apiClient } from './client'
import type { OperationsDashboard, OperationsFilters } from '@/types/operations'
export async function getOperationsDashboard(
  filters: OperationsFilters,
): Promise<OperationsDashboard> {
  const response = await apiClient.get<OperationsDashboard>(
    '/api/v1/dashboard/operations',
    { params: filters },
  )
  return response.data
}
