import { apiClient } from './client'
import type { 
  DirectOrder, 
  DirectOrderFilters, 
  DirectOrderListResponse,
  DirectOrderDelhiveryResponse,
  DirectOrderExecutiveDashboardResponse,
  DirectOrderBulkForwardResponse,
  DirectOrderPincodeLookupResponse,
  NextDirectOrderIdResponse,
  CreateDirectOrderRequest,
  UpdateDirectOrderRequest
} from '@/types'

export const directOrdersApi = {
  create: async (data: CreateDirectOrderRequest): Promise<DirectOrder> => {
    const response = await apiClient.post<DirectOrder>('/api/v1/direct-orders', data)
    return response.data
  },

  getById: async (orderId: string): Promise<DirectOrder> => {
    const response = await apiClient.get<DirectOrder>(`/api/v1/direct-orders/${orderId}`)
    return response.data
  },

  update: async (orderId: string, data: UpdateDirectOrderRequest): Promise<DirectOrder> => {
    const response = await apiClient.patch<DirectOrder>(`/api/v1/direct-orders/${orderId}`, data)
    return response.data
  },

  delete: async (orderId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/v1/direct-orders/${orderId}`)
    return response.data
  },

  list: async (filters: DirectOrderFilters = {}): Promise<DirectOrderListResponse> => {
    const response = await apiClient.get<DirectOrderListResponse>('/api/v1/direct-orders', { params: filters })
    return response.data
  },

  getExecutiveDashboard: async (filters: {
    dateRange: string
    fromDate?: string
    toDate?: string
    state?: string
    city?: string
    thickness?: string
    orderStatus?: string
  }): Promise<DirectOrderExecutiveDashboardResponse> => {
    const response = await apiClient.get<DirectOrderExecutiveDashboardResponse>('/api/v1/direct-orders/dashboard/executive', {
      params: {
        date_range: filters.dateRange,
        from_date: filters.fromDate,
        to_date: filters.toDate,
        state: filters.state,
        city: filters.city,
        thickness: filters.thickness,
        order_status: filters.orderStatus,
      },
    })
    return response.data
  },

  search: async (filters: DirectOrderFilters = {}): Promise<DirectOrderListResponse> => {
    const response = await apiClient.get<DirectOrderListResponse>('/api/v1/direct-orders/search', { params: filters })
    return response.data
  },

  getNextOrderId: async (): Promise<NextDirectOrderIdResponse> => {
    const response = await apiClient.get<NextDirectOrderIdResponse>('/api/v1/direct-orders/next-order-id')
    return response.data
  },

  lookupPincode: async (pincode: string): Promise<DirectOrderPincodeLookupResponse> => {
    const response = await apiClient.get<DirectOrderPincodeLookupResponse>('/api/v1/direct-orders/delhivery/pincode-lookup', {
      params: { pincode },
    })
    return response.data
  },

  exportCSV: async (filters: DirectOrderFilters = {}): Promise<Blob> => {
    const response = await apiClient.get('/api/v1/direct-orders/export', {
      params: filters,
      responseType: 'blob'
    })
    return response.data
  },

  createDelhiveryForwardOrder: async (orderId: string): Promise<DirectOrderDelhiveryResponse> => {
    const response = await apiClient.post<DirectOrderDelhiveryResponse>(`/api/v1/direct-orders/${orderId}/delhivery/forward-order`)
    return response.data
  },

  createBulkDelhiveryForwardOrders: async (orderIds: string[]): Promise<DirectOrderBulkForwardResponse> => {
    const response = await apiClient.post<DirectOrderBulkForwardResponse>('/api/v1/direct-orders/delhivery/forward-orders/bulk', {
      order_ids: orderIds,
    })
    return response.data
  }
}
