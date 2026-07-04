// Auth Types
export interface User {
  id: number
  username: string
  email: string
  must_change_password?: boolean
  created_by?: string
  updated_by?: string
  created_at: string
  updated_at?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
  expires_at?: number
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface AdminCreateUserRequest {
  username: string
  email: string
}

// Order Types
export interface OrderProduct {
  order_product_id: number
  amazon_order_id: string
  name?: string | null
  sku?: string | null
  thickness?: string | null
  auction_id?: string | null
  price_brutto?: number | null
  quantity?: number | null
  default_width_in_inches?: number | null
  default_length_in_inches?: number | null
  customer_width_in_inches?: number | null
  customer_length_in_inches?: number | null
  default_width_in_mm?: number | null
  default_length_in_mm?: number | null
  customer_width_in_mm?: number | null
  customer_length_in_mm?: number | null
  corner_radius_and_notes?: string | null
  safety_claimed?: boolean | null
  safety_claimed_updated_at?: string | null
  safety_claim_issues?: string | null
  return_initiated?: boolean | null
  return_initiated_updated_at?: string | null
  return_initiated_reason?: string | null
  return_initiated_followup_action?: string | null
  return_initiated_compromised?: boolean | null
  return_initiated_compromised_reason?: string | null
  return_initiated_compromised_updated_at?: string | null
  other_issues?: boolean | null
  other_issues_reason?: string | null
  other_issue_updated_at?: string | null
  return_status?: string
  return_status_updated_at?: string | null
  return_reason?: string | null
  return_follow_up_actions?: string | null
  return_notes?: string | null
  issue_status?: string
  issue_status_updated_at?: string | null
  issue_reason?: string | null
  issue_follow_up_actions?: string | null
  safety_claim?: string
  safety_claim_updated_at?: string | null
  safety_claim_notes?: string | null
  is_round?: boolean
  is_discount_line: boolean
  updated_by?: string | null
}

export interface Order {
  amazon_order_id: string
  baselinker_order_id: number
  shop_order_id: number
  order_status_id: number
  confirmed: boolean
  payment_done?: number
  date_confirmed?: string | null
  date_add?: string | null
  user_login?: string | null
  phone?: string | null
  email?: string | null
  currency?: string | null
  payment_method?: string | null
  delivery_fullname?: string | null
  delivery_address?: string | null
  delivery_city?: string | null
  delivery_state?: string | null
  delivery_postcode?: string | null
  delivery_country?: string | null
  main_sku?: string | null
  main_product_name?: string | null
  default_width_in_inches?: number | null
  default_length_in_inches?: number | null
  customer_width_in_inches?: number | null
  customer_length_in_inches?: number | null
  default_width_in_mm?: number | null
  default_length_in_mm?: number | null
  customer_width_in_mm?: number | null
  customer_length_in_mm?: number | null
  corner_radius_and_notes?: string | null
  priority: string
  internal_notes?: string | null
  return_status?: string
  return_reason?: string | null
  return_follow_up_actions?: string | null
  return_notes?: string | null
  issue_status?: string
  issue_reason?: string | null
  issue_follow_up_actions?: string | null
  safety_claim?: string
  safety_claim_notes?: string | null
  order_status: string
  order_status_updated_at?: string | null
  is_round?: boolean
  updated_by?: string | null
  safety_claim_updated_at?: string | null
  created_at: string
  updated_at: string
  products?: OrderProduct[]
}

export interface OrderFilters {
  order_id?: string
  amazon_order_id?: string
  search_key?: string
  search_value?: string
  search_operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | string
  confirmed_date?: string
  confirmed_date_from?: string
  confirmed_date_to?: string
  customer?: string
  mobile?: string
  phone?: string
  sku?: string
  thickness?: string
  quantity?: number | string
  quantity_operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  default_width_in_inches?: number | string
  default_width_in_inches_operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  default_length_in_inches?: number | string
  default_length_in_inches_operator?: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  delivery_city?: string
  delivery_state?: string
  priority?: string
  order_status?: string
  other_issues?: boolean | string
  return_initiated?: boolean | string
  return_initiated_compromised?: boolean | string
  safety_claimed?: boolean | string
  is_round?: boolean | string
  round_product?: boolean
  has_customer_inputs?: boolean
  missing_customer_inputs?: boolean
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
  search?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

export interface OrderListResponse {
  data: Order[]
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface OrderedAmazonOrderResult {
  requested_amazon_order_id: string
  found: boolean
  order?: Order | null
}

export interface OrdersByIDsResponse {
  results: OrderedAmazonOrderResult[]
  missing_amazon_order_ids: string[]
}

export interface AnalyticsPeriodStat {
  key: string
  label: string
  count: number
  total?: number
  percentage?: number
}

export interface AnalyticsTimePoint {
  date: string
  label: string
  count: number
}

export interface DashboardAnalytics {
  generated_at: string
  chart_window_days: number
  missing_risk_window_days: number
  range_start?: string
  range_end?: string
  orders_received: AnalyticsPeriodStat[]
  returns_updated: AnalyticsPeriodStat[]
  safety_claims_updated: AnalyticsPeriodStat[]
  issues_updated: AnalyticsPeriodStat[]
  orders_received_daily: AnalyticsTimePoint[]
  returns_updated_daily: AnalyticsTimePoint[]
  safety_claims_updated_daily: AnalyticsTimePoint[]
  issues_updated_daily: AnalyticsTimePoint[]
  customer_input_coverage_daily: AnalyticsTimePoint[]
  missing_customer_details: AnalyticsPeriodStat[]
  missing_details_risk_daily: AnalyticsPeriodStat[]
  orders_by_location: AnalyticsChartSlice[]
  thickness_distribution: AnalyticsChartSlice[]
  most_ordered_skus: AnalyticsChartSlice[]
  returns_by_location: AnalyticsChartSlice[]
}

export interface AnalyticsChartSlice {
  label: string
  count: number
}

export interface ExecutiveDashboardSummary {
  total_orders: number
  manufactured_orders: number
  cancelled_orders: number
  returned_orders: number
  return_rate: number
  safety_claims: number
  other_issues: number
  open_returns: number
  pending_safety_claims: number
  pending_other_issues: number
}

export interface ExecutiveDashboardRecentActivityRow {
  amazon_order_id: string
  confirmed_date?: string | null
  customer: string
  state: string
  thickness: string
  order_status: string
  return_initiated: boolean
  safety_claimed: boolean
  other_issue: boolean
  updated_at: string
}

export interface ExecutiveDashboardResponse {
  generated_at: string
  date_range: string
  range_start: string
  range_end: string
  available_states: string[]
  available_cities: string[]
  summary: ExecutiveDashboardSummary
  orders_trend: AnalyticsTimePoint[]
  returns_trend: AnalyticsTimePoint[]
  customer_input_gap_trend: AnalyticsTimePoint[]
  issue_distribution: AnalyticsChartSlice[]
  orders_by_thickness: AnalyticsChartSlice[]
  orders_by_state: AnalyticsChartSlice[]
  orders_by_sku: AnalyticsChartSlice[]
  orders_by_price_band: AnalyticsChartSlice[]
  recent_activity: ExecutiveDashboardRecentActivityRow[]
}

export interface DirectOrderExecutiveDashboardSummary {
  total_orders: number
  manufactured_orders: number
  other_issues_orders: number
  cancelled_orders: number
  on_hold_orders: number
  average_per_day: number
}

export interface DirectOrderExecutiveDashboardResponse {
  generated_at: string
  date_range: string
  range_start: string
  range_end: string
  available_states: string[]
  available_cities: string[]
  summary: DirectOrderExecutiveDashboardSummary
  orders_trend: AnalyticsTimePoint[]
  other_issues_trend: AnalyticsTimePoint[]
  orders_by_state: AnalyticsChartSlice[]
  orders_by_city: AnalyticsChartSlice[]
  orders_by_thickness: AnalyticsChartSlice[]
}

export interface ReturnsDashboardSummary {
  total_orders: number
  returns_initiated: number
  return_rate: number
  returned_orders: number
  returns_compromised: number
  compromise_rate: number
  pending_returns: number
  average_returns_per_day: number
}

export interface ReturnsDashboardThicknessRow {
  thickness: string
  orders: number
  returns: number
  return_rate: number
}

export interface ReturnsDashboardStateRow {
  state: string
  orders: number
  returns: number
  return_rate: number
}

export interface ReturnsDashboardPendingRow {
  amazon_order_id: string
  confirmed_date?: string | null
  customer: string
  phone: string
  state: string
  city: string
  thickness: string
  quantity: number
  return_reason: string
  followup_action: string
  compromised: boolean
  order_status: string
  updated_at: string
}

export interface ReturnsDashboardDetailRow extends ReturnsDashboardPendingRow {
  product: string
  event_at?: string | null
}

export interface ReturnsDashboardTopProductRow {
  product: string
  orders: number
  returns: number
  return_rate: number
}

export interface ReturnsDashboardResponse {
  generated_at: string
  date_range: string
  range_start: string
  range_end: string
  available_states: string[]
  available_cities: string[]
  summary: ReturnsDashboardSummary
  returns_trend_daily: AnalyticsTimePoint[]
  returns_trend_weekly: AnalyticsTimePoint[]
  returns_trend_monthly: AnalyticsTimePoint[]
  thickness_performance: ReturnsDashboardThicknessRow[]
  state_performance: ReturnsDashboardStateRow[]
  top_return_cities: AnalyticsChartSlice[]
  return_reasons: AnalyticsChartSlice[]
  followup_actions: AnalyticsChartSlice[]
  compromised_breakdown: AnalyticsChartSlice[]
  returns_by_order_status: AnalyticsChartSlice[]
  pending_returns: ReturnsDashboardPendingRow[]
  return_order_details: ReturnsDashboardDetailRow[]
  top_returning_products: ReturnsDashboardTopProductRow[]
}

export interface SafetyClaimsDashboardSummary {
  total_orders: number
  safety_claimed_orders: number
  safety_claim_rate: number
  returned_orders: number
  returned_orders_with_safety_claims: number
  safety_claim_conversion_rate: number
  pending_safety_claims: number
}

export interface SafetyClaimsDashboardInsight {
  highest_claim_state: string
  highest_claim_thickness: string
  highest_claim_product: string
  highest_claim_day_of_week: string
}

export interface SafetyClaimsDashboardThicknessRow {
  thickness: string
  orders: number
  claims: number
  claim_rate: number
}

export interface SafetyClaimsDashboardStateRow {
  state: string
  orders: number
  claims: number
  claim_rate: number
}

export interface SafetyClaimsDashboardCaseRow {
  amazon_order_id: string
  confirmed_date?: string | null
  customer: string
  phone: string
  state: string
  city: string
  thickness: string
  product: string
  order_status: string
  safety_claim_issues: string
  updated_at: string
}

export interface SafetyClaimsDashboardDetailRow extends SafetyClaimsDashboardCaseRow {
  safety_claimed: boolean
  event_at?: string | null
}

export interface SafetyClaimsDashboardTopProductRow {
  product: string
  orders: number
  claims: number
  claim_rate: number
}

export interface SafetyClaimsDashboardResponse {
  generated_at: string
  date_range: string
  range_start: string
  range_end: string
  available_states: string[]
  available_cities: string[]
  summary: SafetyClaimsDashboardSummary
  insights: SafetyClaimsDashboardInsight
  claims_trend_daily: AnalyticsTimePoint[]
  claims_trend_weekly: AnalyticsTimePoint[]
  claims_trend_monthly: AnalyticsTimePoint[]
  thickness_performance: SafetyClaimsDashboardThicknessRow[]
  state_performance: SafetyClaimsDashboardStateRow[]
  top_claim_cities: AnalyticsChartSlice[]
  safety_claim_issues: AnalyticsChartSlice[]
  claims_by_order_status: AnalyticsChartSlice[]
  safety_claim_cases: SafetyClaimsDashboardCaseRow[]
  order_details: SafetyClaimsDashboardDetailRow[]
  top_claim_products: SafetyClaimsDashboardTopProductRow[]
}

export interface ShippingDateFilterSetting {
  filter_key: string
  label: string
  start_day_offset: number
  start_hour: number
  start_minute: number
  end_day_offset: number
  end_hour: number
  end_minute: number
  is_range_enabled: boolean
}

export interface ShippingDateFilterStateResponse {
  filters: ShippingDateFilterSetting[]
  active_filter_key: string
}

export interface InteraktSettings {
  enabled: boolean
  mode: 'test' | 'prod'
  template_name: string
  test_number: string
}

export interface AmazonRowHighlightRule {
  rule_key: string
  label: string
  field_name: 'quantity' | 'is_round' | 'priority' | 'payment_done'
  operator: 'gt' | 'eq'
  threshold_number?: number | null
  match_text?: string | null
  color_mode: 'solid' | 'gradient'
  color_start: string
  color_end?: string | null
  sort_order: number
  enabled: boolean
}

export interface RepeatCustomerOrder {
  amazon_order_id: string
  confirmed_date?: string | null
  order_status: string
  customer: string
  phone: string
  address: string
  city: string
  state: string
  product_summary: string
}

export interface RepeatCustomerGroup {
  group_key: string
  display_name: string
  order_count: number
  orders: RepeatCustomerOrder[]
}

export interface RepeatCustomerResponse {
  scope: string
  by_phone: RepeatCustomerGroup[]
  by_address: RepeatCustomerGroup[]
}

export interface SKUMapperFileInfo {
  file_name: string
  source_file_name?: string
  file_path: string
  file_size: number
  updated_at: string
  uploaded_at?: string
  sku_count: number
  status: string
}

export interface ScheduleWeightParseItem {
  position: number
  sku: string
  quantity: number
  unit_weight_kg: number
  total_weight_kg: number
  found: boolean
}

export interface ScheduleWeightParseResponse {
  items: ScheduleWeightParseItem[]
  matched_count: number
  unmatched_count: number
  total_items: number
  total_weight_kg: number
  parser_version: string
  source_line_count: number
}

export type OrderPriorityKey = 'p1' | 'p2' | 'p3' | 'p4'

export interface OrderPriorityRule {
  key: OrderPriorityKey
  sku_values: string[]
  updated_by?: string
  updated_at: string
}

export interface OrderPriorityRulesResponse {
  rules: OrderPriorityRule[]
}

export interface UpdateOrderPriorityRulesRequest {
  rules: Array<{
    key: OrderPriorityKey
    sku_values: string[]
  }>
}

export interface DBBackupRunSummary {
  file_name: string
  started_at?: string | null
  completed_at?: string | null
  error?: string
}

export interface DBBackupStatusResponse {
  enabled: boolean
  running: boolean
  local_backup_directory: string
  last_backup?: DBBackupRunSummary | null
}

export interface DBBackupRunResponse {
  file_name: string
  started_at: string
  completed_at: string
}

export interface UpdateManualFieldsRequest {
  default_width_in_inches?: number
  default_length_in_inches?: number
  customer_width_in_inches?: number
  customer_length_in_inches?: number
  default_width_in_mm?: number
  default_length_in_mm?: number
  customer_width_in_mm?: number
  customer_length_in_mm?: number
  corner_radius_and_notes?: string
  internal_notes?: string
  return_status?: string
  return_reason?: string
  return_follow_up_actions?: string
  return_notes?: string
  issue_status?: string
  issue_reason?: string
  issue_follow_up_actions?: string
  priority?: string
  order_status?: string
  safety_claim?: string
  safety_claim_notes?: string
  is_round?: boolean
}

export interface UpdateProductManualFieldsRequest {
  default_width_in_inches?: number
  default_length_in_inches?: number
  customer_width_in_inches?: number
  customer_length_in_inches?: number
  default_width_in_mm?: number
  default_length_in_mm?: number
  customer_width_in_mm?: number
  customer_length_in_mm?: number
  corner_radius_and_notes?: string
  safety_claimed?: boolean
  safety_claim_issues?: string
  return_initiated?: boolean
  return_initiated_reason?: string
  return_initiated_followup_action?: string
  return_initiated_compromised?: boolean
  return_initiated_compromised_reason?: string
  other_issues?: boolean
  other_issues_reason?: string
  return_status?: string
  return_reason?: string
  return_follow_up_actions?: string
  return_notes?: string
  issue_status?: string
  issue_reason?: string
  issue_follow_up_actions?: string
  safety_claim?: string
  safety_claim_notes?: string
  is_round?: boolean
}

// Direct Order Types
export interface DirectOrderItem {
  id?: number
  order_id: string
  item?: string | null
  quantity: number
  dimension?: string | null
  thickness?: string | null
  weight?: number | null
  amount?: number | null
  remark?: string | null
  updated_by?: string | null
  sku?: string | null
  hsn?: string | null
  unit_price?: number | null
  tax_rate?: number | null
  customer_width_in_inches?: number | null
  customer_length_in_inches?: number | null
  customer_width_in_mm?: number | null
  customer_length_in_mm?: number | null
  corner_radius_and_notes?: string | null
}

export interface DirectOrder {
  id: number
  created_at: string
  updated_at: string
  deleted_at?: string | null
  source?: string | null
  order_id: string
  order_status: string
  courier_type?: string | null
  courier_name?: string | null
  awb?: string | null
  payment_status: string
  amount?: number | null
  advance_amount?: number | null
  cod_amount?: number | null
  customer_name?: string | null
  address?: string | null
  pincode?: string | null
  mobile?: string | null
  alternate_mobile?: string | null
  email?: string | null
  alternate_email?: string | null
  remarks?: string | null
  priority: string
  issues?: string | null
  updated_by?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  landmark?: string | null
  shipment_type?: string | null
  service_type?: string | null
  pickup_location?: string | null
  package_count?: number | null
  total_weight?: number | null
  length_cm?: number | null
  width_cm?: number | null
  height_cm?: number | null
  invoice_date?: string | null
  courier_order_id?: string | null
  courier_status?: string | null
  manifested_at?: string | null
  pickup_requested_at?: string | null
  courier_payload?: Record<string, unknown> | null
  items: DirectOrderItem[]
}

export interface CreateDirectOrderRequest {
  source: string
  order_id: string
  order_status?: string
  courier_type?: string
  courier_name?: string
  awb?: string
  payment_status?: string
  amount?: number | null
  advance_amount?: number | null
  cod_amount?: number | null
  customer_name?: string
  address?: string
  pincode?: string
  mobile?: string
  alternate_mobile?: string
  email?: string
  alternate_email?: string
  remarks?: string
  priority?: string
  issues?: string
  city?: string
  state?: string
  country?: string
  landmark?: string
  shipment_type?: string
  service_type?: string
  pickup_location?: string
  package_count?: number | null
  total_weight?: number | null
  length_cm?: number | null
  width_cm?: number | null
  height_cm?: number | null
  invoice_date?: string
  items: Omit<DirectOrderItem, 'id'>[]
}

export interface UpdateDirectOrderRequest {
  source?: string
  order_status?: string
  courier_type?: string
  courier_name?: string
  awb?: string
  payment_status?: string
  amount?: number
  advance_amount?: number
  cod_amount?: number
  customer_name?: string
  address?: string
  pincode?: string
  mobile?: string
  alternate_mobile?: string
  email?: string
  alternate_email?: string
  remarks?: string
  priority?: string
  issues?: string
  city?: string
  state?: string
  country?: string
  landmark?: string
  shipment_type?: string
  service_type?: string
  pickup_location?: string
  package_count?: number | null
  total_weight?: number | null
  length_cm?: number | null
  width_cm?: number | null
  height_cm?: number | null
  invoice_date?: string
  items?: Omit<DirectOrderItem, 'id'>[]
}

export interface DirectOrderFilters {
  order_id?: string
  search?: string
  awb?: string
  order_status?: string
  payment_status?: string
  priority?: string
  source?: string
  mobile?: string
  customer_name?: string
  item?: string
  quantity?: number | string
  pincode?: string
  date_exact?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

export interface DirectOrderListResponse {
  data: DirectOrder[]
  page: number
  limit: number
  total: number
  total_pages: number
}

export interface DirectOrderDelhiveryResponse {
  message: string
  order: DirectOrder
}

export interface DirectOrderBulkForwardItem {
  order_id: string
  order?: DirectOrder
  error?: string
}

export interface DirectOrderBulkForwardResponse {
  message: string
  requested: number
  success_count: number
  failure_count: number
  successes: DirectOrderBulkForwardItem[]
  failures: DirectOrderBulkForwardItem[]
}

export interface DirectOrderPincodeLookupCandidate {
  pincode: string
  city?: string
  district?: string
  state?: string
  state_code?: string
  country?: string
  serviceable: boolean
  cod: boolean
  prepaid: boolean
}

export interface DirectOrderPincodeLookupResponse {
  pincode: string
  city?: string
  district?: string
  state?: string
  state_code?: string
  country?: string
  serviceable: boolean
  cod: boolean
  prepaid: boolean
  raw?: DirectOrderPincodeLookupCandidate[]
}

export interface NextDirectOrderIdResponse {
  order_id: string
}

// Issue & Return Types reuse the backend order payload.
export type Issue = Order
export type Return = Order
export type SafetyClaimOrder = Order
