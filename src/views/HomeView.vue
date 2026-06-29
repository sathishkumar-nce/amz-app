<template>
  <div class="dashboard">
    <section class="hero">
      <div>
        <p class="eyebrow">Operations cockpit</p>
        <h1>Run orders, returns, repeats, and analytics from one control room.</h1>
        <p class="hero__copy">
          The dashboard now combines live workflow counts, repeat-customer discovery, and production-ready charts for the busiest Amazon operations.
        </p>
      </div>

      <div class="hero__actions">
        <button @click="importOrders" :disabled="importing" class="primary-action">
          {{ importing ? 'Importing...' : 'Import Orders from BaseLinker' }}
        </button>
        <router-link to="/orders" class="secondary-action">Open Orders Board</router-link>
      </div>
    </section>

    <section v-if="analytics || analyticsLoading || analyticsError" class="analytics-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Live analytics</p>
          <h2>Operational trend snapshot.</h2>
        </div>
        <p v-if="analytics" class="analytics-meta">Updated {{ formatGeneratedAt(analytics.generated_at) }}</p>
      </div>

      <div class="analytics-range-bar">
        <label class="date-filter">
          <span>From</span>
          <input v-model="analyticsDateFrom" type="date" :max="analyticsDateTo" :disabled="analyticsLoading" />
        </label>
        <label class="date-filter">
          <span>To</span>
          <input v-model="analyticsDateTo" type="date" :min="analyticsDateFrom" :disabled="analyticsLoading" />
        </label>
        <button class="secondary-action secondary-action--compact" :disabled="analyticsLoading" @click="applyAnalyticsRange">
          {{ analyticsLoading ? 'Loading...' : 'Apply Range' }}
        </button>
      </div>

      <div v-if="analyticsLoading" class="panel-empty">Loading analytics...</div>
      <div v-else-if="analyticsError" class="panel-empty panel-empty--error">{{ analyticsError }}</div>

      <div v-else-if="analytics" class="analytics-studio">
        <div class="analytics-grid">
          <AnalyticsLineChartCard
            title="Orders Received"
            eyebrow="Intake"
            tone="teal"
            :points="analytics.orders_received_daily"
          />
          <AnalyticsLineChartCard
            title="Returns"
            eyebrow="After-sales"
            tone="rose"
            :points="analytics.returns_updated_daily"
          />
          <AnalyticsLineChartCard
            title="Safety Claims"
            eyebrow="Compliance"
            tone="sky"
            :points="analytics.safety_claims_updated_daily"
          />
          <AnalyticsLineChartCard
            title="Issues"
            eyebrow="Support queue"
            tone="amber"
            :points="analytics.issues_updated_daily"
          />
          <AnalyticsLineChartCard
            title="Customer Input Coverage"
            eyebrow="Data capture"
            tone="violet"
            :points="analytics.customer_input_coverage_daily"
            :decimal-places="1"
            summary-mode="average"
            value-suffix="%"
          />
        </div>
      </div>
    </section>

    <section v-if="analytics || analyticsLoading || analyticsError" class="charts-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Distribution charts</p>
          <h2>Where orders cluster and what customers buy most.</h2>
        </div>
        <div class="chart-filter">
          <span>Range</span>
          <strong>{{ analyticsDateFrom }} to {{ analyticsDateTo }}</strong>
        </div>
      </div>

      <div v-if="analyticsLoading" class="panel-empty">Loading chart distributions...</div>
      <div v-else-if="analyticsError" class="panel-empty panel-empty--error">{{ analyticsError }}</div>
      <div v-else-if="analytics" class="charts-grid">
        <DonutChartCard
          title="Orders by City / State"
          eyebrow="Orders"
          center-label="orders"
          :slices="analytics.orders_by_location"
        />
        <DonutChartCard
          title="Orders by Thickness"
          eyebrow="Production"
          center-label="products"
          :slices="analytics.thickness_distribution"
        />
        <DonutChartCard
          title="Most Ordered SKUs"
          eyebrow="Products"
          center-label="units"
          :slices="analytics.most_ordered_skus"
        />
        <DonutChartCard
          title="Returns by City / State"
          eyebrow="Returns"
          center-label="returns"
          :slices="analytics.returns_by_location"
        />
      </div>
    </section>

  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { ordersApi } from '@/api/orders'
import AnalyticsLineChartCard from '@/components/AnalyticsLineChartCard.vue'
import DonutChartCard from '@/components/DonutChartCard.vue'
import { useOrdersStore } from '@/stores/orders'
import { useShippingDateFiltersStore } from '@/stores/shippingDateFilters'
import type { DashboardAnalytics } from '@/types'

const ordersStore = useOrdersStore()
const shippingFilterStore = useShippingDateFiltersStore()
const importing = ref(false)
const analytics = ref<DashboardAnalytics | null>(null)
const analyticsLoading = ref(false)
const analyticsError = ref('')
const analyticsDateFrom = ref('')
const analyticsDateTo = ref('')

const toDateInputValue = (value?: string | null) => {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

const syncDashboardRangeToShippingFilter = () => {
  const range = shippingFilterStore.getActiveRange()
  if (!range) {
    analyticsDateFrom.value = ''
    analyticsDateTo.value = ''
    return
  }
  analyticsDateFrom.value = toDateInputValue(range.confirmed_date_from)
  analyticsDateTo.value = toDateInputValue(range.confirmed_date_to)
}

const loadAnalytics = async () => {
  analyticsLoading.value = true
  analyticsError.value = ''
  try {
    analytics.value = await ordersApi.getDashboardAnalytics({
      dateFrom: analyticsDateFrom.value,
      dateTo: analyticsDateTo.value,
    })
    if (analytics.value?.range_start) {
      analyticsDateFrom.value = analytics.value.range_start
    }
    if (analytics.value?.range_end) {
      analyticsDateTo.value = analytics.value.range_end
    }
  } catch (error: any) {
    analytics.value = null
    analyticsError.value = error.response?.data?.error || 'Unable to load dashboard charts right now.'
  } finally {
    analyticsLoading.value = false
  }
}

const applyAnalyticsRange = async () => {
  await loadAnalytics()
}

const formatGeneratedAt = (value: string) => new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value))

const importOrders = async () => {
  importing.value = true
  try {
    await ordersStore.importFromBaseLinker()
    alert('Orders imported successfully!')
    await loadAnalytics()
  } catch (error: any) {
    alert(error.response?.data?.error || error.message || 'Failed to import orders')
  } finally {
    importing.value = false
  }
}

onMounted(() => {
  void shippingFilterStore.ensureLoaded().then(() => {
    syncDashboardRangeToShippingFilter()
    return loadAnalytics()
  })
})

watch(
  () => shippingFilterStore.activeKey,
  async () => {
    await shippingFilterStore.ensureLoaded()
    syncDashboardRangeToShippingFilter()
    await loadAnalytics()
  },
)
</script>

<style scoped>
.dashboard {
  max-width: 1440px;
  margin: 0 auto;
  display: grid;
  gap: 1.15rem;
}

.hero,
.analytics-panel,
.charts-panel {
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 28px;
  padding: 1.45rem 1.5rem;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  gap: 1.2rem;
  background:
    radial-gradient(circle at top right, rgba(15, 118, 110, 0.18), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(240, 253, 250, 0.92));
}

.eyebrow {
  margin: 0 0 0.45rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  font-weight: 800;
  color: #0f766e;
}

h1,
h2 {
  margin: 0;
  color: #0f172a;
}

h1 {
  font-size: clamp(2rem, 4vw, 3.3rem);
  line-height: 1.02;
  font-weight: 900;
  max-width: 15ch;
}

h2 {
  font-size: 1.5rem;
}

.hero__copy {
  margin: 1rem 0 0;
  max-width: 60ch;
  color: #475569;
  font-size: 1rem;
}

.hero__actions {
  display: grid;
  align-content: center;
  gap: 0.85rem;
}

.primary-action,
.secondary-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 3.25rem;
  border-radius: 18px;
  font-weight: 800;
  cursor: pointer;
  text-decoration: none;
}

.primary-action {
  border: 0;
  color: #fff;
  background: linear-gradient(135deg, #0f766e, #115e59);
}

.primary-action:disabled {
  cursor: wait;
  opacity: 0.7;
}

.secondary-action {
  border: 1px solid rgba(15, 23, 42, 0.12);
  color: #0f172a;
  background: rgba(255, 255, 255, 0.9);
}

.secondary-action--compact {
  min-height: 2.95rem;
  padding-inline: 1rem;
}

.analytics-grid,
.charts-grid {
  display: grid;
  gap: 1rem;
  align-items: stretch;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.analytics-meta {
  margin: 0;
  color: #64748b;
  font-weight: 700;
}

.panel-empty {
  padding: 1rem 0;
  color: #64748b;
  font-weight: 700;
}

.panel-empty--error {
  color: #b91c1c;
}

.analytics-range-bar {
  display: flex;
  gap: 0.85rem;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.date-filter {
  display: grid;
  gap: 0.35rem;
  min-width: 180px;
  font-weight: 700;
  color: #475569;
}

.date-filter span,
.chart-filter span {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #0f766e;
}

.date-filter input {
  min-height: 2.95rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.96);
  color: #0f172a;
  padding: 0.75rem 0.9rem;
  font: inherit;
}

.analytics-studio {
  display: grid;
  gap: 1rem;
}

.analytics-grid,
.charts-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.chart-filter {
  display: inline-grid;
  gap: 0.35rem;
  font-weight: 700;
  color: #475569;
}

.chart-filter strong {
  color: #0f172a;
}

@media (max-width: 1100px) {
  .analytics-grid,
  .charts-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .hero,
  .analytics-grid,
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .panel-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero,
  .analytics-panel,
  .charts-panel {
    padding: 1.1rem;
  }
}
</style>
