<template>
  <div class="queue-page">
    <section class="queue-hero">
      <div>
        <p class="eyebrow">{{ eyebrow }}</p>
        <h1>{{ title }}</h1>
        <p class="queue-hero__copy">{{ description }}</p>
      </div>
      <div class="queue-hero__count">{{ total }} orders</div>
    </section>

    <section class="queue-filters">
      <div class="preset-row">
        <button
          v-for="preset in presets"
          :key="preset.value"
          @click="applyPreset(preset.value)"
          :class="['preset-chip', { 'preset-chip--active': selectedPreset === preset.value }]"
        >
          {{ preset.label }}
        </button>
      </div>

      <div class="filter-grid">
        <input v-model="filters.order_id" type="text" placeholder="Order ID or wildcard" class="filter-input" />
        <input v-model="filters.customer" type="text" placeholder="Customer name" class="filter-input" />
        <input v-model="filters.mobile" type="text" placeholder="Mobile" class="filter-input" />
        <input v-model="filters.sku" type="text" placeholder="SKU or wildcard" class="filter-input" />
        <div class="filter-inline">
          <select v-model="filters.quantity_operator" class="filter-input filter-input--operator">
            <option value="gt">&gt;</option>
            <option value="gte">&gt;=</option>
            <option value="lt">&lt;</option>
            <option value="lte">&lt;=</option>
            <option value="eq">=</option>
          </select>
          <input v-model="filters.quantity" type="number" min="0" step="0.01" placeholder="Quantity" class="filter-input" />
        </div>
        <input v-model="filters.confirmed_date" type="date" class="filter-input" />
        <input v-model="filters.confirmed_date_from" type="date" class="filter-input" />
        <input v-model="filters.confirmed_date_to" type="date" class="filter-input" />
        <input v-model="filters.search" type="text" placeholder="General search" class="filter-input" />
        <input v-model="filters.delivery_state" type="text" placeholder="State" class="filter-input" />
        <input v-model="filters.priority" type="text" placeholder="Priority like p1, p2" class="filter-input" />
        <select v-model="filters.order_status" class="filter-input">
          <option value="">All order statuses</option>
          <option value="received">received</option>
          <option value="manufactured">manufactured</option>
          <option value="cancelled">cancelled</option>
          <option value="returned">returned</option>
        </select>
        <select v-model="filters.round_product" class="filter-input">
          <option value="">Round + non-round</option>
          <option value="true">Round only</option>
          <option value="false">Non-round only</option>
        </select>
        <select v-model="filters.customer_inputs_mode" class="filter-input">
          <option value="">All inputs</option>
          <option value="no_custom_inputs">No custom inputs</option>
          <option value="has_customer_inputs">Has custom inputs</option>
        </select>
        <input v-model="filters.date_from" type="date" class="filter-input" />
        <input v-model="filters.date_to" type="date" class="filter-input" />
        <select v-model="filters.sort_by" class="filter-input">
          <option value="date_confirmed">Sort by confirmed date</option>
          <option value="default_width_in_inches">Sort by width (in)</option>
          <option value="default_length_in_inches">Sort by length (in)</option>
          <option value="default_width_in_mm">Sort by width (mm)</option>
          <option value="default_length_in_mm">Sort by length (mm)</option>
          <option value="quantity">Sort by quantity</option>
          <option value="round_product">Sort by round product</option>
          <option value="order_status">Sort by order status</option>
        </select>
        <select v-model="filters.sort_dir" class="filter-input">
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
        <button @click="refresh" class="filter-button">Apply</button>
      </div>
    </section>

    <section class="queue-table-shell">
      <div v-if="loading" class="empty-state">Loading {{ title.toLowerCase() }}...</div>
      <div v-else-if="displayedRows.length === 0" class="empty-state">No matching orders found.</div>
      <template v-else>
        <ListUtilityBar
          :total="total"
          :page="page"
          :total-pages="totalPages"
          item-label="orders"
          helper-text="Use * in search fields for wildcard matching"
        />
        <div class="queue-table-scroll">
          <table class="queue-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Confirmed Date</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>City / State</th>
              <th>Products</th>
              <th>Priority</th>
              <th>{{ statusLabel }}</th>
              <th>{{ detailLabel }}</th>
              <th>View</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in displayedRows" :key="order.amazon_order_id" :style="getRowStyle(order)">
              <td class="cell-order-id">
                <strong>{{ order.amazon_order_id }}</strong>
                <span>BL #{{ order.baselinker_order_id }}</span>
              </td>
              <td>{{ formatDate(order.date_confirmed || order.date_add) }}</td>
              <td>{{ formatText(order.delivery_fullname || order.user_login) }}</td>
              <td>{{ formatText(order.phone) }}</td>
              <td>{{ formatLocation(order.delivery_city, order.delivery_state) }}</td>
              <td class="cell-detail">{{ getProductSummary(order) }}</td>
              <td>
                <span class="priority-pill" :class="priorityClass(order.priority)">{{ order.priority.toUpperCase() }}</span>
              </td>
              <td>
                <span class="status-pill">{{ getStatusValue(order) }}</span>
              </td>
              <td class="cell-detail">{{ getDetailValue(order) }}</td>
              <td>
                <router-link :to="`/orders/${order.amazon_order_id}`" class="view-link">View / Edit</router-link>
              </td>
            </tr>
          </tbody>
          </table>
        </div>
      </template>

      <PaginationControls
        :page="page"
        :total-pages="totalPages"
        :total="total"
        :limit="limit"
        item-label="orders"
        @change="changePage"
        @limit-change="changeLimit"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ListUtilityBar from '@/components/ListUtilityBar.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { useAmazonRowHighlightRulesStore } from '@/stores/amazonRowHighlightRules'
import type { Order, OrderFilters } from '@/types'
import { formatProductNameForDisplay, formatStandardDate } from '@/utils/orderData'

type PresetValue = 'today' | 'yesterday' | 'last_7_days' | 'week_to_date' | 'month_to_date' | 'custom'
type QueueMode = 'issues' | 'returns' | 'safety'

const props = defineProps<{
  eyebrow: string
  title: string
  description: string
  rows: Order[]
  total: number
  loading: boolean
  mode: QueueMode
  page: number
  limit: number
  totalPages: number
}>()

const emit = defineEmits<{
  fetch: [filters: OrderFilters]
}>()

const presets = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last_7_days' },
  { label: 'Week to Date', value: 'week_to_date' },
  { label: 'Month to Date', value: 'month_to_date' },
  { label: 'Custom', value: 'custom' },
] as const

const selectedPreset = ref<PresetValue>('today')
const rowHighlightRulesStore = useAmazonRowHighlightRulesStore()
const filters = ref({
  order_id: '',
  customer: '',
  mobile: '',
  sku: '',
  quantity_operator: 'gte' as 'gt' | 'gte' | 'lt' | 'lte' | 'eq',
  quantity: '',
  confirmed_date: '',
  confirmed_date_from: '',
  confirmed_date_to: '',
  search: '',
  delivery_state: '',
  priority: '',
  order_status: '',
  round_product: '',
  customer_inputs_mode: '' as '' | 'has_customer_inputs' | 'no_custom_inputs',
  sort_by: 'date_confirmed',
  sort_dir: 'desc' as 'asc' | 'desc',
  date_from: '',
  date_to: '',
  page: props.page || 1,
  limit: props.limit || 100,
})

const statusLabel = props.mode === 'issues' ? 'Other Issues' : props.mode === 'returns' ? 'Return Initiated' : 'Safety Claimed'
const detailLabel = props.mode === 'issues' ? 'Issue Details' : props.mode === 'returns' ? 'Return Details' : 'Claim Details'

const formatDate = (dateString?: string | null) => formatStandardDate(dateString)
const formatProductName = formatProductNameForDisplay
const formatText = (value?: string | null) => value?.trim() || 'Not available'
const formatLocation = (city?: string | null, state?: string | null) => [city, state].filter(Boolean).join(' / ') || 'Not available'

const priorityClass = (priority: string) => {
  if (priority === 'p1') return 'priority-pill--high'
  if (priority === 'p2') return 'priority-pill--medium'
  return 'priority-pill--low'
}

const getRowStyle = (order: Order) => rowHighlightRulesStore.getRowHighlightStyle(order, getRelevantProducts(order))

const toDateInput = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const buildDateRange = (preset: PresetValue) => {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)

  if (preset === 'today') {
    start.setHours(0, 0, 0, 0)
    end.setDate(end.getDate() + 1)
    end.setHours(0, 0, 0, 0)
  } else if (preset === 'yesterday') {
    start.setDate(start.getDate() - 1)
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
  } else if (preset === 'last_7_days') {
    start.setDate(start.getDate() - 6)
    start.setHours(0, 0, 0, 0)
    end.setDate(end.getDate() + 1)
    end.setHours(0, 0, 0, 0)
  } else if (preset === 'week_to_date') {
    const day = start.getDay()
    const diff = day === 0 ? 6 : day - 1
    start.setDate(start.getDate() - diff)
    start.setHours(0, 0, 0, 0)
    end.setDate(end.getDate() + 1)
    end.setHours(0, 0, 0, 0)
  } else if (preset === 'month_to_date') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    end.setDate(end.getDate() + 1)
    end.setHours(0, 0, 0, 0)
  }

  return {
    from: toDateInput(start),
    to: preset === 'custom' ? filters.value.date_to : toDateInput(new Date(end.getTime() - 1)),
  }
}

const buildRequestFilters = (): OrderFilters => {
  const request: OrderFilters = {
    order_id: filters.value.order_id || undefined,
    customer: filters.value.customer || undefined,
    mobile: filters.value.mobile || undefined,
    sku: filters.value.sku || undefined,
    quantity: filters.value.quantity || undefined,
    quantity_operator: filters.value.quantity ? filters.value.quantity_operator : undefined,
    confirmed_date: filters.value.confirmed_date || undefined,
    confirmed_date_from: filters.value.confirmed_date_from || undefined,
    confirmed_date_to: filters.value.confirmed_date_to || undefined,
    search: filters.value.search || undefined,
    delivery_state: filters.value.delivery_state || undefined,
    priority: filters.value.priority || undefined,
    order_status: filters.value.order_status || undefined,
    round_product: filters.value.round_product ? filters.value.round_product === 'true' : undefined,
    missing_customer_inputs: filters.value.customer_inputs_mode === 'no_custom_inputs' ? true : undefined,
    has_customer_inputs: filters.value.customer_inputs_mode === 'has_customer_inputs' ? true : undefined,
    page: filters.value.page || 1,
    limit: filters.value.limit || props.limit || 100,
  }

  if (filters.value.date_from) {
    request.date_from = new Date(`${filters.value.date_from}T00:00:00`).toISOString()
  }
  if (filters.value.date_to) {
    const end = new Date(`${filters.value.date_to}T00:00:00`)
    end.setDate(end.getDate() + 1)
    request.date_to = end.toISOString()
  }

  return request
}

const applyPreset = (preset: PresetValue) => {
  selectedPreset.value = preset
  filters.value.page = 1
  if (preset !== 'custom') {
    const range = buildDateRange(preset)
    filters.value.date_from = range.from
    filters.value.date_to = range.to
  }
  refresh()
}

const refresh = () => {
  emit('fetch', buildRequestFilters())
}

const changePage = (page: number) => {
  if (page < 1 || page > props.totalPages || page === filters.value.page) return
  filters.value.page = page
  refresh()
}

const changeLimit = (limit: number) => {
  if (limit === filters.value.limit) return
  filters.value.limit = limit
  filters.value.page = 1
  refresh()
}

const compareNullableNumbers = (left?: number | null, right?: number | null) => {
  const a = left ?? Number.NEGATIVE_INFINITY
  const b = right ?? Number.NEGATIVE_INFINITY
  return a - b
}

const productMatchesMissingInputs = (product: NonNullable<Order['products']>[number]) =>
  product.customer_width_in_inches == null &&
  product.customer_length_in_inches == null &&
  product.customer_width_in_mm == null &&
  product.customer_length_in_mm == null &&
  !(product.corner_radius_and_notes || '').trim()

const productHasCustomerInputs = (product: NonNullable<Order['products']>[number]) =>
  product.customer_width_in_inches != null ||
  product.customer_length_in_inches != null ||
  Boolean((product.corner_radius_and_notes || '').trim())

const getStatusValue = (order: Order) => {
  const products = getRelevantProducts(order)
  if (products.length === 0) return 'none'
  if (props.mode === 'issues') return products.map((product) => product.other_issues ? 'true' : 'false').join(', ')
  if (props.mode === 'returns') return products.map((product) => product.return_initiated ? 'true' : 'false').join(', ')
  return products.map((product) => product.safety_claimed ? 'true' : 'false').join(', ')
}

const getDetailValue = (order: Order) => {
  const products = getRelevantProducts(order)
  if (products.length === 0) return 'No matching product notes'
  if (props.mode === 'issues') {
    return products.map((product) => product.other_issues_reason || formatProductName(product.name) || product.sku || 'Issue item').join(' | ')
  }
  if (props.mode === 'returns') {
    return products.map((product) => product.return_initiated_reason || product.return_initiated_followup_action || product.return_initiated_compromised_reason || formatProductName(product.name) || product.sku || 'Return item').join(' | ')
  }
  return products.map((product) => product.safety_claim_issues || formatProductName(product.name) || product.sku || 'Safety item').join(' | ')
}

const getRelevantProducts = (order: Order) => {
  const products = order.products || []
  if (props.mode === 'issues') return products.filter((product) => product.other_issues === true)
  if (props.mode === 'returns') return products.filter((product) => product.return_initiated === true)
  return products.filter((product) => product.safety_claimed === true)
}

const getSortValue = (order: Order) => {
  const products = getRelevantProducts(order)
  const first = products[0] || order.products?.[0]

  switch (filters.value.sort_by) {
    case 'default_width_in_inches':
      return first?.default_width_in_inches ?? null
    case 'default_length_in_inches':
      return first?.default_length_in_inches ?? null
    case 'default_width_in_mm':
      return first?.default_width_in_mm ?? null
    case 'default_length_in_mm':
      return first?.default_length_in_mm ?? null
    case 'quantity':
      return first?.quantity ?? null
    case 'round_product':
      return first?.is_round ? 1 : 0
    case 'order_status':
      return order.order_status || 'received'
    default:
      return order.date_confirmed || order.date_add || ''
  }
}

const displayedRows = computed(() => {
  const filtered = props.rows.filter((order) => {
    const products = getRelevantProducts(order)
    if (filters.value.round_product === 'true' && !products.some((product) => product.is_round)) return false
    if (filters.value.round_product === 'false' && products.some((product) => product.is_round)) return false
    if (filters.value.customer_inputs_mode === 'no_custom_inputs' && !products.some(productMatchesMissingInputs)) return false
    if (filters.value.customer_inputs_mode === 'has_customer_inputs' && !products.some(productHasCustomerInputs)) return false
    return true
  })

  return [...filtered].sort((left, right) => {
    const direction = filters.value.sort_dir === 'asc' ? 1 : -1
    const leftValue = getSortValue(left)
    const rightValue = getSortValue(right)

    if (typeof leftValue === 'number' || typeof rightValue === 'number') {
      return compareNullableNumbers(leftValue as number | null, rightValue as number | null) * direction
    }

    const a = String(leftValue ?? '')
    const b = String(rightValue ?? '')
    if (filters.value.sort_by === 'date_confirmed') {
      return (new Date(a || 0).getTime() - new Date(b || 0).getTime()) * direction
    }
    return a.localeCompare(b) * direction
  })
})

const getProductSummary = (order: Order) => {
  const products = getRelevantProducts(order)
  if (products.length === 0) return 'No matching products'
  return products.map((product) => formatProductName(product.name)).filter(Boolean).join(', ')
}

onMounted(() => {
  applyPreset('today')
})
</script>

<style scoped>
.queue-page {
  display: grid;
  gap: 1rem;
}

.queue-hero,
.queue-filters,
.queue-table-shell {
  background: rgba(255, 255, 255, 0.93);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 22px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.queue-hero {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 1.15rem 1.25rem;
}

.eyebrow {
  margin: 0 0 0.2rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.68rem;
  font-weight: 800;
  color: #0f766e;
}

h1 {
  margin: 0;
  font-size: 1.9rem;
  line-height: 1.05;
  font-weight: 900;
  color: #0f172a;
}

.queue-hero__copy {
  margin: 0.3rem 0 0;
  color: #64748b;
}

.queue-hero__count {
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f766e;
  white-space: nowrap;
}

.queue-filters {
  padding: 1rem 1.05rem;
  display: grid;
  gap: 0.85rem;
}

.preset-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preset-chip,
.filter-button,
.view-link {
  border: 0;
  border-radius: 12px;
  font-weight: 800;
  cursor: pointer;
}

.preset-chip {
  min-height: 2.3rem;
  padding: 0 0.9rem;
  background: #e2e8f0;
  color: #334155;
}

.preset-chip--active,
.filter-button,
.view-link {
  background: linear-gradient(135deg, #0f766e, #115e59);
  color: #ffffff;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 0.65rem;
  align-items: stretch;
}

.filter-input {
  width: 100%;
  min-height: 2.75rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #ffffff;
  padding: 0 0.85rem;
  color: #0f172a;
}

.filter-inline {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: 0.45rem;
}

.filter-input--operator {
  text-align: center;
  padding-left: 0.55rem;
  padding-right: 0.55rem;
}

.filter-button,
.view-link {
  min-height: 2.75rem;
  padding: 0 1rem;
}

.filter-button--ghost {
  background: #ecfeff;
  color: #0f766e;
  border: 1px solid rgba(15, 118, 110, 0.2);
}

.filter-button--active {
  background: linear-gradient(135deg, #0f766e, #115e59);
  color: #ffffff;
}

.queue-table-scroll {
  overflow: auto;
  border-radius: 22px;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pan-y;
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.queue-table {
  width: 100%;
  min-width: 1400px;
  border-collapse: separate;
  border-spacing: 0;
}

.queue-table-shell {
  padding: 1rem 1.05rem 1.15rem;
}

.queue-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 0.8rem 0.75rem;
  background: linear-gradient(180deg, rgba(15, 118, 110, 0.12), rgba(255, 255, 255, 0.98)), #ffffff;
  border-bottom: 1px solid rgba(148, 163, 184, 0.28);
  color: #0f766e;
  text-align: left;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.11em;
  white-space: nowrap;
}

.queue-table tbody td {
  padding: 0.9rem 0.8rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  vertical-align: top;
  font-size: 0.92rem;
  line-height: 1.35;
  color: #0f172a;
  background: var(--row-highlight-background, rgba(255, 255, 255, 0.92));
}

.cell-order-id strong {
  display: block;
  font-size: 1.05rem;
  font-weight: 900;
  white-space: nowrap;
}

.cell-order-id span {
  display: block;
  margin-top: 0.3rem;
  color: #64748b;
  font-size: 0.84rem;
}

.priority-pill,
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.85rem;
  padding: 0.12rem 0.7rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 900;
  white-space: nowrap;
}

.priority-pill--high {
  background: #fee2e2;
  color: #b91c1c;
}

.priority-pill--medium {
  background: #fef3c7;
  color: #b45309;
}

.priority-pill--low {
  background: #dcfce7;
  color: #166534;
}

.status-pill {
  background: #dbeafe;
  color: #1d4ed8;
}

.cell-detail {
  min-width: 280px;
}

.empty-state {
  padding: 2.25rem 1rem;
  text-align: center;
  color: #64748b;
}

.view-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .queue-hero {
    display: grid;
    align-items: start;
  }

  .queue-table-shell {
    padding: 0.9rem;
  }

  .filter-grid {
    grid-template-columns: 1fr;
  }
}
</style>
