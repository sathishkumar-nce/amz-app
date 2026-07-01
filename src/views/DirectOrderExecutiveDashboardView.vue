<template>
  <div class="dashboard-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">Direct orders overview</p>
        <h1>Direct Orders Executive Dashboard</h1>
        <p class="hero-copy">
          Daily direct-order trend, other-issues trend, and distribution views across state, city, and thickness.
        </p>
      </div>
    </section>

    <section class="filter-card">
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
            <option value="confirmed">confirmed</option>
            <option value="manufactured">manufactured</option>
            <option value="forwarded">forwarded</option>
            <option value="delivered">delivered</option>
            <option value="cancelled">cancelled</option>
            <option value="on-hold">on-hold</option>
            <option value="other-issues">other-issues</option>
            <option value="returned">returned</option>
          </select>
        </label>

        <label class="filter-field">
          <span>Thickness</span>
          <input v-model="filters.thickness" class="filter-input" placeholder="All Thickness" />
        </label>

        <label class="filter-field">
          <span>State</span>
          <input
            v-model="filters.state"
            list="direct-dashboard-states"
            class="filter-input"
            placeholder="All States"
          />
          <datalist id="direct-dashboard-states">
            <option v-for="state in dashboard?.available_states || []" :key="state" :value="state" />
          </datalist>
        </label>

        <label class="filter-field">
          <span>City</span>
          <input
            v-model="filters.city"
            list="direct-dashboard-cities"
            class="filter-input"
            placeholder="All Cities"
          />
          <datalist id="direct-dashboard-cities">
            <option v-for="city in dashboard?.available_cities || []" :key="city" :value="city" />
          </datalist>
        </label>

        <div class="filter-actions">
          <button type="button" class="refresh-button" :disabled="loading" @click="refreshDashboard">
            <ArrowPathIcon class="refresh-icon" />
            {{ loading ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>
      </div>
    </section>

    <section class="kpi-section">
      <div v-if="loading" class="kpi-grid">
        <div v-for="index in 6" :key="`kpi-${index}`" class="skeleton skeleton--card" />
      </div>
      <div v-else class="kpi-grid">
        <ExecutiveKpiCard
          v-for="card in kpiCards"
          :key="card.title"
          :icon="card.icon"
          :title="card.title"
          :value="card.value"
          :tone="card.tone"
        />
      </div>
    </section>

    <section class="charts-grid">
      <div v-if="loading" class="skeleton skeleton--chart" />
      <ExecutiveTrendChart
        v-else
        title="Direct Orders Trend"
        eyebrow="Orders Per Day"
        :points="dashboard?.orders_trend || []"
        color="#0f766e"
      />

      <div v-if="loading" class="skeleton skeleton--chart" />
      <ExecutiveTrendChart
        v-else
        title="Other Issues Trend"
        eyebrow="Status = other-issues"
        :points="dashboard?.other_issues_trend || []"
        color="#e11d48"
      />
    </section>

    <section class="pie-grid">
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
        title="Orders By City"
        eyebrow="City Mix"
        :slices="dashboard?.orders_by_city || []"
      />

      <div v-if="loading" class="skeleton skeleton--chart" />
      <ExecutivePieChart
        v-else
        title="Orders By Thickness"
        eyebrow="Thickness Mix"
        :slices="dashboard?.orders_by_thickness || []"
      />
    </section>

    <div v-if="error" class="error-banner">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  CubeTransparentIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/vue/24/outline'
import { directOrdersApi } from '@/api/directOrders'
import ExecutiveKpiCard from '@/components/ExecutiveKpiCard.vue'
import ExecutivePieChart from '@/components/ExecutivePieChart.vue'
import ExecutiveTrendChart from '@/components/ExecutiveTrendChart.vue'
import type { DirectOrderExecutiveDashboardResponse } from '@/types'

type KpiTone = 'teal' | 'amber' | 'rose' | 'sky' | 'slate'

const dashboard = ref<DirectOrderExecutiveDashboardResponse | null>(null)
const loading = ref(false)
const error = ref('')

const filters = reactive({
  fromDate: '',
  toDate: '',
  orderStatus: '',
  thickness: '',
  state: '',
  city: '',
})

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
    dashboard.value = await directOrdersApi.getExecutiveDashboard({
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
    error.value = loadError?.response?.data?.error || 'Unable to load the direct orders dashboard right now.'
  } finally {
    loading.value = false
  }
}

const formatDecimal = (value: number) => value.toFixed(2)

const kpiCards = computed(() => {
  const summary = dashboard.value?.summary
  if (!summary) return []

  return [
    { title: 'Total Orders', value: String(summary.total_orders), tone: 'teal' as KpiTone, icon: ChartBarIcon },
    { title: 'Manufactured', value: String(summary.manufactured_orders), tone: 'sky' as KpiTone, icon: WrenchScrewdriverIcon },
    { title: 'Other Issues', value: String(summary.other_issues_orders), tone: 'rose' as KpiTone, icon: ExclamationTriangleIcon },
    { title: 'Cancelled', value: String(summary.cancelled_orders), tone: 'amber' as KpiTone, icon: CubeTransparentIcon },
    { title: 'On Hold', value: String(summary.on_hold_orders), tone: 'slate' as KpiTone, icon: ClockIcon },
    { title: 'Avg / Day', value: formatDecimal(summary.average_per_day), tone: 'teal' as KpiTone, icon: ArrowPathIcon },
  ]
})

onMounted(async () => {
  initializeDateRange()
  await refreshDashboard()
})
</script>

<style scoped>
.dashboard-page {
  max-width: 1600px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.hero-card,
.filter-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 28px;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.hero-card {
  padding: 1.5rem 1.6rem;
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.16), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.92));
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
  color: #0f172a;
  font-size: clamp(1.9rem, 4vw, 2.8rem);
}

.hero-copy {
  margin: 0.6rem 0 0;
  max-width: 60rem;
  color: #475569;
  font-size: 1rem;
  line-height: 1.65;
}

.filter-card {
  padding: 1.2rem;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.9rem;
  align-items: end;
}

.filter-field {
  display: grid;
  gap: 0.45rem;
}

.filter-field span {
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #475569;
}

.filter-input {
  width: 100%;
  min-height: 3rem;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.34);
  background: rgba(248, 250, 252, 0.95);
  padding: 0.85rem 0.95rem;
  color: #0f172a;
  font-size: 0.98rem;
}

.filter-actions {
  display: flex;
  align-items: end;
}

.refresh-button {
  min-height: 3rem;
  border: 0;
  border-radius: 16px;
  padding: 0 1.15rem;
  background: linear-gradient(135deg, #0f766e, #0ea5e9);
  color: #fff;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  cursor: pointer;
}

.refresh-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.refresh-icon {
  width: 1rem;
  height: 1rem;
}

.kpi-grid,
.charts-grid,
.pie-grid {
  display: grid;
  gap: 1rem;
}

.kpi-grid {
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.charts-grid {
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
}

.pie-grid {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
}

.skeleton {
  position: relative;
  overflow: hidden;
  background: rgba(226, 232, 240, 0.75);
  border-radius: 24px;
}

.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent);
  animation: shimmer 1.4s infinite;
}

.skeleton--card {
  height: 120px;
}

.skeleton--chart {
  min-height: 340px;
}

.error-banner {
  border-radius: 20px;
  border: 1px solid rgba(248, 113, 113, 0.3);
  background: rgba(254, 242, 242, 0.96);
  color: #b91c1c;
  padding: 1rem 1.1rem;
  font-weight: 700;
}

@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
