<template>
  <div class="repeat-view">
    <section class="repeat-hero">
      <div>
        <p class="eyebrow">{{ scopeLabel }}</p>
        <h1>{{ pageTitle }}</h1>
        <p class="repeat-hero__copy">
          Group orders by repeated phone numbers or repeated delivery addresses so the team can spot repeat customers faster.
        </p>
      </div>

      <div class="repeat-hero__stats">
        <article>
          <span>Phone Groups</span>
          <strong>{{ response?.by_phone.length || 0 }}</strong>
        </article>
        <article>
          <span>Address Groups</span>
          <strong>{{ response?.by_address.length || 0 }}</strong>
        </article>
      </div>
    </section>

    <section class="repeat-toolbar">
      <div class="toggle-group">
        <button :class="['toggle-chip', { 'toggle-chip--active': activeGroup === 'phone' }]" @click="activeGroup = 'phone'">
          Same Phone
        </button>
        <button :class="['toggle-chip', { 'toggle-chip--active': activeGroup === 'address' }]" @click="activeGroup = 'address'">
          Same Address
        </button>
      </div>
      <button class="refresh-button" @click="loadData" :disabled="loading">
        {{ loading ? 'Refreshing...' : 'Refresh View' }}
      </button>
    </section>

    <section class="repeat-results">
      <article v-if="loading" class="empty-card">
        <strong>Loading grouped customers...</strong>
      </article>

      <article v-else-if="errorMessage" class="empty-card empty-card--error">
        <strong>{{ errorMessage }}</strong>
        <span>Try refreshing the view. If it keeps happening, the browser request is not completing cleanly.</span>
      </article>

      <article v-else-if="!activeGroups.length" class="empty-card">
        <strong>No repeated customers found.</strong>
        <span>Once the backend detects multiple matching {{ activeGroup === 'phone' ? 'phone numbers' : 'addresses' }}, they will show here.</span>
      </article>

      <article v-for="group in activeGroups" :key="`${activeGroup}-${group.group_key}`" class="customer-group">
        <div class="customer-group__header">
          <div>
            <p class="eyebrow">{{ activeGroup === 'phone' ? 'Repeated phone' : 'Repeated address' }}</p>
            <h2>{{ group.display_name }}</h2>
          </div>
          <span class="group-count">{{ group.order_count }} orders</span>
        </div>

        <div class="group-orders">
          <div v-for="order in group.orders" :key="order.amazon_order_id" class="group-order-row">
            <div class="group-order-row__meta">
              <strong>{{ order.amazon_order_id }}</strong>
              <span>{{ formatDate(order.confirmed_date) }}</span>
            </div>
            <div class="group-order-row__chips">
              <span class="info-chip">{{ order.order_status }}</span>
              <span class="info-chip">{{ order.customer || 'Unknown customer' }}</span>
              <span class="info-chip">{{ order.phone || 'No phone' }}</span>
              <span class="info-chip">{{ formatLocation(order.city, order.state) }}</span>
            </div>
            <p class="group-order-row__address">{{ order.address || 'No address available' }}</p>
            <p class="group-order-row__product">{{ order.product_summary || 'No product summary available' }}</p>
            <router-link :to="`/orders/${order.amazon_order_id}`" class="view-link">View Order</router-link>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ordersApi } from '@/api/orders'
import { useShippingDateFiltersStore } from '@/stores/shippingDateFilters'
import type { RepeatCustomerGroup, RepeatCustomerResponse } from '@/types'

const props = defineProps<{
  scope: 'orders' | 'returns'
}>()

const loading = ref(false)
const response = ref<RepeatCustomerResponse | null>(null)
const activeGroup = ref<'phone' | 'address'>('phone')
const errorMessage = ref('')
const LOAD_TIMEOUT_MS = 12000
let activeRequestId = 0
const shippingFilterStore = useShippingDateFiltersStore()

const scopeLabel = computed(() => props.scope === 'returns' ? 'Repeat returns view' : 'Repeat orders view')
const pageTitle = computed(() => props.scope === 'returns' ? 'Customers Returning More Than Once' : 'Customers Ordering More Than Once')

const activeGroups = computed<RepeatCustomerGroup[]>(() => {
  if (!response.value) return []
  return activeGroup.value === 'phone' ? response.value.by_phone : response.value.by_address
})

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
  let timeoutId: number | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error('Repeat customer request timed out.'))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) {
      window.clearTimeout(timeoutId)
    }
  }
}

const loadData = async () => {
  const requestId = ++activeRequestId
  loading.value = true
  errorMessage.value = ''

  try {
    await shippingFilterStore.ensureLoaded()
    const shippingRange = shippingFilterStore.getActiveRange() || {}
    const result = props.scope === 'returns'
      ? await withTimeout(ordersApi.getRepeatReturnCustomers(shippingRange), LOAD_TIMEOUT_MS)
      : await withTimeout(ordersApi.getRepeatOrderCustomers(shippingRange), LOAD_TIMEOUT_MS)

    if (requestId !== activeRequestId) return

    response.value = {
      scope: result.scope || props.scope,
      by_phone: Array.isArray(result.by_phone) ? result.by_phone : [],
      by_address: Array.isArray(result.by_address) ? result.by_address : [],
    }
  } catch (error: any) {
    if (requestId !== activeRequestId) return

    response.value = {
      scope: props.scope,
      by_phone: [],
      by_address: [],
    }
    errorMessage.value = error?.response?.data?.error || error?.message || 'Failed to load repeated customers.'
  } finally {
    if (requestId === activeRequestId) {
      loading.value = false
    }
  }
}

const formatDate = (value?: string | null) => {
  if (!value) return 'No confirmed date'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

const formatLocation = (city?: string, state?: string) => {
  return [city, state].filter(Boolean).join(' / ') || 'No location'
}

watch(
  () => [props.scope, shippingFilterStore.activeKey],
  () => {
    activeGroup.value = 'phone'
    loadData()
  },
  { immediate: true },
)
</script>

<style scoped>
.repeat-view {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  gap: 1.5rem;
}

.repeat-hero,
.repeat-toolbar,
.customer-group,
.empty-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 28px;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
}

.repeat-hero {
  padding: 1.8rem;
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
  gap: 1rem;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.15), transparent 36%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.92));
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
  font-size: clamp(2rem, 3vw, 2.9rem);
}

.repeat-hero__copy {
  margin: 0.9rem 0 0;
  color: #475569;
  max-width: 60ch;
}

.repeat-hero__stats {
  display: grid;
  gap: 0.9rem;
}

.repeat-hero__stats article {
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 22px;
  padding: 1rem 1.1rem;
}

.repeat-hero__stats span {
  display: block;
  color: #64748b;
  font-size: 0.82rem;
  margin-bottom: 0.35rem;
}

.repeat-hero__stats strong {
  font-size: 1.8rem;
  color: #0f172a;
}

.repeat-toolbar {
  padding: 1rem 1.2rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.toggle-group {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.toggle-chip,
.refresh-button,
.view-link {
  border: 0;
  cursor: pointer;
  font-weight: 800;
}

.toggle-chip {
  padding: 0.8rem 1rem;
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.9);
  color: #475569;
}

.toggle-chip--active {
  background: #0f766e;
  color: #fff;
}

.refresh-button,
.view-link {
  padding: 0.9rem 1.1rem;
  border-radius: 16px;
  background: #0f766e;
  color: #fff;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.repeat-results {
  display: grid;
  gap: 1rem;
}

.empty-card,
.customer-group {
  padding: 1.35rem;
}

.empty-card {
  display: grid;
  gap: 0.35rem;
  text-align: center;
  color: #475569;
}

.empty-card--error strong {
  color: #b91c1c;
}

.customer-group__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.group-count {
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.08);
  color: #0f766e;
  font-weight: 800;
}

.group-orders {
  display: grid;
  gap: 0.85rem;
}

.group-order-row {
  border: 1px solid rgba(191, 219, 254, 0.8);
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.95), rgba(248, 250, 252, 0.95));
  border-radius: 22px;
  padding: 1rem;
  display: grid;
  gap: 0.7rem;
}

.group-order-row__meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: #475569;
  flex-wrap: wrap;
}

.group-order-row__meta strong {
  color: #0f172a;
  font-size: 1.05rem;
}

.group-order-row__chips {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.info-chip {
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: #334155;
  font-weight: 700;
}

.group-order-row__address,
.group-order-row__product {
  margin: 0;
  color: #475569;
  line-height: 1.55;
}

@media (max-width: 860px) {
  .repeat-hero {
    grid-template-columns: 1fr;
  }
}
</style>
