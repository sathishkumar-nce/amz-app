import { apiClient } from './client'
import type {
  BoardFilters,
  BoardTask,
  TaskAttachment,
  TaskBoard,
  TaskInput,
  TaskStatus,
} from '@/types/kanban'
const base = '/api/v1/kanban'
export const kanbanApi = {
  async board(filters: BoardFilters = {}) {
    return (await apiClient.get<TaskBoard>(base, { params: filters })).data
  },
  async task(id: number) {
    return (await apiClient.get<BoardTask>(`${base}/tasks/${id}`)).data
  },
  async save(id: number | null, input: TaskInput) {
    return (
      id
        ? await apiClient.put<BoardTask>(`${base}/tasks/${id}`, input)
        : await apiClient.post<BoardTask>(`${base}/tasks`, input)
    ).data
  },
  async move(
    task: BoardTask,
    swimlane_id: number,
    status: TaskStatus,
    before_task_id?: number,
  ) {
    return (
      await apiClient.post<BoardTask>(`${base}/tasks/${task.id}/move`, {
        swimlane_id,
        status,
        before_task_id,
        version: task.version,
      })
    ).data
  },
  async archive(task: BoardTask, archived: boolean, version: number) {
    return (
      await apiClient.post<BoardTask>(`${base}/tasks/${task.id}/archive`, {
        archived,
        version,
      })
    ).data
  },
  async comment(id: number, body: string) {
    await apiClient.post(`${base}/tasks/${id}/comments`, { body })
  },
  async link(id: number, name: string, url: string) {
    return (
      await apiClient.post<TaskAttachment>(`${base}/tasks/${id}/links`, {
        name,
        url,
      })
    ).data
  },
  async upload(id: number, file: File) {
    const body = new FormData()
    body.append('file', file)
    return (
      await apiClient.post<TaskAttachment>(`${base}/tasks/${id}/files`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      })
    ).data
  },
  async removeAttachment(task: number, id: number) {
    await apiClient.delete(`${base}/tasks/${task}/attachments/${id}`)
  },
  async file(task: number, id: number, preview = false) {
    return (
      await apiClient.get<Blob>(
        `${base}/tasks/${task}/attachments/${id}/${preview ? 'preview' : 'download'}`,
        { responseType: 'blob', timeout: 60000 },
      )
    ).data
  },
  async saveSwimlane(id: number | null, name: string) {
    if (id) await apiClient.put(`${base}/swimlanes/${id}`, { name })
    else await apiClient.post(`${base}/swimlanes`, { name })
  },
  async deleteSwimlane(id: number) {
    await apiClient.delete(`${base}/swimlanes/${id}`)
  },
  async reorderSwimlanes(ids: number[]) {
    await apiClient.put(`${base}/swimlanes/order`, { ids })
  },
}
