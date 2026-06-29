import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { shippingDateFiltersApi } from '@/api/shippingDateFilters'
import type { ShippingDateFilterSetting } from '@/types'

export const useShippingDateFiltersStore = defineStore('shippingDateFilters', () => {
  const settings = ref<ShippingDateFilterSetting[]>([])
  const loading = ref(false)
  const initialized = ref(false)
  const activeKey = ref('prime_ship_today')

  const activeSetting = computed(() => settings.value.find((item) => item.filter_key === activeKey.value) || null)

  const getActiveRange = () => {
    const setting = activeSetting.value
    if (!setting) return null
    if (!setting.is_range_enabled) return null

    const base = new Date()
    base.setHours(0, 0, 0, 0)

    const from = new Date(base)
    from.setDate(from.getDate() + setting.start_day_offset)
    from.setHours(setting.start_hour, setting.start_minute, 0, 0)

    const to = new Date(base)
    to.setDate(to.getDate() + setting.end_day_offset)
    to.setHours(setting.end_hour, setting.end_minute, 0, 0)

    return {
      confirmed_date_from: from.toISOString(),
      confirmed_date_to: to.toISOString(),
    }
  }

  const applySettings = (filters: ShippingDateFilterSetting[], nextActiveKey?: string) => {
    settings.value = filters

    if (nextActiveKey && settings.value.some((item) => item.filter_key === nextActiveKey)) {
      activeKey.value = nextActiveKey
      return
    }

    if (!settings.value.some((item) => item.filter_key === activeKey.value) && settings.value.length) {
      activeKey.value = settings.value[0]!.filter_key
    }
  }

  async function ensureLoaded() {
    if (initialized.value) return
    loading.value = true
    try {
      const response = await shippingDateFiltersApi.list()
      applySettings(response.filters, response.active_filter_key)
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function refresh() {
    loading.value = true
    try {
      const response = await shippingDateFiltersApi.list()
      applySettings(response.filters, response.active_filter_key)
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function saveAll(filters: ShippingDateFilterSetting[]) {
    loading.value = true
    try {
      const response = await shippingDateFiltersApi.updateAll(filters)
      applySettings(response.filters, response.active_filter_key)
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function resetDefaults() {
    loading.value = true
    try {
      const response = await shippingDateFiltersApi.resetDefaults()
      applySettings(response.filters, response.active_filter_key)
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function setActiveKey(key: string) {
    loading.value = true
    try {
      const response = await shippingDateFiltersApi.setActive(key)
      applySettings(response.filters, response.active_filter_key)
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  return {
    settings,
    loading,
    initialized,
    activeKey,
    activeSetting,
    ensureLoaded,
    refresh,
    saveAll,
    resetDefaults,
    setActiveKey,
    getActiveRange,
  }
})
