import type { OrderFilters } from '@/types'

export interface OrderListAdvancedFilters {
  confirmed_date_from: string
  confirmed_date_to: string
  sku: string
  thickness: string
  priority: string
  order_status: string
  is_round: boolean
  has_customer_inputs: boolean
  quantity_operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  quantity: string
  default_width_in_inches_operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  default_width_in_inches: string
  default_length_in_inches_operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  default_length_in_inches: string
}

export const createOrderListAdvancedFilters = (): OrderListAdvancedFilters => ({
  confirmed_date_from: '',
  confirmed_date_to: '',
  sku: '',
  thickness: '',
  priority: '',
  order_status: '',
  is_round: false,
  has_customer_inputs: false,
  quantity_operator: 'gte',
  quantity: '',
  default_width_in_inches_operator: 'gte',
  default_width_in_inches: '',
  default_length_in_inches_operator: 'gte',
  default_length_in_inches: '',
})

const toOptionalString = (value: string) => {
  const trimmed = value.trim()
  return trimmed || undefined
}

const toOptionalDateTime = (value: string) => {
  if (!value) return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

export const buildOrderListAdvancedRequest = (
  filters: OrderListAdvancedFilters,
): Partial<OrderFilters> => {
  const defaultWidth = toOptionalString(filters.default_width_in_inches)
  const defaultLength = toOptionalString(filters.default_length_in_inches)
  const quantity = toOptionalString(filters.quantity)

  return {
    confirmed_date_from: toOptionalDateTime(filters.confirmed_date_from),
    confirmed_date_to: toOptionalDateTime(filters.confirmed_date_to),
    sku: toOptionalString(filters.sku),
    thickness: toOptionalString(filters.thickness),
    priority: toOptionalString(filters.priority),
    order_status: toOptionalString(filters.order_status),
    is_round: filters.is_round ? true : undefined,
    has_customer_inputs: filters.has_customer_inputs ? true : undefined,
    quantity,
    quantity_operator: quantity ? filters.quantity_operator : undefined,
    default_width_in_inches: defaultWidth,
    default_width_in_inches_operator: defaultWidth ? filters.default_width_in_inches_operator : undefined,
    default_length_in_inches: defaultLength,
    default_length_in_inches_operator: defaultLength ? filters.default_length_in_inches_operator : undefined,
  }
}
