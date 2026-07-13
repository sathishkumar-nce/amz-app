import { apiClient } from './client'
import type { ChangedOrdersByIDsResponse, DashboardAnalytics, ExecutiveDashboardResponse, Order, OrderFilters, OrderListResponse, OrdersByIDsResponse, RepeatCustomerResponse, ReviewFollowupSettingsResponse, ReviewFollowupStateSetting, ReviewQueueFilters, ReviewQueueResponse, ReviewRequestStatus, ReturnsDashboardResponse, SafetyClaimsDashboardResponse, UpdateManualFieldsRequest, UpdateProductManualFieldsRequest, UpdateReviewRequestStatusResponse, Issue, Return, SafetyClaimOrder } from '@/types'
import { normalizeOrder, normalizeOrderListResponse } from '@/utils/orderData'

export const ordersApi = {
  importFromBaseLinker: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/api/v1/orders/import')
    return response.data
  },

  importFromSample: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/api/v1/orders/import-sample')
    return response.data
  },

  list: async (filters: OrderFilters = {}): Promise<OrderListResponse> => {
    const response = await apiClient.get<OrderListResponse>('/api/v1/orders', { params: filters })
    return normalizeOrderListResponse(response.data)
  },

  getById: async (amazonOrderId: string): Promise<Order> => {
    const response = await apiClient.get<Order>(`/api/v1/orders/${amazonOrderId}`)
    return normalizeOrder(response.data)
  },

  getByIDs: async (amazonOrderIds: string[]): Promise<OrdersByIDsResponse> => {
    const response = await apiClient.post<OrdersByIDsResponse>('/api/v1/orders/by-ids', {
      amazon_order_ids: amazonOrderIds,
    })
    return {
      results: response.data.results.map((result) => ({
        ...result,
        order: result.order ? normalizeOrder(result.order) : null,
      })),
      missing_amazon_order_ids: response.data.missing_amazon_order_ids,
    }
  },

  getChangedByIDs: async (amazonOrderIds: string[], since: string): Promise<ChangedOrdersByIDsResponse> => {
    const response = await apiClient.post<ChangedOrdersByIDsResponse>('/api/v1/orders/by-ids/changes', {
      amazon_order_ids: amazonOrderIds,
      since,
    })
    return {
      changed_orders: response.data.changed_orders.map((result) => ({
        ...result,
        order: result.order ? normalizeOrder(result.order) : null,
      })),
      missing_amazon_order_ids: response.data.missing_amazon_order_ids,
      server_time: response.data.server_time,
    }
  },

  updateManualFields: async (amazonOrderId: string, data: UpdateManualFieldsRequest): Promise<Order> => {
    const response = await apiClient.patch<Order>(`/api/v1/orders/${amazonOrderId}/manual`, data)
    return normalizeOrder(response.data)
  },

  updateProductManualFields: async (
    amazonOrderId: string,
    orderProductId: number,
    data: UpdateProductManualFieldsRequest,
  ): Promise<Order> => {
    const response = await apiClient.patch<Order>(`/api/v1/orders/${amazonOrderId}/products/${orderProductId}/manual`, data)
    return normalizeOrder(response.data)
  },

  listIssues: async (filters: OrderFilters = {}): Promise<OrderListResponse> => {
    const response = await apiClient.get<OrderListResponse>('/api/v1/issues', { params: filters })
    return normalizeOrderListResponse(response.data)
  },

  listReturns: async (filters: OrderFilters = {}): Promise<OrderListResponse> => {
    const response = await apiClient.get<OrderListResponse>('/api/v1/returns', { params: filters })
    return normalizeOrderListResponse(response.data)
  },

  listSafetyClaims: async (filters: OrderFilters = {}): Promise<OrderListResponse> => {
    const response = await apiClient.get<OrderListResponse>('/api/v1/safety-claims', { params: filters })
    return normalizeOrderListResponse(response.data)
  },

  getDashboardAnalytics: async (options: {
    chartDays?: number
    missingRiskDays?: number
    dateFrom?: string
    dateTo?: string
  } = {}): Promise<DashboardAnalytics> => {
    const response = await apiClient.get<DashboardAnalytics>('/api/v1/orders/analytics/dashboard', {
      params: {
        chart_days: options.chartDays ?? 30,
        missing_risk_days: options.missingRiskDays ?? 7,
        date_from: options.dateFrom,
        date_to: options.dateTo,
      }
    })
    return response.data
  },

  getRepeatOrderCustomers: async (filters: Pick<OrderFilters, 'confirmed_date_from' | 'confirmed_date_to'> = {}): Promise<RepeatCustomerResponse> => {
    const response = await apiClient.get<RepeatCustomerResponse>('/api/v1/orders/analytics/repeat-customers', {
      params: filters,
    })
    return response.data
  },

  getRepeatReturnCustomers: async (filters: Pick<OrderFilters, 'confirmed_date_from' | 'confirmed_date_to'> = {}): Promise<RepeatCustomerResponse> => {
    const response = await apiClient.get<RepeatCustomerResponse>('/api/v1/returns/analytics/repeat-customers', {
      params: filters,
    })
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
  }): Promise<ExecutiveDashboardResponse> => {
    const response = await apiClient.get<ExecutiveDashboardResponse>('/api/v1/dashboard/executive', {
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

  getReturnsDashboard: async (filters: {
    dateRange: string
    fromDate?: string
    toDate?: string
    state?: string
    city?: string
    thickness?: string
    orderStatus?: string
    returnInitiated?: string
    returnInitiatedCompromised?: string
  }): Promise<ReturnsDashboardResponse> => {
    const response = await apiClient.get<ReturnsDashboardResponse>('/api/v1/dashboard/returns', {
      params: {
        date_range: filters.dateRange,
        from_date: filters.fromDate,
        to_date: filters.toDate,
        state: filters.state,
        city: filters.city,
        thickness: filters.thickness,
        order_status: filters.orderStatus,
        return_initiated: filters.returnInitiated,
        return_initiated_compromised: filters.returnInitiatedCompromised,
      },
    })
    return response.data
  },

  getSafetyClaimsDashboard: async (filters: {
    dateRange: string
    fromDate?: string
    toDate?: string
    state?: string
    city?: string
    thickness?: string
    orderStatus?: string
    safetyClaimed?: string
  }): Promise<SafetyClaimsDashboardResponse> => {
    const response = await apiClient.get<SafetyClaimsDashboardResponse>('/api/v1/dashboard/safety-claims', {
      params: {
        date_range: filters.dateRange,
        from_date: filters.fromDate,
        to_date: filters.toDate,
        state: filters.state,
        city: filters.city,
        thickness: filters.thickness,
        order_status: filters.orderStatus,
        safety_claimed: filters.safetyClaimed,
      },
    })
    return response.data
  },

  listReviewFollowupSettings: async (): Promise<ReviewFollowupSettingsResponse> => {
    const response = await apiClient.get<ReviewFollowupSettingsResponse>('/api/v1/review-followups/settings')
    return response.data
  },

  updateReviewFollowupSettings: async (settings: ReviewFollowupStateSetting[]): Promise<ReviewFollowupSettingsResponse> => {
    const response = await apiClient.put<ReviewFollowupSettingsResponse>('/api/v1/review-followups/settings', { settings })
    return response.data
  },

  resetReviewFollowupSettings: async (): Promise<ReviewFollowupSettingsResponse> => {
    const response = await apiClient.post<ReviewFollowupSettingsResponse>('/api/v1/review-followups/settings/reset')
    return response.data
  },

  listReviewQueue: async (filters: ReviewQueueFilters = {}): Promise<ReviewQueueResponse> => {
    const response = await apiClient.get<ReviewQueueResponse>('/api/v1/review-followups/queue', { params: filters })
    return response.data
  },

  updateReviewRequestStatus: async (amazonOrderIds: string[], status: ReviewRequestStatus): Promise<UpdateReviewRequestStatusResponse> => {
    const response = await apiClient.patch<UpdateReviewRequestStatusResponse>('/api/v1/review-followups/status', {
      amazon_order_ids: amazonOrderIds,
      status,
    })
    return response.data
  }
}
