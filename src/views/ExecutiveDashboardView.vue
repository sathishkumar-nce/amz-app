<template>
  <div class="executive-dashboard">
    <section class="executive-hero">
      <div>
        <p class="eyebrow">Amazon MFN overview</p>
        <h1>Executive Dashboard</h1>
        <p class="executive-hero__copy">
          Quick operating snapshot across orders, returns, safety claims, and issue activity for the current Amazon MFN business window.
        </p>
      </div>
    </section>

    <section class="filter-panel">
      <div class="filter-grid">
        <label class="filter-field">
          <span>From Date</span>
          <input v-model="filters.fromDate" type="date" class="filter-input" />
        </label>

        <label class="filter-field">
          <span>To Date</span>
          <input v-model="filters.toDate" type="date" class="filter-input" />
        </label>

        <label class="filter-field">
          <span>Order Status</span>
          <select v-model="filters.orderStatus" class="filter-input">
            <option value="">All</option>
            <option value="received">received</option>
            <option value="manufactured">manufactured</option>
            <option value="cancelled">cancelled</option>
            <option value="returned">returned</option>
          </select>
        </label>

        <label class="filter-field">
          <span>Thickness</span>
          <select v-model="filters.thickness" class="filter-input">
            <option value="">All</option>
            <option value="1 mm">1 mm</option>
            <option value="1.5 mm">1.5 mm</option>
            <option value="2 mm">2 mm</option>
            <option value="3 mm">3 mm</option>
          </select>
        </label>

        <label class="filter-field">
          <span>State</span>
          <input
            v-model="filters.state"
            list="executive-states"
            class="filter-input"
            placeholder="All States"
          />
          <datalist id="executive-states">
            <option v-for="state in dashboard?.available_states || []" :key="state" :value="state" />
          </datalist>
        </label>

        <label class="filter-field">
          <span>City</span>
          <input
            v-model="filters.city"
            list="executive-cities"
            class="filter-input"
            placeholder="All Cities"
          />
          <datalist id="executive-cities">
            <option v-for="city in dashboard?.available_cities || []" :key="city" :value="city" />
          </datalist>
        </label>

        <div class="filter-actions">
          <button type="button" class="refresh-button" :disabled="loading" @click="refreshDashboard">
            <ArrowPathIcon class="refresh-button__icon" />
            {{ loading ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>
      </div>
    </section>

    <section class="kpi-section">
      <div v-if="loading" class="kpi-grid">
        <div v-for="index in 8" :key="`kpi-skeleton-${index}`" class="skeleton skeleton--card" />
      </div>
      <div v-else class="kpi-grid">
        <ExecutiveKpiCard
          v-for="card in kpiCards"
          :key="card.title"
          :icon="card.icon"
          :title="card.title"
          :value="card.value"
          :percentage="card.percentage"
          :tone="card.tone"
        />
      </div>
    </section>

    <section class="charts-grid">
      <div v-if="loading" class="skeleton skeleton--chart" />
      <ExecutiveTrendChart
        v-else
        title="Orders Trend"
        eyebrow="Orders Confirmed"
        :points="dashboard?.orders_trend || []"
        color="#0f766e"
      />

      <div v-if="loading" class="skeleton skeleton--chart" />
      <ExecutiveTrendChart
        v-else
        title="Returns Trend"
        eyebrow="Returned Orders"
        :points="dashboard?.returns_trend || []"
        color="#e11d48"
      />

      <div v-if="loading" class="skeleton skeleton--chart" />
      <ExecutiveTrendChart
        v-else
        title="Customer Input Gap Trend"
        eyebrow="Missing Any Customer Input"
        :points="dashboard?.customer_input_gap_trend || []"
        color="#f59e0b"
        value-suffix="%"
        summary-mode="average"
      />
    </section>

    <section class="pie-grid">
      <div v-if="loading" class="skeleton skeleton--chart" />
      <ExecutivePieChart
        v-else
        title="Orders By Thickness"
        eyebrow="Thickness Mix"
        :slices="dashboard?.orders_by_thickness || []"
      />

      <div v-if="loading" class="skeleton skeleton--chart" />
      <ExecutivePieChart
        v-else
        title="Orders By State"
        eyebrow="State Mix"
        :slices="dashboard?.orders_by_state || []"
      />

      <div v-if="loading" class="skeleton skeleton--chart" />
      <ExecutivePieChart
        v-else
        title="Orders By SKU"
        eyebrow="SKU Mix"
        :slices="dashboard?.orders_by_sku || []"
      />

      <div v-if="loading" class="skeleton skeleton--chart" />
      <ExecutivePieChart
        v-else
        title="Orders By Price Band"
        eyebrow="Price Mix"
        :slices="dashboard?.orders_by_price_band || []"
      />
    </section>

    <section class="activity-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Recent Activity</p>
          <h2>Recently Updated Orders</h2>
        </div>
        <p v-if="dashboard" class="panel-meta">Updated {{ formatTimestamp(dashboard.generated_at) }}</p>
      </div>

      <div v-if="loading" class="activity-skeleton">
        <div v-for="index in 7" :key="`row-skeleton-${index}`" class="skeleton skeleton--row" />
      </div>
      <div v-else-if="!sortedRecentActivity.length" class="panel-empty">No Data Available</div>
      <div v-else ref="activityTableWrapRef" class="activity-table-wrap">
        <table class="activity-table">
          <thead>
            <tr>
              <th v-for="column in columns" :key="column.key">
                <button type="button" class="sort-button" @click="setSort(column.key)">
                  {{ column.label }}
                  <span v-if="sortKey === column.key">{{ sortDir === 'asc' ? '↑' : '↓' }}</span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sortedRecentActivity" :key="row.amazon_order_id">
              <td>{{ row.amazon_order_id }}</td>
              <td>{{ formatDate(row.confirmed_date) }}</td>
              <td>{{ row.customer }}</td>
              <td>{{ row.state }}</td>
              <td>{{ row.thickness }}</td>
              <td><span class="status-pill">{{ row.order_status }}</span></td>
              <td><span :class="booleanPillClass(row.return_initiated)">{{ formatBoolean(row.return_initiated) }}</span></td>
              <td><span :class="booleanPillClass(row.safety_claimed)">{{ formatBoolean(row.safety_claimed) }}</span></td>
              <td><span :class="booleanPillClass(row.other_issue)">{{ formatBoolean(row.other_issue) }}</span></td>
              <td>{{ formatTimestamp(row.updated_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <StickyHorizontalScrollbar :target="activityTableWrapRef" always-visible />
    </section>

    <div v-if="error" class="error-banner">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import StickyHorizontalScrollbar from '@/components/StickyHorizontalScrollbar.vue'
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  Squares2X2Icon,
  WrenchScrewdriverIcon,
  XCircleIcon,
} from '@heroicons/vue/24/outline'
import { ordersApi } from '@/api/orders'
import ExecutiveKpiCard from '@/components/ExecutiveKpiCard.vue'
import ExecutivePieChart from '@/components/ExecutivePieChart.vue'
import ExecutiveTrendChart from '@/components/ExecutiveTrendChart.vue'
import type { ExecutiveDashboardResponse } from '@/types'

type KpiTone = 'teal' | 'amber' | 'rose' | 'sky' | 'slate'

type SortKey =
  | 'amazon_order_id'
  | 'confirmed_date'
  | 'customer'
  | 'state'
  | 'thickness'
  | 'order_status'
  | 'return_initiated'
  | 'safety_claimed'
  | 'other_issue'
  | 'updated_at'

const dashboard = ref<ExecutiveDashboardResponse | null>(null)
const activityTableWrapRef = ref<HTMLElement | null>(null)
const loading = ref(false)
const error = ref('')
const sortKey = ref<SortKey>('updated_at')
const sortDir = ref<'asc' | 'desc'>('desc')

const filters = reactive({
  fromDate: '',
  toDate: '',
  orderStatus: '',
  thickness: '',
  state: '',
  city: '',
})

const columns: Array<{ key: SortKey; label: string }> = [
  { key: 'amazon_order_id', label: 'Order ID' },
  { key: 'confirmed_date', label: 'Confirmed Date' },
  { key: 'customer', label: 'Customer' },
  { key: 'state', label: 'State' },
  { key: 'thickness', label: 'Thickness' },
  { key: 'order_status', label: 'Order Status' },
  { key: 'return_initiated', label: 'Return Initiated' },
  { key: 'safety_claimed', label: 'Safety Claimed' },
  { key: 'other_issue', label: 'Other Issue' },
  { key: 'updated_at', label: 'Updated At' },
]

const toDateInput = (value: Date) => {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const initializeDateRange = () => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const from = new Date(today)
  from.setDate(from.getDate() - 29)
  filters.fromDate = toDateInput(from)
  filters.toDate = toDateInput(today)
}

const refreshDashboard = async () => {
  if (!filters.fromDate || !filters.toDate) {
    error.value = 'Select both From Date and To Date.'
    return
  }

  if (filters.toDate < filters.fromDate) {
    error.value = 'To Date must be on or after From Date.'
    return
  }

  loading.value = true
  error.value = ''

  try {
    dashboard.value = await ordersApi.getExecutiveDashboard({
      dateRange: 'custom_range',
      fromDate: filters.fromDate,
      toDate: filters.toDate,
      state: filters.state || undefined,
      city: filters.city || undefined,
      thickness: filters.thickness || undefined,
      orderStatus: filters.orderStatus || undefined,
    })
  } catch (loadError: any) {
    dashboard.value = null
    error.value = loadError?.response?.data?.error || 'Unable to load the executive dashboard right now.'
  } finally {
    loading.value = false
  }
}

const setSort = (key: SortKey) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sortKey.value = key
  sortDir.value = key === 'updated_at' ? 'desc' : 'asc'
}

const sortedRecentActivity = computed(() => {
  const rows = dashboard.value?.recent_activity || []
  const direction = sortDir.value === 'asc' ? 1 : -1

  return [...rows].sort((left, right) => {
    const leftValue = left[sortKey.value]
    const rightValue = right[sortKey.value]

    if (sortKey.value === 'confirmed_date' || sortKey.value === 'updated_at') {
      const leftTime = leftValue ? new Date(String(leftValue)).getTime() : 0
      const rightTime = rightValue ? new Date(String(rightValue)).getTime() : 0
      return (leftTime - rightTime) * direction
    }

    if (typeof leftValue === 'boolean' && typeof rightValue === 'boolean') {
      return ((Number(leftValue) - Number(rightValue)) * direction)
    }

    return String(leftValue ?? '').localeCompare(String(rightValue ?? '')) * direction
  })
})

const formatDate = (value?: string | null) => {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

const formatTimestamp = (value?: string | null) => {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const formatBoolean = (value: boolean) => (value ? 'Yes' : 'No')
const booleanPillClass = (value: boolean) => ['boolean-pill', { 'boolean-pill--active': value, 'boolean-pill--inactive': !value }]
const formatPercent = (value: number) => `${value.toFixed(2)}%`

const kpiCards = computed(() => {
  const summary = dashboard.value?.summary
  if (!summary) return []

  return [
    { title: 'Total Orders', value: String(summary.total_orders), percentage: null, tone: 'teal' as KpiTone, icon: Squares2X2Icon },
    { title: 'Manufactured Orders', value: String(summary.manufactured_orders), percentage: null, tone: 'sky' as KpiTone, icon: WrenchScrewdriverIcon },
    { title: 'Cancelled Orders', value: String(summary.cancelled_orders), percentage: null, tone: 'rose' as KpiTone, icon: XCircleIcon },
    { title: 'Returned Orders', value: String(summary.returned_orders), percentage: null, tone: 'amber' as KpiTone, icon: ArrowUturnLeftIcon },
    { title: 'Return Rate', value: formatPercent(summary.return_rate), percentage: null, tone: 'slate' as KpiTone, icon: ChartBarIcon },
    { title: 'Safety Claims', value: String(summary.safety_claims), percentage: null, tone: 'sky' as KpiTone, icon: ShieldExclamationIcon },
    { title: 'Other Issues', value: String(summary.other_issues), percentage: null, tone: 'rose' as KpiTone, icon: ExclamationTriangleIcon },
    { title: 'Open Returns', value: String(summary.open_returns), percentage: null, tone: 'amber' as KpiTone, icon: ArrowPathIcon },
  ]
})

onMounted(async () => {
  initializeDateRange()
  await refreshDashboard()
})
</script>

<style scoped>
.executive-dashboard {
  max-width: 1600px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.executive-hero,
.filter-panel,
.activity-panel {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 28px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.executive-hero {
  padding: 1.5rem 1.6rem;
  background:
    radial-gradient(circle at top right, rgba(15, 118, 110, 0.18), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(240, 253, 250, 0.92));
}

.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.74rem;
  font-weight: 800;
  color: #0f766e;
}

h1 {
  margin: 0;
  font-size: clamp(2.2rem, 4vw, 3.4rem);
  line-height: 1;
  color: #0f172a;
}

.executive-hero__copy {
  margin: 0.85rem 0 0;
  max-width: 70ch;
  color: #475569;
}

.filter-panel {
  padding: 1rem;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.85rem;
  align-items: end;
}

.filter-field {
  display: grid;
  gap: 0.35rem;
}

.filter-field span {
  color: #475569;
  font-size: 0.86rem;
  font-weight: 700;
}

.filter-input {
  width: 100%;
  min-height: 3rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.38);
  padding: 0.75rem 0.85rem;
  background: #ffffff;
  font: inherit;
  color: #0f172a;
}

.filter-input:focus {
  outline: none;
  border-color: #0f766e;
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
}

.filter-actions {
  display: flex;
  align-items: end;
  justify-content: flex-end;
}

.refresh-button {
  min-height: 3rem;
  min-width: 10.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  border: 0;
  border-radius: 14px;
  padding: 0.75rem 1.2rem;
  background: linear-gradient(135deg, #0f766e, #0d9488);
  color: #ffffff;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(15, 118, 110, 0.18);
  transition: transform 160ms ease, box-shadow 160ms ease, filter 160ms ease;
}

.refresh-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 16px 30px rgba(15, 118, 110, 0.22);
  filter: saturate(1.04);
}

.refresh-button:disabled {
  opacity: 0.72;
  cursor: wait;
  box-shadow: none;
}

.refresh-button__icon {
  width: 1.15rem;
  height: 1.15rem;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.9rem;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.pie-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.activity-panel {
  padding: 1.2rem;
  display: grid;
  gap: 1rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.panel-header h2 {
  margin: 0;
  color: #0f172a;
}

.panel-meta {
  margin: 0;
  color: #64748b;
  font-weight: 700;
}

.activity-table-wrap {
  overflow-x: auto;
}

.activity-table {
  width: 100%;
  min-width: 1120px;
  border-collapse: collapse;
}

.activity-table th,
.activity-table td {
  padding: 0.9rem 0.8rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  text-align: left;
}

.activity-table th {
  background: #f8fafc;
}

.sort-button {
  border: 0;
  background: transparent;
  padding: 0;
  font: inherit;
  color: #0f172a;
  font-weight: 800;
  cursor: pointer;
}

.status-pill,
.boolean-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  font-weight: 800;
  font-size: 0.84rem;
}

.status-pill {
  background: #dcfce7;
  color: #166534;
  text-transform: capitalize;
}

.boolean-pill--active {
  background: #dcfce7;
  color: #166534;
}

.boolean-pill--inactive {
  background: #e2e8f0;
  color: #475569;
}

.panel-empty,
.error-banner {
  display: grid;
  place-items: center;
  min-height: 180px;
  border-radius: 22px;
  border: 1px dashed rgba(148, 163, 184, 0.5);
  color: #64748b;
  font-weight: 700;
}

.error-banner {
  min-height: auto;
  padding: 1rem;
  color: #b91c1c;
  border-style: solid;
  background: rgba(254, 242, 242, 0.95);
}

.skeleton {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  background: linear-gradient(90deg, #e2e8f0 0%, #f8fafc 50%, #e2e8f0 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.skeleton--card {
  min-height: 118px;
}

.skeleton--chart {
  min-height: 360px;
}

.activity-skeleton {
  display: grid;
  gap: 0.65rem;
}

.skeleton--row {
  min-height: 3.25rem;
  border-radius: 16px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 1200px) {
  .filter-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .pie-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .filter-grid {
    grid-template-columns: 1fr;
  }

  .filter-actions,
  .refresh-button {
    width: 100%;
  }
}
</style>
