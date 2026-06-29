import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ordersApi } from '@/api/orders'
import { useShippingDateFiltersStore } from './shippingDateFilters'
import type { Order, OrderFilters, Issue, Return, SafetyClaimOrder } from '@/types'

export const useOrdersStore = defineStore('orders', () => {
  const createPaginationState = () => ({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  const orders = ref<Order[]>([])
  const currentOrder = ref<Order | null>(null)
  const issues = ref<Issue[]>([])
  const returns = ref<Return[]>([])
  const safetyClaims = ref<SafetyClaimOrder[]>([])
  const issueTotal = ref(0)
  const returnTotal = ref(0)
  const safetyClaimTotal = ref(0)
  const loading = ref(false)
  const pagination = ref(createPaginationState())
  const issuePagination = ref(createPaginationState())
  const returnPagination = ref(createPaginationState())
  const safetyClaimPagination = ref(createPaginationState())

  const syncOrderAcrossCollections = (amazonOrderId: string, refreshed: Order | null) => {
    if (!refreshed) return

    const syncList = (list: { value: Order[] }) => {
      const index = list.value.findIndex((order) => order.amazon_order_id === amazonOrderId)
      if (index !== -1) {
        list.value[index] = refreshed
      }
    }

    syncList(orders)
    syncList(issues as { value: Order[] })
    syncList(returns as { value: Order[] })
    syncList(safetyClaims as { value: Order[] })
  }

  const withShippingFilter = async (filters: OrderFilters = {}) => {
    const shippingStore = useShippingDateFiltersStore()
    await shippingStore.ensureLoaded()

    const request: OrderFilters = { ...filters }
    const range = shippingStore.getActiveRange()
    if (range) {
      request.confirmed_date_from = range.confirmed_date_from
      request.confirmed_date_to = range.confirmed_date_to
      delete request.confirmed_date
    }

    return request
  }

  async function fetchOrders(filters: OrderFilters = {}) {
    loading.value = true
    try {
      const response = await ordersApi.list(await withShippingFilter(filters))
      orders.value = response.data
      pagination.value = {
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.total_pages
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchOrderById(amazonOrderId: string) {
    loading.value = true
    try {
      currentOrder.value = await ordersApi.getById(amazonOrderId)
      return currentOrder.value
    } finally {
      loading.value = false
    }
  }

  async function updateOrderManualFields(amazonOrderId: string, data: any) {
    const refreshed = await ordersApi.updateManualFields(amazonOrderId, data)
    currentOrder.value = refreshed
    syncOrderAcrossCollections(amazonOrderId, refreshed)
    return refreshed
  }

  async function updateProductManualFields(amazonOrderId: string, orderProductId: number, data: any) {
    const refreshed = await ordersApi.updateProductManualFields(amazonOrderId, orderProductId, data)
    currentOrder.value = refreshed
    syncOrderAcrossCollections(amazonOrderId, refreshed)
    return refreshed
  }

  async function importFromBaseLinker() {
    loading.value = true
    try {
      return await ordersApi.importFromBaseLinker()
    } finally {
      loading.value = false
    }
  }

  async function importFromSample() {
    loading.value = true
    try {
      return await ordersApi.importFromSample()
    } finally {
      loading.value = false
    }
  }

  async function fetchIssues(filters: OrderFilters = {}) {
    loading.value = true
    try {
      const response = await ordersApi.listIssues(await withShippingFilter(filters))
      issues.value = response.data
      issueTotal.value = response.total
      issuePagination.value = {
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.total_pages
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchReturns(filters: OrderFilters = {}) {
    loading.value = true
    try {
      const response = await ordersApi.listReturns(await withShippingFilter(filters))
      returns.value = response.data
      returnTotal.value = response.total
      returnPagination.value = {
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.total_pages
      }
    } finally {
      loading.value = false
    }
  }

  async function fetchSafetyClaims(filters: OrderFilters = {}) {
    loading.value = true
    try {
      const response = await ordersApi.listSafetyClaims(await withShippingFilter(filters))
      safetyClaims.value = response.data
      safetyClaimTotal.value = response.total
      safetyClaimPagination.value = {
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.total_pages
      }
    } finally {
      loading.value = false
    }
  }

  return {
    orders,
    currentOrder,
    issues,
    returns,
    safetyClaims,
    issueTotal,
    returnTotal,
    safetyClaimTotal,
    loading,
    pagination,
    issuePagination,
    returnPagination,
    safetyClaimPagination,
    fetchOrders,
    fetchOrderById,
    updateOrderManualFields,
    updateProductManualFields,
    importFromBaseLinker,
    importFromSample,
    fetchIssues,
    fetchReturns,
    fetchSafetyClaims
  }
})
