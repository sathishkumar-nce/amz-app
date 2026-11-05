import { apiClient } from './client'
import type { 
  CourierSettings,
  ShipmentTrackingResponse,
  DTDCSettings,
  DTDCBookingOptions,
  DTDCShipmentFilters,
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

  courierSettings: async (): Promise<CourierSettings> => (await apiClient.get<CourierSettings>('/api/v1/direct-orders/courier-settings')).data,

  saveCourierSettings: async (settings: CourierSettings): Promise<CourierSettings> => (await apiClient.put<CourierSettings>('/api/v1/direct-orders/courier-settings', settings)).data,

  shipments: async (filters: DTDCShipmentFilters & { courier?: string } = {}): Promise<DirectOrderListResponse> => (await apiClient.get<DirectOrderListResponse>('/api/v1/direct-orders/shipments', { params: filters })).data,

  trackShipment: async (orderId: string): Promise<ShipmentTrackingResponse> => (await apiClient.post<ShipmentTrackingResponse>(`/api/v1/direct-orders/${encodeURIComponent(orderId)}/tracking`, {}, { timeout: 70000 })).data,

  dtdcSettings: async (): Promise<DTDCSettings> => {
    return (await apiClient.get<DTDCSettings>('/api/v1/direct-orders/dtdc/settings')).data
  },

  listDTDCShipments: async (filters: DTDCShipmentFilters = {}): Promise<DirectOrderListResponse> => {
    return (await apiClient.get<DirectOrderListResponse>('/api/v1/direct-orders/dtdc/shipments', { params: filters })).data
  },

  bookDTDC: async (orderId: string, options: DTDCBookingOptions = {}): Promise<DirectOrderDelhiveryResponse> => {
    const payload = {
      ...options,
      // Numeric form inputs may contain numbers at runtime; DTDC's parcel fields are strings.
      pieces_detail: options.pieces_detail?.map(piece => ({
        description: piece.description,
        declared_value: String(piece.declared_value), weight: String(piece.weight),
        length: String(piece.length), width: String(piece.width), height: String(piece.height),
      })),
    }
    return (await apiClient.post<DirectOrderDelhiveryResponse>(`/api/v1/direct-orders/${encodeURIComponent(orderId)}/dtdc/book`, payload, { timeout: 70000 })).data
  },

  trackDTDC: async (orderId: string): Promise<DirectOrderDelhiveryResponse> => {
    return (await apiClient.post<DirectOrderDelhiveryResponse>(`/api/v1/direct-orders/${encodeURIComponent(orderId)}/dtdc/track`, {}, { timeout: 70000 })).data
  },

  reconcileDTDC: async (orderId: string): Promise<DirectOrderDelhiveryResponse> => {
    return (await apiClient.post<DirectOrderDelhiveryResponse>(`/api/v1/direct-orders/${encodeURIComponent(orderId)}/dtdc/reconcile`, {}, { timeout: 70000 })).data
  },

  cancelDTDC: async (orderId: string): Promise<DirectOrderDelhiveryResponse> => {
    return (await apiClient.post<DirectOrderDelhiveryResponse>(`/api/v1/direct-orders/${encodeURIComponent(orderId)}/dtdc/cancel`, {}, { timeout: 70000 })).data
  },

  labelDTDC: async (orderId: string, labelCode = 'SHIP_LABEL_4X6'): Promise<Blob> => {
    return (await apiClient.get<Blob>(`/api/v1/direct-orders/${encodeURIComponent(orderId)}/dtdc/label`, {
      params: { label_code: labelCode }, responseType: 'blob', timeout: 70000,
    })).data
  },

  createDelhiveryForwardOrder: async (orderId: string): Promise<DirectOrderDelhiveryResponse> => {
    const response = await apiClient.post<DirectOrderDelhiveryResponse>(`/api/v1/direct-orders/${encodeURIComponent(orderId)}/delhivery/forward-order`, {}, { timeout: 70000 })
    return response.data
  },

  createBulkDelhiveryForwardOrders: async (orderIds: string[]): Promise<DirectOrderBulkForwardResponse> => {
    const response = await apiClient.post<DirectOrderBulkForwardResponse>('/api/v1/direct-orders/delhivery/forward-orders/bulk', {
      order_ids: orderIds,
    })
    return response.data
  }
}
