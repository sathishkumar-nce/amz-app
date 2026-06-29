import { apiClient } from './client'
import type { ScheduleWeightParseResponse, SKUMapperFileInfo } from '@/types'

export const skuMapperApi = {
  getInfo: async (): Promise<SKUMapperFileInfo> => {
    const response = await apiClient.get<SKUMapperFileInfo>('/api/v1/sku-mapper')
    return response.data
  },

  download: async (): Promise<Blob> => {
    const response = await apiClient.get('/api/v1/sku-mapper/download', {
      responseType: 'blob',
    })
    return response.data as Blob
  },

  upload: async (file: File): Promise<{ message: string; file_name: string; file_size: number; sku_count: number; uploaded_at: string }> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post('/api/v1/sku-mapper/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response.data
  },

  parseScheduleWeights: async (rawText: string): Promise<ScheduleWeightParseResponse> => {
    const response = await apiClient.post<ScheduleWeightParseResponse>('/api/v1/sku-mapper/parse-schedule-weights', {
      raw_text: rawText,
    })
    return response.data
  },
}
