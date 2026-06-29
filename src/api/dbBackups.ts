import { apiClient } from './client'
import type { DBBackupRunResponse, DBBackupStatusResponse } from '@/types'

export const dbBackupsApi = {
  async getStatus() {
    const response = await apiClient.get<DBBackupStatusResponse>('/api/v1/db-backups/status')
    return response.data
  },

  async run() {
    const response = await apiClient.post<DBBackupRunResponse>('/api/v1/db-backups/run')
    return response.data
  },

  async download(fileName: string) {
    const response = await apiClient.get(`/api/v1/db-backups/download/${encodeURIComponent(fileName)}`, {
      responseType: 'blob',
    })
    return response.data as Blob
  },
}
