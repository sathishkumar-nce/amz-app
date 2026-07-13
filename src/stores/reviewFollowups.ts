import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { ordersApi } from '@/api/orders'
import type { ReviewFollowupStateSetting, ReviewQueueFilters, ReviewQueueItem, ReviewRequestStatus } from '@/types'

export const useReviewFollowupsStore = defineStore('reviewFollowups', () => {
  const settings = ref<ReviewFollowupStateSetting[]>([])
  const queue = shallowRef<ReviewQueueItem[]>([])
  const loading = ref(false)
  const initialized = ref(false)
  const total = ref(0)

  async function refreshSettings() {
    loading.value = true
    try {
      const response = await ordersApi.listReviewFollowupSettings()
      settings.value = response.settings
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function saveSettings(nextSettings: ReviewFollowupStateSetting[]) {
    loading.value = true
    try {
      const response = await ordersApi.updateReviewFollowupSettings(nextSettings)
      settings.value = response.settings
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function resetSettings() {
    loading.value = true
    try {
      const response = await ordersApi.resetReviewFollowupSettings()
      settings.value = response.settings
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function fetchQueue(filters: ReviewQueueFilters = {}) {
    loading.value = true
    try {
      const response = await ordersApi.listReviewQueue(filters)
      queue.value = response.data
      total.value = response.total
    } finally {
      loading.value = false
    }
  }

  async function updateRequestStatus(amazonOrderIds: string[], status: ReviewRequestStatus) {
    const response = await ordersApi.updateReviewRequestStatus(amazonOrderIds, status)
    const idSet = new Set(amazonOrderIds)
    queue.value = queue.value.map((item) =>
      idSet.has(item.amazon_order_id)
        ? { ...item, review_request_status: status }
        : item,
    )
    return response
  }

  return {
    settings,
    queue,
    loading,
    initialized,
    total,
    refreshSettings,
    saveSettings,
    resetSettings,
    fetchQueue,
    updateRequestStatus,
  }
})
