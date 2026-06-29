import { apiClient } from './client'
import type { OrderPriorityRule, OrderPriorityRulesResponse, UpdateOrderPriorityRulesRequest } from '@/types'

export const priorityRulesApi = {
  list: async (): Promise<OrderPriorityRule[]> => {
    const response = await apiClient.get<OrderPriorityRulesResponse>('/api/v1/order-priority-rules')
    return response.data.rules
  },

  update: async (payload: UpdateOrderPriorityRulesRequest): Promise<OrderPriorityRule[]> => {
    const response = await apiClient.put<OrderPriorityRulesResponse>('/api/v1/order-priority-rules', payload)
    return response.data.rules
  },
}
