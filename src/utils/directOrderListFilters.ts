import type { DirectOrderFilters } from '@/types'

export interface DirectOrderAdvancedFilters {
  date_from: string
  date_to: string
  source: string
  order_status: string
  payment_status: string
  priority: string
  mobile: string
  customer_name: string
  awb: string
  pincode: string
  quantity: string
}

export const createDirectOrderAdvancedFilters = (): DirectOrderAdvancedFilters => ({
  date_from: '',
  date_to: '',
  source: '',
  order_status: '',
  payment_status: '',
  priority: '',
  mobile: '',
  customer_name: '',
  awb: '',
  pincode: '',
  quantity: '',
})

const toOptionalString = (value: string) => {
  const trimmed = value.trim()
  return trimmed || undefined
}

const toOptionalInteger = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const buildDirectOrderAdvancedRequest = (
  filters: DirectOrderAdvancedFilters,
): Partial<DirectOrderFilters> => ({
  date_from: toOptionalString(filters.date_from),
  date_to: toOptionalString(filters.date_to),
  source: toOptionalString(filters.source),
  order_status: toOptionalString(filters.order_status),
  payment_status: toOptionalString(filters.payment_status),
  priority: toOptionalString(filters.priority),
  mobile: toOptionalString(filters.mobile),
  customer_name: toOptionalString(filters.customer_name),
  awb: toOptionalString(filters.awb),
  pincode: toOptionalString(filters.pincode),
  quantity: toOptionalInteger(filters.quantity),
})
