import type { Order, OrderListResponse, OrderProduct } from '@/types'

const productDimensionPattern = /\|\s*\(\s*\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?\s*Inches\s*,\s*\d+(?:\.\d+)?\s*mm\s*\)\s*\|/gi
const PRODUCT_NAME_FALLBACK_LIMIT = 25

const dateFields = new Set([
  'date_confirmed',
  'date_add',
  'date_in_status',
  'order_status_updated_at',
  'review_confidence_updated_at',
  'safety_claimed_updated_at',
  'return_initiated_updated_at',
  'return_initiated_compromised_updated_at',
  'other_issue_updated_at',
  'created_at',
  'updated_at',
])

type PlainObject = Record<string, unknown>

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unwrapNullable(value: PlainObject): unknown {
  if (!('Valid' in value)) return value
  if (!value.Valid) return null
  if ('String' in value) return value.String
  if ('Float64' in value) return value.Float64
  if ('Int64' in value) return value.Int64
  if ('Bool' in value) return value.Bool
  if ('Time' in value) return value.Time
  return null
}

function normalizeDateValue(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') {
    const date = new Date(value * 1000)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  return null
}

function normalizeValue(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item))
  }

  if (isPlainObject(value)) {
    const unwrapped = unwrapNullable(value)
    if (unwrapped !== value) {
      return key && dateFields.has(key) ? normalizeDateValue(unwrapped) : normalizeValue(unwrapped, key)
    }

    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [entryKey, normalizeValue(entryValue, entryKey)]),
    )
  }

  if (key && dateFields.has(key)) {
    return normalizeDateValue(value)
  }

  return value
}

function normalizeProduct(product: unknown): OrderProduct {
  const normalized = normalizeValue(product) as PlainObject
  return {
    order_product_id: Number(normalized.order_product_id ?? 0),
    amazon_order_id: String(normalized.amazon_order_id ?? ''),
    name: (normalized.name as string | null | undefined) ?? null,
    sku: (normalized.sku as string | null | undefined) ?? null,
    thickness: (normalized.thickness as string | null | undefined) ?? null,
    auction_id: (normalized.auction_id as string | null | undefined) ?? null,
    price_brutto: (normalized.price_brutto as number | null | undefined) ?? null,
    quantity: (normalized.quantity as number | null | undefined) ?? null,
    default_width_in_inches: (normalized.default_width_in_inches as number | null | undefined) ?? null,
    default_length_in_inches: (normalized.default_length_in_inches as number | null | undefined) ?? null,
    customer_width_in_inches: (normalized.customer_width_in_inches as number | null | undefined) ?? null,
    customer_length_in_inches: (normalized.customer_length_in_inches as number | null | undefined) ?? null,
    default_width_in_mm: (normalized.default_width_in_mm as number | null | undefined) ?? null,
    default_length_in_mm: (normalized.default_length_in_mm as number | null | undefined) ?? null,
    customer_width_in_mm: (normalized.customer_width_in_mm as number | null | undefined) ?? null,
    customer_length_in_mm: (normalized.customer_length_in_mm as number | null | undefined) ?? null,
    corner_radius_and_notes: (normalized.corner_radius_and_notes as string | null | undefined) ?? null,
    safety_claimed: (normalized.safety_claimed as boolean | null | undefined) ?? null,
    safety_claimed_updated_at: (normalized.safety_claimed_updated_at as string | null | undefined) ?? null,
    safety_claim_issues: (normalized.safety_claim_issues as string | null | undefined) ?? null,
    return_initiated: (normalized.return_initiated as boolean | null | undefined) ?? null,
    return_initiated_updated_at: (normalized.return_initiated_updated_at as string | null | undefined) ?? null,
    return_initiated_reason: (normalized.return_initiated_reason as string | null | undefined) ?? null,
    return_initiated_followup_action: (normalized.return_initiated_followup_action as string | null | undefined) ?? null,
    return_initiated_compromised: (normalized.return_initiated_compromised as boolean | null | undefined) ?? null,
    return_initiated_compromised_reason: (normalized.return_initiated_compromised_reason as string | null | undefined) ?? null,
    return_initiated_compromised_updated_at: (normalized.return_initiated_compromised_updated_at as string | null | undefined) ?? null,
    other_issues: (normalized.other_issues as boolean | null | undefined) ?? null,
    other_issues_reason: (normalized.other_issues_reason as string | null | undefined) ?? null,
    other_issue_updated_at: (normalized.other_issue_updated_at as string | null | undefined) ?? null,
    return_status: (normalized.return_status as string | null | undefined) ?? undefined,
    return_status_updated_at: (normalized.return_status_updated_at as string | null | undefined) ?? null,
    return_reason: (normalized.return_reason as string | null | undefined) ?? null,
    return_follow_up_actions: (normalized.return_follow_up_actions as string | null | undefined) ?? null,
    return_notes: (normalized.return_notes as string | null | undefined) ?? null,
    issue_status: (normalized.issue_status as string | null | undefined) ?? undefined,
    issue_status_updated_at: (normalized.issue_status_updated_at as string | null | undefined) ?? null,
    issue_reason: (normalized.issue_reason as string | null | undefined) ?? null,
    issue_follow_up_actions: (normalized.issue_follow_up_actions as string | null | undefined) ?? null,
    safety_claim: (normalized.safety_claim as string | null | undefined) ?? undefined,
    safety_claim_updated_at: (normalized.safety_claim_updated_at as string | null | undefined) ?? null,
    safety_claim_notes: (normalized.safety_claim_notes as string | null | undefined) ?? null,
    is_round: Boolean(normalized.is_round),
    is_discount_line: Boolean(normalized.is_discount_line),
    updated_at: (normalized.updated_at as string | null | undefined) ?? null,
  }
}

export function normalizeOrder(order: unknown): Order {
  const normalized = normalizeValue(order) as PlainObject

  return {
    ...normalized,
    amazon_order_id: String(normalized.amazon_order_id ?? ''),
    baselinker_order_id: Number(normalized.baselinker_order_id ?? 0),
    shop_order_id: Number(normalized.shop_order_id ?? 0),
    order_status_id: Number(normalized.order_status_id ?? 0),
    confirmed: Boolean(normalized.confirmed),
    payment_done: Number(normalized.payment_done ?? 0),
    priority: String(normalized.priority ?? 'p3'),
    order_status: String(normalized.order_status ?? 'received'),
    order_status_updated_at: (normalized.order_status_updated_at as string | null | undefined) ?? null,
    is_fresh_roll: Boolean(normalized.is_fresh_roll),
    is_fresh_roll_addressed: Boolean(normalized.is_fresh_roll_addressed),
    fresh_roll_addressed_action: (normalized.fresh_roll_addressed_action as string | null | undefined) ?? null,
    review_confidence: Number(normalized.review_confidence ?? 0),
    review_confidence_updated_at: (normalized.review_confidence_updated_at as string | null | undefined) ?? null,
    internal_notes: (normalized.internal_notes as string | null | undefined) ?? null,
    return_status: (normalized.return_status as string | null | undefined) ?? null,
    issue_status: (normalized.issue_status as string | null | undefined) ?? null,
    safety_claim: (normalized.safety_claim as string | null | undefined) ?? null,
    safety_claim_updated_at: (normalized.safety_claim_updated_at as string | null | undefined) ?? null,
    created_at: String(normalized.created_at ?? ''),
    updated_at: String(normalized.updated_at ?? ''),
    products: Array.isArray(normalized.products)
      ? normalized.products.map((product) => normalizeProduct(product))
      : [],
  } as Order
}

export function normalizeOrderListResponse(response: OrderListResponse): OrderListResponse {
  return {
    ...response,
    data: response.data.map((order) => normalizeOrder(order)),
  }
}

export function formatProductNameForDisplay(value?: string | null): string {
  if (!value) return ''
  const matches = [...value.matchAll(productDimensionPattern)]
    .map((match) => match[0].replace(/\s+/g, ' ').trim())
    .join(', ')
  return matches || value.trim().slice(0, PRODUCT_NAME_FALLBACK_LIMIT)
}

export function formatStandardDate(dateString?: string | null): string {
  if (!dateString) return 'Not available'

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return 'Not available'

  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
