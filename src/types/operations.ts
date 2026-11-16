export interface OperationsMetrics {
  direct_orders: number
  direct_value: number
  direct_cod: number
  direct_advance: number
  manufactured: number
  manufactured_value: number
  returned: number
  returned_value: number
  returned_units: number
  fresh_returned: number
  claimed_nonfresh: number
  other_returned: number
  claimed_returns: number
  unclaimed_returns: number
  claims: number
  initiated: number
  compromised: number
  converted: number
  addressed: number
  fresh_marked: number
  followups: number
  non_inr_amazon_orders: number
  backfilled: number
}
export interface OperationsDay extends OperationsMetrics {
  date: string
}
export interface OperationsActivity {
  id: number
  order_id: string
  product_id?: number
  kind: string
  occurred_at: string
  actor: string
  customer: string
  value: number
  currency: string
  fresh: boolean
  claimed: boolean
  addressed: boolean
  details: string
  backfill: boolean
}
export interface OperationsDashboard {
  from_date: string
  to_date: string
  timezone: string
  generated_at: string
  history_started_at: string
  undated_legacy_orders: number
  summary: OperationsMetrics
  daily: OperationsDay[]
  pending_fresh: number
  activity: OperationsActivity[]
  activity_total: number
  activity_page: number
  activity_limit: number
}
export interface OperationsFilters {
  date_range: string
  from_date?: string
  to_date?: string
  activity_date?: string
  activity_kind?: string
  page?: number
  limit?: number
}
