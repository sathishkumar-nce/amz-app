export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done'
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent'
export interface BoardMember {
  id: number
  username: string
}
export interface Swimlane {
  id: number
  name: string
  position: number
  is_default: boolean
}
export interface TaskAttachment {
  id: number
  task_id: number
  kind: 'file' | 'link'
  name: string
  url: string
  content_type: string
  size: number
  has_preview: boolean
  created_by: string
  created_at: string
}
export interface TaskComment {
  id: number
  body: string
  created_by: string
  created_at: string
}
export interface TaskActivity {
  id: number
  message: string
  actor: string
  created_at: string
}
export interface BoardTask {
  id: number
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  swimlane_id: number
  due_date: string | null
  position: number
  version: number
  assignees: BoardMember[]
  attachments: TaskAttachment[]
  comment_count: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  archived_at: string | null
  comments?: TaskComment[]
  activity?: TaskActivity[]
}
export interface TaskInput {
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  swimlane_id: number
  due_date: string | null
  assignee_ids: number[]
  version: number
}
export interface TaskBoard {
  id: number
  name: string
  swimlanes: Swimlane[]
  members: BoardMember[]
  tasks: BoardTask[]
  total: number
  limit: number
  max_file_bytes: number
  max_attachments: number
}
export interface BoardFilters {
  search?: string
  assignee_id?: number | string
  priority?: string
  archived?: boolean
}
export const taskStatuses: { id: TaskStatus; label: string; color: string }[] =
  [
    { id: 'backlog', label: 'Backlog', color: '#94a3b8' },
    { id: 'todo', label: 'To do', color: '#38bdf8' },
    { id: 'in_progress', label: 'In progress', color: '#6366f1' },
    { id: 'blocked', label: 'Blocked', color: '#ef4444' },
    { id: 'done', label: 'Done', color: '#10b981' },
  ]
export const taskPriorities: TaskPriority[] = [
  'low',
  'normal',
  'high',
  'urgent',
]
