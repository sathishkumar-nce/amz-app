import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { directOrdersApi } from '@/api/directOrders'
import type {
  DirectOrder,
  DirectOrderFilters,
  CreateDirectOrderRequest,
  DirectOrderPincodeLookupResponse,
  UpdateDirectOrderRequest,
} from '@/types'

export const useDirectOrdersStore = defineStore('directOrders', () => {
  const orders = shallowRef<DirectOrder[]>([])
  const currentOrder = shallowRef<DirectOrder | null>(null)
  const loading = ref(false)
  const activeFilters = ref<DirectOrderFilters>({})
  const pagination = ref({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })

  async function fetchOrders(filters: DirectOrderFilters = {}) {
    loading.value = true
    try {
      activeFilters.value = { ...filters }
      const useSearchApi = Boolean(filters.search)
      const response = useSearchApi
        ? await directOrdersApi.search(filters)
        : await directOrdersApi.list(filters)
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

  async function fetchOrderById(orderId: string) {
    loading.value = true
    try {
      currentOrder.value = await directOrdersApi.getById(orderId)
      return currentOrder.value
    } finally {
      loading.value = false
    }
  }

  async function createOrder(data: CreateDirectOrderRequest) {
    loading.value = true
    try {
      const newOrder = await directOrdersApi.create(data)
      orders.value.unshift(newOrder)
      return newOrder
    } finally {
      loading.value = false
    }
  }

  async function updateOrder(orderId: string, data: UpdateDirectOrderRequest) {
    loading.value = true
    try {
      const updated = await directOrdersApi.update(orderId, data)
      orders.value = orders.value.map((order) => (order.order_id === orderId ? updated : order))
      if (currentOrder.value?.order_id === orderId) {
        currentOrder.value = updated
      }
      return updated
    } finally {
      loading.value = false
    }
  }

  async function deleteOrder(orderId: string) {
    loading.value = true
    try {
      await directOrdersApi.delete(orderId)
      orders.value = orders.value.filter(o => o.order_id !== orderId)
      if (currentOrder.value?.order_id === orderId) {
        currentOrder.value = null
      }
    } finally {
      loading.value = false
    }
  }

  async function exportCSV(filters: DirectOrderFilters = {}) {
    loading.value = true
    try {
      const blob = await directOrdersApi.exportCSV(filters)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `direct-orders-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } finally {
      loading.value = false
    }
  }

  async function fetchNextOrderId() {
    const response = await directOrdersApi.getNextOrderId()
    return response.order_id
  }

  async function lookupPincode(pincode: string): Promise<DirectOrderPincodeLookupResponse> {
    return directOrdersApi.lookupPincode(pincode)
  }

  async function createDelhiveryForwardOrder(orderId: string) {
    loading.value = true
    try {
      const response = await directOrdersApi.createDelhiveryForwardOrder(orderId)
      const updated = response.order
      orders.value = orders.value.map((order) => (order.order_id === orderId ? updated : order))
      if (currentOrder.value?.order_id === orderId) {
        currentOrder.value = updated
      }
      return response
    } finally {
      loading.value = false
    }
  }

  async function createBulkDelhiveryForwardOrders(orderIds: string[]) {
    loading.value = true
    try {
      const response = await directOrdersApi.createBulkDelhiveryForwardOrders(orderIds)
      const updatedOrders = new Map(response.successes.map((item) => [item.order_id, item.order]).filter((entry): entry is [string, DirectOrder] => Boolean(entry[1])))
      if (updatedOrders.size > 0) {
        orders.value = orders.value.map((order) => updatedOrders.get(order.order_id) ?? order)
        if (currentOrder.value && updatedOrders.has(currentOrder.value.order_id)) {
          currentOrder.value = updatedOrders.get(currentOrder.value.order_id) ?? currentOrder.value
        }
      }
      return response
    } finally {
      loading.value = false
    }
  }

  return {
    orders,
    currentOrder,
    loading,
    activeFilters,
    pagination,
    fetchOrders,
    fetchOrderById,
    createOrder,
    updateOrder,
    deleteOrder,
    exportCSV,
    fetchNextOrderId,
    lookupPincode,
    createDelhiveryForwardOrder,
    createBulkDelhiveryForwardOrders
  }
})
