export type SortDirection = 'asc' | 'desc'

const numberPrefixPattern = /^-?\d+(\.\d+)?/

const toTimestamp = (value: string) => {
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

const normalizeForSort = (value: unknown): number | string | boolean | null => {
  if (value == null) return null
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null

    const parsedNumber = Number(trimmed)
    if (!Number.isNaN(parsedNumber) && trimmed === String(parsedNumber)) {
      return parsedNumber
    }

    const numericPrefix = trimmed.match(numberPrefixPattern)
    if (numericPrefix) {
      const prefixedNumber = Number(numericPrefix[0])
      if (!Number.isNaN(prefixedNumber)) return prefixedNumber
    }

    const parsedDate = toTimestamp(trimmed)
    if (parsedDate != null) return parsedDate

    return trimmed.toLowerCase()
  }

  return String(value)
}

export const compareSortValues = (left: unknown, right: unknown) => {
  const a = normalizeForSort(left)
  const b = normalizeForSort(right)

  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1

  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)

  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

export const sortItems = <T,>(
  items: T[],
  getter: (item: T) => unknown,
  direction: SortDirection,
) => {
  const factor = direction === 'asc' ? 1 : -1
  return [...items].sort((left, right) => compareSortValues(getter(left), getter(right)) * factor)
}
