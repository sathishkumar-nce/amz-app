<template>
  <div class="direct-orders-page">
    <section class="hero-card">
      <div class="hero-copy">
        <p class="hero-eyebrow">Direct order operations</p>
        <h1>Direct Orders</h1>
        <p class="hero-text">
          Capture, search, review, and forward manual orders from one clean workspace built for daily dispatch work.
        </p>
      </div>

      <div class="hero-actions">
        <router-link to="/direct-orders/new" class="btn btn-primary">Create Order</router-link>
        <router-link to="/direct-orders/cnc-ops" class="btn btn-secondary">Direct CNC Ops</router-link>
      </div>
    </section>

    <section class="filters-card">
      <div class="filters-head">
        <div>
          <h2>Export CSV</h2>
          <p>Choose the created-date range you want to export. The CSV will respect this range and any active filters below.</p>
        </div>
        <div class="filters-head__actions export-actions">
          <label class="field field--compact">
            <span>Created From</span>
            <input v-model="exportRange.date_from" type="date" />
          </label>
          <label class="field field--compact">
            <span>Created To</span>
            <input v-model="exportRange.date_to" type="date" />
          </label>
          <button @click="handleExport" :disabled="busy" class="btn btn-secondary">
            {{ exporting ? 'Exporting...' : 'Export CSV' }}
          </button>
        </div>
      </div>
    </section>

    <section class="stats-grid">
      <article class="stat-card">
        <span class="stat-label">Visible Orders</span>
        <strong class="stat-value">{{ store.pagination.total }}</strong>
        <span class="stat-meta">Across all pages</span>
      </article>
      <article class="stat-card">
        <span class="stat-label">Confirmed</span>
        <strong class="stat-value">{{ confirmedCount }}</strong>
        <span class="stat-meta">On this page</span>
      </article>
      <article class="stat-card">
        <span class="stat-label">Forwarded</span>
        <strong class="stat-value">{{ forwardedCount }}</strong>
        <span class="stat-meta">On this page</span>
      </article>
      <article class="stat-card stat-card--accent">
        <span class="stat-label">Selected</span>
        <strong class="stat-value">{{ selectedOrderIds.length }}</strong>
        <span class="stat-meta">Ready for bulk action</span>
      </article>
    </section>

    <DirectOrderFilterBar
      v-model="advancedFilters"
      :loading="busy"
      @apply="applyFilters"
      @clear="clearFilters"
    />

    <DirectOrderSearchBar
      v-model:searchKey="searchKey"
      v-model:searchValue="searchValue"
      :loading="busy"
      @search="applyFilters"
      @clear="clearSearch"
    />

    <section class="table-card">
      <div class="table-toolbar">
        <div class="table-toolbar__meta">
          <span class="toolbar-pill toolbar-pill--primary">{{ store.pagination.total }} orders</span>
          <span class="toolbar-pill">Page {{ store.pagination.page }} / {{ Math.max(store.pagination.totalPages, 1) }}</span>
          <span class="toolbar-pill">Selected {{ selectedOrderIds.length }}</span>
        </div>
        <div class="table-toolbar__actions">
          <button
            type="button"
            class="btn btn-secondary"
            :disabled="selectedOrderIds.length === 0 || busy"
            @click="handleBulkForward"
          >
            {{ bulkForwarding ? `Creating ${selectedOrderIds.length} Forward Orders...` : 'Create Forward Orders' }}
          </button>
        </div>
      </div>

      <div v-if="store.loading" class="empty-state">
        <p>Loading direct orders...</p>
      </div>

      <div v-else-if="store.orders.length === 0" class="empty-state">
        <p>No direct orders matched the current search.</p>
        <router-link to="/direct-orders/new" class="btn btn-primary">Create Order</router-link>
      </div>

      <template v-else>
        <div class="table-wrap">
          <table class="orders-table">
            <thead>
              <tr>
                <th class="check-col">
                  <input
                    :checked="allVisibleSelected"
                    type="checkbox"
                    aria-label="Select all orders on this page"
                    @change="handleSelectAllChange"
                  />
                </th>
                <th>Order</th>
                <th>Customer</th>
                <th>Location</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Courier and AWB</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="order in store.orders" :key="order.id">
                <tr :class="rowHighlightClass(order.order_status)">
                  <td class="check-col">
                    <input
                      :checked="selectedOrderIds.includes(order.order_id)"
                      type="checkbox"
                      :aria-label="`Select ${order.order_id}`"
                      @change="handleRowSelectionChange(order.order_id, $event)"
                    />
                  </td>
                  <td>
                    <div class="cell-title">{{ order.order_id }}</div>
                    <div class="cell-subtitle">{{ formatDate(order.created_at) }}</div>
                  </td>
                  <td>
                    <div class="cell-title">{{ order.customer_name || 'Customer pending' }}</div>
                    <div class="cell-subtitle">{{ order.mobile || 'Mobile not set' }}</div>
                  </td>
                  <td>
                    <div class="cell-title">{{ order.pincode || 'Pincode pending' }}</div>
                    <div class="cell-subtitle">{{ compactLocation(order.city, order.state) }}</div>
                  </td>
                  <td>
                    <div class="cell-title">{{ formatCurrency(order.amount) }}</div>
                    <div class="cell-subtitle">{{ order.payment_status || 'pending' }}</div>
                  </td>
                  <td>
                    <div class="status-stack">
                      <span :class="['status-pill', statusClass(order.order_status)]">{{ order.order_status }}</span>
                      <span :class="['priority-pill', priorityClass(order.priority)]">{{ order.priority.toUpperCase() }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="courier-card">
                      <div class="courier-inline">
                        <div class="courier-inline__type">
                          <div class="cell-title">{{ order.courier_type || 'manual' }}</div>
                          <div class="cell-subtitle">{{ order.courier_status || 'Not forwarded yet' }}</div>
                        </div>
                        <span class="courier-label">AWB</span>
                        <div class="awb-editor">
                          <input
                            v-model.trim="awbEdits[order.order_id]"
                            type="text"
                            placeholder="Add or update AWB"
                          />
                          <button
                            type="button"
                            class="btn btn-ghost btn-ghost--small"
                            :disabled="busy || awbSavingOrderId === order.order_id"
                            @click="handleAwbSave(order.order_id)"
                          >
                            {{ awbSavingOrderId === order.order_id ? 'Saving...' : 'Save AWB' }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div class="row-actions">
                      <router-link :to="`/direct-orders/${order.order_id}`" class="action-link action-link--button">View</router-link>
                      <router-link :to="`/direct-orders/${order.order_id}/edit`" class="action-link action-link--button action-link--secondary">Edit</router-link>
                      <button
                        type="button"
                        class="action-link action-link--button action-link--accent"
                        :disabled="busy || forwardingOrderId === order.order_id"
                        @click="handleDelhivery(order.order_id)"
                      >
                        {{ forwardingOrderId === order.order_id ? 'Creating...' : 'Create Forward' }}
                      </button>
                      <button type="button" class="action-link action-link--button action-link--danger" :disabled="busy" @click="handleDelete(order.order_id)">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                <tr :class="['item-summary-row', rowHighlightClass(order.order_status)]">
                  <td class="check-col"></td>
                  <td colspan="7" class="item-summary-cell">
                    <div class="item-strip__header">
                      <span class="item-strip__title">Items</span>
                    </div>
                    <div class="item-summary-wrap" v-if="order.items.length > 0">
                      <article
                        v-for="(item, index) in order.items"
                        :key="`${order.order_id}-item-${index}`"
                        class="item-summary-card"
                      >
                        <span class="item-summary-index">#{{ index + 1 }}</span>
                        <strong class="item-summary-name">{{ shortenItemName(item.item) }}</strong>
                        <span class="item-summary-inline"><strong>Thickness:</strong> {{ item.thickness || 'NA' }}</span>
                        <span class="item-summary-inline"><strong>Qty:</strong> {{ item.quantity || 1 }}</span>
                        <span class="item-summary-inline"><strong>Customer Width (in):</strong> {{ item.customer_width_in_inches ?? 'NA' }}</span>
                        <span class="item-summary-inline"><strong>Customer Length (in):</strong> {{ item.customer_length_in_inches ?? 'NA' }}</span>
                        <span class="item-summary-inline item-summary-inline--notes"><strong>Corner Radius and Notes:</strong> {{ item.corner_radius_and_notes || 'NA' }}</span>
                      </article>
                    </div>
                    <div v-else class="item-summary-empty">No items added yet.</div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <PaginationControls
          :page="store.pagination.page"
          :total-pages="store.pagination.totalPages"
          :total="store.pagination.total"
          :limit="store.pagination.limit"
          item-label="orders"
          @change="changePage"
          @limit-change="changeLimit"
        />
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import DirectOrderFilterBar from '@/components/DirectOrderFilterBar.vue'
import DirectOrderSearchBar from '@/components/DirectOrderSearchBar.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { useDirectOrdersStore } from '@/stores/directOrders'
import type { DirectOrderFilters } from '@/types'
import { buildDirectOrderAdvancedRequest, createDirectOrderAdvancedFilters } from '@/utils/directOrderListFilters'

const store = useDirectOrdersStore()

const exporting = ref(false)
const bulkForwarding = ref(false)
const forwardingOrderId = ref<string | null>(null)
const awbSavingOrderId = ref<string | null>(null)
const selectedOrderIds = ref<string[]>([])
const awbEdits = ref<Record<string, string>>({})
const exportRange = ref({
  date_from: '',
  date_to: '',
})
const advancedFilters = ref(createDirectOrderAdvancedFilters())
const searchKey = ref('order_id')
const searchValue = ref('')

const filters = ref<DirectOrderFilters>({
  page: 1,
  limit: 20,
})

const sourceOptions = ['website', 'phone', 'whatsapp', 'email', 'meta', 'other']
const orderStatusOptions = ['confirmed', 'manufactured', 'on-hold', 'forwarded', 'cancelled', 'returned', 'other-issues']
const paymentStatusOptions = ['pending', 'paid-full', 'paid-advance', 'refunded']
const priorityOptions = ['p1', 'p2', 'p3', 'p4']

const busy = computed(() => store.loading || exporting.value || bulkForwarding.value)
const confirmedCount = computed(() => store.orders.filter((order) => order.order_status === 'confirmed').length)
const forwardedCount = computed(() => store.orders.filter((order) => order.order_status === 'forwarded').length)
const allVisibleSelected = computed(() => store.orders.length > 0 && store.orders.every((order) => selectedOrderIds.value.includes(order.order_id)))

watch(
  () => store.orders,
  (orders) => {
    const next: Record<string, string> = {}
    for (const order of orders) {
      next[order.order_id] = order.awb || ''
    }
    awbEdits.value = next
  },
  { immediate: true, deep: true },
)

const formatDate = (value?: string | null) => {
  if (!value) return 'Date pending'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatCurrency = (value?: number | null) => {
  const safeValue = typeof value === 'number' ? value : 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(safeValue)
}

const compactLocation = (city?: string | null, state?: string | null) => {
  const parts = [city, state].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : 'Location pending'
}

const formatSize = (width?: number | null, length?: number | null) => {
  if (width == null && length == null) return 'NA'
  return `${width ?? '-'} x ${length ?? '-'}`
}

const shortenItemName = (value?: string | null) => {
  const text = (value || '').trim()
  if (!text) return 'Unnamed item'
  return text.length > 30 ? `${text.slice(0, 30)}...` : text
}

const statusClass = (status: string) => {
  const classes: Record<string, string> = {
    confirmed: 'status-pill--confirmed',
    manufactured: 'status-pill--packed',
    'on-hold': 'status-pill--on-hold',
    forwarded: 'status-pill--forwarded',
    cancelled: 'status-pill--cancelled',
    returned: 'status-pill--returned',
    'other-issues': 'status-pill--other-issues',
  }
  return classes[status] || 'status-pill--other-issues'
}

const rowHighlightClass = (status: string) => {
  const classes: Record<string, string> = {
    confirmed: 'row-highlight--confirmed',
    forwarded: 'row-highlight--forwarded',
    manufactured: 'row-highlight--manufactured',
    cancelled: 'row-highlight--cancelled',
    'other-issues': 'row-highlight--other-issues',
    returned: 'row-highlight--returned',
    'on-hold': 'row-highlight--on-hold',
  }
  return classes[status] || ''
}

const priorityClass = (priority: string) => {
  const classes: Record<string, string> = {
    p1: 'priority-pill--p1',
    p2: 'priority-pill--p2',
    p3: 'priority-pill--p3',
    p4: 'priority-pill--p4',
  }
  return classes[String(priority || '').toLowerCase()] || 'priority-pill--p4'
}

const loadOrders = async () => {
  await store.fetchOrders({
    ...filters.value,
    ...buildDirectOrderAdvancedRequest(advancedFilters.value),
    ...buildSearchFilters(),
    page: filters.value.page || 1,
    limit: filters.value.limit || 20,
  })
}

const buildSearchFilters = (): Partial<DirectOrderFilters> => {
  const value = searchValue.value.trim()
  if (!value) return {}

  if (searchKey.value === 'order_id') return { order_id: value }
  if (searchKey.value === 'customer_name') return { customer_name: value }
  if (searchKey.value === 'mobile') return { mobile: value }
  if (searchKey.value === 'pincode') return { pincode: value }
  if (searchKey.value === 'awb') return { awb: value }
  if (searchKey.value === 'item') return { item: value }
  if (searchKey.value === 'order_status') return { order_status: value }
  if (searchKey.value === 'payment_status') return { payment_status: value }
  if (searchKey.value === 'priority') return { priority: value }
  if (searchKey.value === 'source') return { source: value }
  return { search: value }
}

const applyFilters = async () => {
  filters.value.page = 1
  await loadOrders()
}

const clearFilters = async () => {
  advancedFilters.value = createDirectOrderAdvancedFilters()
  filters.value.page = 1
  await loadOrders()
}

const clearSearch = async () => {
  searchKey.value = 'order_id'
  searchValue.value = ''
  filters.value.page = 1
  await loadOrders()
}

const resetFilters = async () => {
  filters.value = {
    page: 1,
    limit: 20,
  }
  advancedFilters.value = createDirectOrderAdvancedFilters()
  searchKey.value = 'order_id'
  searchValue.value = ''
  await loadOrders()
}

const changePage = async (page: number) => {
  if (page === store.pagination.page) return
  filters.value.page = page
  await loadOrders()
}

const changeLimit = async (limit: number) => {
  if (limit === filters.value.limit) return
  filters.value.limit = limit
  filters.value.page = 1
  await loadOrders()
}

const toggleSelection = (orderId: string, checked: boolean) => {
  if (checked) {
    if (!selectedOrderIds.value.includes(orderId)) {
      selectedOrderIds.value = [...selectedOrderIds.value, orderId]
    }
    return
  }
  selectedOrderIds.value = selectedOrderIds.value.filter((value) => value !== orderId)
}

const toggleSelectAll = (checked: boolean) => {
  const visibleIds = store.orders.map((order) => order.order_id)
  if (checked) {
    selectedOrderIds.value = Array.from(new Set([...selectedOrderIds.value, ...visibleIds]))
    return
  }
  selectedOrderIds.value = selectedOrderIds.value.filter((orderId) => !visibleIds.includes(orderId))
}

const handleSelectAllChange = (event: Event) => {
  toggleSelectAll((event.target as HTMLInputElement).checked)
}

const handleRowSelectionChange = (orderId: string, event: Event) => {
  toggleSelection(orderId, (event.target as HTMLInputElement).checked)
}

const handleExport = async () => {
  exporting.value = true
  try {
    await store.exportCSV({
      ...filters.value,
      date_from: exportRange.value.date_from || filters.value.date_from,
      date_to: exportRange.value.date_to || filters.value.date_to,
    })
  } catch (error: any) {
    alert(error.response?.data?.error || 'Failed to export direct orders')
  } finally {
    exporting.value = false
  }
}

const handleDelete = async (orderId: string) => {
  if (!confirm(`Delete ${orderId}?`)) return
  try {
    await store.deleteOrder(orderId)
    selectedOrderIds.value = selectedOrderIds.value.filter((value) => value !== orderId)
    await loadOrders()
  } catch (error: any) {
    alert(error.response?.data?.error || 'Failed to delete order')
  }
}

const handleAwbSave = async (orderId: string) => {
  awbSavingOrderId.value = orderId
  try {
    await store.updateOrder(orderId, {
      awb: awbEdits.value[orderId] || undefined,
    })
  } catch (error: any) {
    alert(error.response?.data?.error || 'Failed to update AWB')
  } finally {
    awbSavingOrderId.value = null
  }
}

const handleDelhivery = async (orderId: string) => {
  if (!confirm(`Create Delhivery forward order for ${orderId}?`)) {
    return
  }

  forwardingOrderId.value = orderId
  try {
    const response = await store.createDelhiveryForwardOrder(orderId)
    alert(response.message)
  } catch (error: any) {
    alert(error.response?.data?.error || 'Failed to create Delhivery forward order')
  } finally {
    forwardingOrderId.value = null
  }
}

const handleBulkForward = async () => {
  if (selectedOrderIds.value.length === 0) return
  bulkForwarding.value = true
  try {
    const response = await store.createBulkDelhiveryForwardOrders(selectedOrderIds.value)
    const failureSummary = response.failures.slice(0, 3).map((item) => `${item.order_id}: ${item.error}`).join('\n')
    const message = [
      `${response.success_count} order(s) forwarded successfully.`,
      response.failure_count > 0 ? `${response.failure_count} failed.` : '',
      failureSummary,
    ].filter(Boolean).join('\n')
    alert(message)
    if (response.success_count > 0) {
      const successIds = new Set(response.successes.map((item) => item.order_id))
      selectedOrderIds.value = selectedOrderIds.value.filter((orderId) => !successIds.has(orderId))
    }
    await loadOrders()
  } catch (error: any) {
    alert(error.response?.data?.error || 'Failed to create bulk Delhivery forward orders')
  } finally {
    bulkForwarding.value = false
  }
}

onMounted(async () => {
  await loadOrders()
})
</script>

<style scoped>
.direct-orders-page {
  max-width: 1560px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.hero-card,
.filters-card,
.table-card,
.stat-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(15, 23, 42, 0.08);
  box-shadow: 0 22px 44px rgba(15, 23, 42, 0.08);
}

.hero-card,
.filters-card,
.table-card {
  border-radius: 24px;
}

.hero-card {
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  background:
    radial-gradient(circle at top right, rgba(16, 185, 129, 0.14), transparent 32%),
    radial-gradient(circle at left bottom, rgba(14, 165, 233, 0.14), transparent 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.99), rgba(248, 250, 252, 0.96));
}

.hero-eyebrow {
  margin: 0 0 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
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
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1;
  font-weight: 900;
}

h2 {
  font-size: 1.05rem;
  font-weight: 800;
}

.hero-text,
.filters-head p {
  margin: 0.8rem 0 0;
  color: #475569;
  max-width: 62ch;
}

.hero-actions,
.filters-head__actions,
.table-toolbar__actions,
.row-actions,
.awb-editor,
.status-stack {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.btn {
  min-height: 2.85rem;
  padding: 0 1rem;
  border-radius: 14px;
  border: 0;
  font: inherit;
  font-weight: 800;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #0f766e, #115e59);
  color: #ffffff;
}

.btn-secondary,
.btn-ghost,
.toolbar-pill,
.stat-card {
  background: rgba(255, 255, 255, 0.96);
  color: #0f172a;
}

.btn-secondary,
.btn-ghost {
  border: 1px solid rgba(148, 163, 184, 0.26);
}

.btn-ghost {
  background: #f8fafc;
}

.btn-ghost--small {
  min-height: 2.3rem;
  padding: 0 0.85rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.stat-card {
  border-radius: 20px;
  padding: 1.1rem 1.15rem;
  display: grid;
  gap: 0.35rem;
}

.stat-card--accent {
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.08), rgba(14, 165, 233, 0.08));
}

.stat-label,
.stat-meta,
.cell-subtitle {
  color: #64748b;
}

.stat-label {
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.stat-value {
  font-size: 1.9rem;
  font-weight: 900;
  color: #0f172a;
}

.stat-meta {
  font-size: 0.92rem;
}

.filters-card,
.table-card {
  padding: 1.15rem;
}

.filters-head,
.table-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.search-row,
.filters-grid {
  margin-top: 1rem;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 0.8rem;
}

.field {
  display: grid;
  gap: 0.42rem;
}

.field--search {
  width: 100%;
}

.field span {
  font-size: 0.78rem;
  font-weight: 800;
  color: #334155;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.field input,
.field select,
.awb-editor input {
  min-height: 2.8rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: #ffffff;
  color: #0f172a;
  padding: 0 0.85rem;
  font: inherit;
}

.field--search input {
  min-height: 3rem;
}

.field--compact {
  min-width: 100px;
}

.export-actions {
  align-items: end;
}

.table-toolbar {
  margin-bottom: 0.9rem;
}

.table-toolbar__meta {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.toolbar-pill {
  min-height: 2rem;
  padding: 0.28rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #334155;
  font-size: 0.82rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

.toolbar-pill--primary {
  background: rgba(15, 118, 110, 0.1);
  border-color: rgba(15, 118, 110, 0.18);
  color: #0f766e;
}

.table-wrap {
  overflow: auto;
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.96);
}

.orders-table {
  width: 100%;
  min-width: 1220px;
  border-collapse: collapse;
  background: #ffffff;
}

.orders-table th {
  background: #f8fafc;
  color: #475569;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-align: left;
  padding: 0.95rem 0.9rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.95);
}

.orders-table td {
  padding: 0.85rem 0.85rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  vertical-align: top;
  color: #0f172a;
}

.orders-table tbody tr:hover {
  background: rgba(248, 250, 252, 0.92);
}

.item-summary-row:hover {
  background: transparent;
}

.orders-table tbody tr.row-highlight--confirmed {
  background: rgba(254, 249, 195, 0.5);
}

.orders-table tbody tr.row-highlight--forwarded {
  background: rgba(219, 234, 254, 0.52);
}

.orders-table tbody tr.row-highlight--manufactured {
  background: rgba(220, 252, 231, 0.5);
}

.orders-table tbody tr.row-highlight--cancelled {
  background: rgba(254, 226, 226, 0.52);
}

.orders-table tbody tr.row-highlight--other-issues {
  background: rgba(252, 231, 243, 0.56);
}

.orders-table tbody tr.row-highlight--returned {
  background: rgba(255, 237, 213, 0.58);
}

.orders-table tbody tr.row-highlight--on-hold {
  background: rgba(241, 245, 249, 0.88);
}

.orders-table tbody tr.row-highlight--confirmed:hover {
  background: rgba(254, 240, 138, 0.58);
}

.orders-table tbody tr.row-highlight--forwarded:hover {
  background: rgba(191, 219, 254, 0.58);
}

.orders-table tbody tr.row-highlight--manufactured:hover {
  background: rgba(187, 247, 208, 0.58);
}

.orders-table tbody tr.row-highlight--cancelled:hover {
  background: rgba(254, 202, 202, 0.6);
}

.orders-table tbody tr.row-highlight--other-issues:hover {
  background: rgba(251, 207, 232, 0.62);
}

.orders-table tbody tr.row-highlight--returned:hover {
  background: rgba(254, 215, 170, 0.62);
}

.orders-table tbody tr.row-highlight--on-hold:hover {
  background: rgba(226, 232, 240, 0.92);
}

.check-col {
  width: 52px;
}

.cell-title {
  font-weight: 800;
  color: #0f172a;
}

.cell-subtitle {
  margin-top: 0.28rem;
  font-size: 0.88rem;
}

.status-pill,
.priority-pill {
  border-radius: 999px;
  padding: 0.4rem 0.78rem;
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: capitalize;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.status-pill--confirmed {
  background: #fef3c7;
  color: #b45309;
}

.status-pill--forwarded {
  background: #dcfce7;
  color: #166534;
}

.status-pill--packed {
  background: #dbeafe;
  color: #1d4ed8;
}

.status-pill--on-hold {
  background: #f3e8ff;
  color: #7c3aed;
}

.status-pill--cancelled {
  background: #fee2e2;
  color: #b91c1c;
}

.status-pill--returned {
  background: #0f172a;
  color: #f8fafc;
}

.status-pill--other-issues {
  background: #ffedd5;
  color: #c2410c;
}

.priority-pill--p1 {
  background: #fee2e2;
  color: #b91c1c;
}

.priority-pill--p2 {
  background: #fef3c7;
  color: #b45309;
}

.priority-pill--p3 {
  background: #e0f2fe;
  color: #0369a1;
}

.priority-pill--p4 {
  background: #e2e8f0;
  color: #334155;
}

.awb-editor {
  align-items: center;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.6rem;
  flex: 1 1 300px;
}

.awb-editor input {
  min-width: 0;
}

.courier-card {
  min-width: 260px;
  display: block;
  padding: 0;
  border-radius: 0;
  background: transparent;
  border: 0;
}

.courier-inline {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.courier-inline__type {
  min-width: 120px;
}

.courier-inline__type .cell-subtitle {
  margin-top: 0.15rem;
}

.courier-label {
  display: inline-flex;
  align-items: center;
  min-height: 1.75rem;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.22);
  color: #64748b;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.item-summary-cell {
  padding-top: 0.05rem !important;
  padding-bottom: 0.7rem !important;
  background:
    linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.98));
}

.item-summary-row.row-highlight--confirmed .item-summary-cell {
  background: linear-gradient(180deg, rgba(254, 249, 195, 0.42), rgba(255, 255, 255, 0.92));
}

.item-summary-row.row-highlight--forwarded .item-summary-cell {
  background: linear-gradient(180deg, rgba(219, 234, 254, 0.44), rgba(255, 255, 255, 0.92));
}

.item-summary-row.row-highlight--manufactured .item-summary-cell {
  background: linear-gradient(180deg, rgba(220, 252, 231, 0.42), rgba(255, 255, 255, 0.92));
}

.item-summary-row.row-highlight--cancelled .item-summary-cell {
  background: linear-gradient(180deg, rgba(254, 226, 226, 0.44), rgba(255, 255, 255, 0.92));
}

.item-summary-row.row-highlight--other-issues .item-summary-cell {
  background: linear-gradient(180deg, rgba(252, 231, 243, 0.46), rgba(255, 255, 255, 0.92));
}

.item-summary-row.row-highlight--returned .item-summary-cell {
  background: linear-gradient(180deg, rgba(255, 237, 213, 0.48), rgba(255, 255, 255, 0.92));
}

.item-summary-row.row-highlight--on-hold .item-summary-cell {
  background: linear-gradient(180deg, rgba(241, 245, 249, 0.82), rgba(255, 255, 255, 0.94));
}

.item-strip__header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.45rem;
}

.item-strip__title {
  color: #0f172a;
  font-size: 0.9rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.item-strip__count {
  display: inline-flex;
  align-items: center;
  min-height: 1.9rem;
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.08);
  color: #0f766e;
  font-size: 0.8rem;
  font-weight: 800;
}

.item-summary-wrap {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.55rem;
}

.item-summary-card {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.55rem 0.85rem;
  padding: 0.7rem 0.8rem;
  border-radius: 18px;
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.08), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
  border: 1px solid rgba(203, 213, 225, 0.95);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.item-summary-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  min-height: 2rem;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.12);
  color: #0f766e;
  font-size: 0.78rem;
  font-weight: 900;
}

.item-summary-name {
  color: #0f172a;
  font-weight: 800;
  font-size: 0.98rem;
  line-height: 1.25;
  margin-right: 0.1rem;
}

.item-summary-inline {
  color: #475569;
  font-size: 0.9rem;
  line-height: 1.35;
}

.item-summary-inline strong {
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 0.2rem;
}

.item-summary-inline--notes {
  flex: 1 1 260px;
  min-width: 220px;
}

.item-summary-empty {
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 700;
  padding: 0.15rem 0 0.05rem;
}

.row-actions {
  align-items: center;
}

.action-link {
  color: #0f766e;
  background: transparent;
  border: 0;
  padding: 0;
  font: inherit;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}

.action-link--button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.35rem;
  padding: 0 0.85rem;
  border-radius: 12px;
  border: 1px solid rgba(15, 118, 110, 0.16);
  background: rgba(15, 118, 110, 0.08);
}

.action-link--secondary {
  color: #1d4ed8;
  border-color: rgba(29, 78, 216, 0.16);
  background: rgba(219, 234, 254, 0.75);
}

.action-link--accent {
  color: #0f766e;
  border-color: rgba(15, 118, 110, 0.18);
  background: rgba(220, 252, 231, 0.85);
}

.action-link--danger {
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.16);
  background: rgba(254, 226, 226, 0.82);
}

.action-link--button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-state {
  min-height: 280px;
  display: grid;
  place-items: center;
  gap: 1rem;
  color: #64748b;
  text-align: center;
}

@media (max-width: 1180px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filters-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .hero-card,
  .filters-head,
  .table-toolbar {
    flex-direction: column;
  }

  .hero-actions,
  .filters-head__actions,
  .table-toolbar__actions {
    width: 100%;
  }

  .hero-actions .btn,
  .filters-head__actions .btn,
  .table-toolbar__actions .btn {
    width: 100%;
  }

  .stats-grid,
  .filters-grid {
    grid-template-columns: 1fr;
  }
}
</style>
