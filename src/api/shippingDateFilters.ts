import { apiClient } from './client'
import type { ShippingDateFilterSetting, ShippingDateFilterStateResponse } from '@/types'

export const shippingDateFiltersApi = {
  list: async (): Promise<ShippingDateFilterStateResponse> => {
    const response = await apiClient.get<ShippingDateFilterStateResponse>('/api/v1/shipping-date-filters')
    return response.data
  },

  updateAll: async (filters: ShippingDateFilterSetting[]): Promise<ShippingDateFilterStateResponse> => {
    const response = await apiClient.put<ShippingDateFilterStateResponse>('/api/v1/shipping-date-filters', { filters })
    return response.data
  },

  setActive: async (filterKey: string): Promise<ShippingDateFilterStateResponse> => {
    const response = await apiClient.put<ShippingDateFilterStateResponse>('/api/v1/shipping-date-filters/active', { filter_key: filterKey })
    return response.data
  },

  resetDefaults: async (): Promise<ShippingDateFilterStateResponse> => {
    const response = await apiClient.post<ShippingDateFilterStateResponse>('/api/v1/shipping-date-filters/reset')
    return response.data
  },
}
