import { defineStore } from 'pinia'
import { ref } from 'vue'
import { interaktSettingsApi } from '@/api/interaktSettings'
import type { InteraktSettings } from '@/types'

export const useInteraktSettingsStore = defineStore('interaktSettings', () => {
  const settings = ref<InteraktSettings | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  async function refresh() {
    loading.value = true
    try {
      settings.value = await interaktSettingsApi.get()
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  async function save(next: InteraktSettings) {
    loading.value = true
    try {
      settings.value = await interaktSettingsApi.update(next)
      initialized.value = true
    } finally {
      loading.value = false
    }
  }

  return {
    settings,
    loading,
    initialized,
    refresh,
    save,
  }
})
