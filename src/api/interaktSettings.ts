import { apiClient } from './client'
import type { InteraktSettings } from '@/types'

export const interaktSettingsApi = {
  get: async (): Promise<InteraktSettings> => {
    const response = await apiClient.get<InteraktSettings>('/api/v1/interakt-settings')
    return response.data
  },

  update: async (settings: InteraktSettings): Promise<InteraktSettings> => {
    const response = await apiClient.put<InteraktSettings>('/api/v1/interakt-settings', settings)
    return response.data
  },
}
