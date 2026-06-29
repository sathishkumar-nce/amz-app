import { apiClient } from './client'
import type { AmazonRowHighlightRule } from '@/types'

export const amazonRowHighlightRulesApi = {
  list: async (): Promise<{ rules: AmazonRowHighlightRule[] }> => {
    const response = await apiClient.get<{ rules: AmazonRowHighlightRule[] }>('/api/v1/amazon-row-highlight-rules')
    return response.data
  },

  updateAll: async (rules: AmazonRowHighlightRule[]): Promise<{ rules: AmazonRowHighlightRule[] }> => {
    const response = await apiClient.put<{ rules: AmazonRowHighlightRule[] }>('/api/v1/amazon-row-highlight-rules', { rules })
    return response.data
  },

  resetDefaults: async (): Promise<{ rules: AmazonRowHighlightRule[] }> => {
    const response = await apiClient.post<{ rules: AmazonRowHighlightRule[] }>('/api/v1/amazon-row-highlight-rules/reset')
    return response.data
  },
}
