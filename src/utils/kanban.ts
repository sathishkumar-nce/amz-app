import type { BoardTask } from '@/types/kanban'
export function taskInitials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
export function taskDate(value: string) {
  return new Date(`${value}T12:00:00+05:30`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  })
}
export function taskTimestamp(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  })
}
export function taskOverdue(task: BoardTask) {
  return Boolean(
    task.due_date &&
    !task.archived_at &&
    task.status !== 'done' &&
    task.due_date <
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
        new Date(),
      ),
  )
}
export function fileSize(size: number) {
  return size >= 1048576
    ? `${(size / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`
}
export function downloadTaskFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
