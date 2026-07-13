<template>
  <div class="review-page">
    <section class="review-hero">
      <div>
        <p class="eyebrow">Review follow-up</p>
        <h1>Review Request Queue</h1>
      </div>
      <div class="review-actions">
        <router-link to="/review-followup-settings" class="secondary-button">Settings</router-link>
        <button type="button" class="primary-button" :disabled="store.loading" @click="loadQueue">
          {{ store.loading ? 'Refreshing...' : 'Refresh' }}
        </button>
      </div>
    </section>

    <section class="filter-panel">
      <div class="state-filter">
        <span>State</span>
        <div class="state-dropdown">
          <button type="button" class="state-dropdown__button" @click="stateDropdownOpen = !stateDropdownOpen">
            <span>{{ selectedStateSummary }}</span>
            <span class="state-dropdown__chevron">⌄</span>
          </button>
          <div v-if="stateDropdownOpen" class="state-dropdown__menu">
            <button type="button" class="state-dropdown__clear" @click="clearStateSelection">
              All states
            </button>
            <label v-for="item in store.settings" :key="item.state_code" class="state-option">
              <input
                type="checkbox"
                :checked="isStateSelected(item.state_code)"
                @change="toggleState(item.state_code)"
              />
              <span class="state-option__name">{{ item.state_name }}</span>
            </label>
          </div>
        </div>
      </div>

      <label>
        <span>Status</span>
        <select v-model="filters.status">
          <option value="">All statuses</option>
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label>
        <span>Quantity</span>
        <div class="split-control">
          <select v-model="filters.quantity_operator">
            <option value="gt">&gt;</option>
            <option value="gte">&gt;=</option>
            <option value="lt">&lt;</option>
            <option value="lte">&lt;=</option>
            <option value="eq">=</option>
          </select>
          <input v-model="filters.quantity" type="number" step="1" placeholder="Qty" />
        </div>
      </label>

      <label>
        <span>Confidence</span>
        <div class="split-control">
          <select v-model="filters.confidence_operator">
            <option value="gt">&gt;</option>
            <option value="gte">&gt;=</option>
            <option value="lt">&lt;</option>
            <option value="lte">&lt;=</option>
            <option value="eq">=</option>
          </select>
          <input v-model="filters.confidence" type="number" min="0" max="100" step="1" placeholder="Score" />
        </div>
      </label>

      <label>
        <span>Thickness</span>
        <input v-model="filters.thickness" type="text" placeholder="e.g. 2mm" />
      </label>

      <label>
        <span>Search</span>
        <div class="search-control">
          <select v-model="filters.search_key">
            <option value="all">All</option>
            <option value="order_id">Order ID</option>
            <option value="phone">Phone</option>
            <option value="customer">Customer</option>
          </select>
          <input v-model="filters.search_value" type="search" placeholder="Search value" />
        </div>
      </label>

      <label class="toggle-row">
        <input v-model="filters.is_round" type="checkbox" />
        <span>Round only</span>
      </label>

      <label class="toggle-row">
        <input v-model="filters.special" type="checkbox" />
        <span>Special only</span>
      </label>

      <div class="filter-actions">
        <button type="button" class="secondary-button" :disabled="store.loading" @click="clearFilters">Clear</button>
        <button type="button" class="primary-button" :disabled="store.loading" @click="loadQueue">Apply</button>
      </div>
    </section>

    <section class="bulk-panel">
      <label class="select-visible">
        <input type="checkbox" :checked="allVisibleSelected" @change="toggleVisibleSelection" />
        <span>Select visible</span>
      </label>
      <span class="selected-count">{{ selectedOrderIds.length }} selected</span>
      <select v-model="bulkStatus" class="bulk-status-select">
        <option v-for="option in statusOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <button
        type="button"
        class="primary-button"
        :disabled="statusSaving || selectedOrderIds.length === 0"
        @click="applyBulkStatus"
      >
        {{ statusSaving ? 'Updating...' : 'Update Status' }}
      </button>
    </section>

    <section class="review-shell">
      <div v-if="store.loading" class="empty-state">Loading review queue...</div>
      <div v-else-if="groupedSections.length === 0" class="empty-state">No eligible review follow-ups found.</div>

      <div v-else class="group-list">
        <section v-for="section in groupedSections" :key="section.key" class="review-group">
          <header class="group-header">
            <div>
              <h2>{{ section.dateLabel }}</h2>
              <p>{{ section.stateName }} · {{ section.items.length }} orders</p>
            </div>
            <span class="state-pill">{{ section.stateCode }}</span>
          </header>

          <div class="table-wrap">
            <table class="review-table">
              <thead>
                <tr>
                  <th class="select-cell">Select</th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Ordered</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Thickness</th>
                  <th>Flags</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in section.items" :key="item.amazon_order_id">
                  <td class="select-cell">
                    <input v-model="selectedOrderIds" type="checkbox" :value="item.amazon_order_id" />
                  </td>
                  <td>
                    <router-link :to="`/orders/${item.amazon_order_id}`" class="order-link">
                      {{ item.amazon_order_id }}
                    </router-link>
                  </td>
                  <td>{{ item.customer_name }}</td>
                  <td>{{ item.phone || 'Not available' }}</td>
                  <td>{{ formatDate(item.ordered_at) }}</td>
                  <td class="product-cell">{{ item.product_name }}</td>
                  <td>{{ item.quantity_summary }}</td>
                  <td>{{ item.thickness_summary }}</td>
                  <td>
                    <div class="flag-list">
                      <span v-if="item.has_round" class="flag-pill">Round</span>
                      <span v-if="item.has_special" class="flag-pill flag-pill--special">Special</span>
                      <span v-if="!item.has_round && !item.has_special" class="muted-text">None</span>
                    </div>
                  </td>
                  <td>
                    <select
                      :value="item.review_request_status"
                      :class="['status-select', statusClass(item.review_request_status)]"
                      :disabled="Boolean(savingStatusIds[item.amazon_order_id])"
                      @change="handleInlineStatusChange(item, $event)"
                    >
                      <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                        {{ option.label }}
                      </option>
                    </select>
                  </td>
                  <td>
                    <div class="confidence-meter">
                      <span>{{ item.review_confidence }}</span>
                      <div class="confidence-track">
                        <div class="confidence-fill" :style="{ width: `${item.review_confidence}%` }" />
                      </div>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="whatsapp-button"
                      :disabled="!canOpenWhatsApp(item.phone)"
                      @click="openReviewWhatsApp(item)"
                    >
                      WhatsApp
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useReviewFollowupsStore } from '@/stores/reviewFollowups'
import type { ReviewQueueFilters, ReviewQueueItem, ReviewRequestStatus } from '@/types'
import { formatStandardDate } from '@/utils/orderData'

type ReviewGroup = {
  key: string
  dateLabel: string
  stateCode: string
  stateName: string
  items: ReviewQueueItem[]
}

type ReviewFilterForm = {
  states: string[]
  status: '' | ReviewRequestStatus
  quantity_operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  quantity: string
  confidence_operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  confidence: string
  thickness: string
  search_key: 'all' | 'order_id' | 'phone' | 'customer'
  search_value: string
  is_round: boolean
  special: boolean
}

const store = useReviewFollowupsStore()
const defaultFilters = (): ReviewFilterForm => ({
  states: [],
  status: '',
  quantity_operator: 'gte',
  quantity: '',
  confidence_operator: 'gte',
  confidence: '',
  thickness: '',
  search_key: 'all',
  search_value: '',
  is_round: false,
  special: false,
})
const filters = reactive<ReviewFilterForm>(defaultFilters())
const selectedOrderIds = ref<string[]>([])
const bulkStatus = ref<ReviewRequestStatus>('requested')
const statusSaving = ref(false)
const stateDropdownOpen = ref(false)
const savingStatusIds = reactive<Record<string, boolean>>({})
const statusOptions: Array<{ value: ReviewRequestStatus; label: string }> = [
  { value: 'not-requested', label: 'Not Requested' },
  { value: 'requested', label: 'Requested' },
  { value: 'received-review', label: 'Received Review' },
]

const normalizeIndianPhone = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.slice(-10)
}

const canOpenWhatsApp = (value?: string | null) => normalizeIndianPhone(value) !== null

const formatDate = (value: string) => formatStandardDate(value)

const groupDateKey = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unknown'
  return date.toISOString().slice(0, 10)
}

const groupDateLabel = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

const groupedSections = computed<ReviewGroup[]>(() => {
  const groups = new Map<string, ReviewGroup>()

  for (const item of store.queue) {
    const dateKey = groupDateKey(item.ordered_at)
    const key = `${dateKey}:${item.state_code}`
    const existing = groups.get(key)
    if (existing) {
      existing.items.push(item)
      continue
    }

    groups.set(key, {
      key,
      dateLabel: groupDateLabel(item.ordered_at),
      stateCode: item.state_code,
      stateName: item.state_name,
      items: [item],
    })
  }

  return Array.from(groups.values()).map((group) => ({
    ...group,
    items: [...group.items].sort((left, right) => right.review_confidence - left.review_confidence),
  }))
})

const allVisibleOrderIds = computed(() => store.queue.map((item) => item.amazon_order_id))
const allVisibleSelected = computed(() =>
  allVisibleOrderIds.value.length > 0 &&
  allVisibleOrderIds.value.every((amazonOrderId) => selectedOrderIds.value.includes(amazonOrderId)),
)
const selectedStateSummary = computed(() => {
  if (filters.states.length === 0) return 'All states'
  if (filters.states.length === 1) {
    return store.settings.find((item) => item.state_code === filters.states[0])?.state_name || filters.states[0]
  }
  return `${filters.states.length} states selected`
})

const isStateSelected = (stateCode: string) => filters.states.includes(stateCode)

const toggleState = (stateCode: string) => {
  if (isStateSelected(stateCode)) {
    filters.states = filters.states.filter((item) => item !== stateCode)
    return
  }
  filters.states = [...filters.states, stateCode]
}

const clearStateSelection = () => {
  filters.states = []
  stateDropdownOpen.value = false
}

const buildQueueFilters = (): ReviewQueueFilters => {
  const request: ReviewQueueFilters = {
    quantity_operator: filters.quantity_operator,
    confidence_operator: filters.confidence_operator,
  }

  if (filters.states.length) request.state = filters.states.join(',')
  if (filters.status) request.status = filters.status
  if (filters.quantity !== '') request.quantity = filters.quantity
  if (filters.confidence !== '') request.confidence = filters.confidence
  if (filters.thickness.trim()) request.thickness = filters.thickness.trim()
  if (filters.search_value.trim()) {
    request.search_key = filters.search_key
    request.search_value = filters.search_value.trim()
  }
  if (filters.is_round) request.is_round = true
  if (filters.special) request.special = true

  return request
}

const isReviewRequestStatus = (value: string): value is ReviewRequestStatus =>
  statusOptions.some((option) => option.value === value)

const statusClass = (status: ReviewRequestStatus) => `status-select--${status}`

const buildReviewMessage = (item: ReviewQueueItem) => `Hi ${item.customer_name},

We hope your MR.CLEAR order ${item.amazon_order_id} has reached you safely and meets your expectations.

If you’re satisfied with the product, we’d truly appreciate it if you could take a moment to share your experience by leaving a review on Amazon. Your feedback helps other customers make informed decisions and supports our small team in improving our products and service.

Thank you for choosing MR.CLEAR. We truly value your support.`

const openReviewWhatsApp = (item: ReviewQueueItem) => {
  const normalizedPhone = normalizeIndianPhone(item.phone)
  if (!normalizedPhone) return

  const url = `https://web.whatsapp.com/send?phone=91${normalizedPhone}&text=${encodeURIComponent(buildReviewMessage(item))}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

const pruneSelectedIds = () => {
  const visibleIds = new Set(allVisibleOrderIds.value)
  selectedOrderIds.value = selectedOrderIds.value.filter((amazonOrderId) => visibleIds.has(amazonOrderId))
}

const loadQueue = async () => {
  await store.fetchQueue(buildQueueFilters())
  pruneSelectedIds()
}

const clearFilters = () => {
  Object.assign(filters, defaultFilters())
  void loadQueue()
}

const toggleVisibleSelection = (event: Event) => {
  const checked = event.target instanceof HTMLInputElement && event.target.checked
  const visibleIds = allVisibleOrderIds.value
  if (checked) {
    selectedOrderIds.value = Array.from(new Set([...selectedOrderIds.value, ...visibleIds]))
    return
  }

  const visibleSet = new Set(visibleIds)
  selectedOrderIds.value = selectedOrderIds.value.filter((amazonOrderId) => !visibleSet.has(amazonOrderId))
}

const handleInlineStatusChange = async (item: ReviewQueueItem, event: Event) => {
  const value = event.target instanceof HTMLSelectElement ? event.target.value : ''
  if (!isReviewRequestStatus(value) || value === item.review_request_status) return

  savingStatusIds[item.amazon_order_id] = true
  try {
    await store.updateRequestStatus([item.amazon_order_id], value)
    await loadQueue()
  } finally {
    savingStatusIds[item.amazon_order_id] = false
  }
}

const applyBulkStatus = async () => {
  if (selectedOrderIds.value.length === 0) return

  statusSaving.value = true
  try {
    await store.updateRequestStatus(selectedOrderIds.value, bulkStatus.value)
    selectedOrderIds.value = []
    await loadQueue()
  } finally {
    statusSaving.value = false
  }
}

onMounted(async () => {
  await store.refreshSettings()
  await loadQueue()
})
</script>

<style scoped>
.review-page {
  max-width: 1500px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.review-hero,
.filter-panel,
.bulk-panel,
.review-shell {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 20px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.review-hero {
  padding: 1.35rem 1.45rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
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
  font-size: 2.2rem;
  line-height: 1;
}

h2 {
  font-size: 1.05rem;
}

.review-actions,
.filter-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.bulk-panel {
  padding: 0.85rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.filter-panel {
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.85rem;
  align-items: end;
}

.filter-panel label,
.state-filter {
  min-width: 0;
  display: grid;
  gap: 0.35rem;
}

.filter-panel label > span,
.state-filter > span {
  color: #475569;
  font-size: 0.78rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.filter-panel select,
.filter-panel input {
  width: 100%;
  min-height: 2.55rem;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #fff;
  color: #0f172a;
  padding: 0 0.65rem;
  font: inherit;
}

.state-dropdown {
  position: relative;
}

.state-dropdown__button {
  width: 100%;
  min-height: 2.55rem;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #fff;
  color: #0f172a;
  padding: 0 0.65rem;
  font: inherit;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  cursor: pointer;
}

.state-dropdown__chevron {
  color: #64748b;
  font-size: 1.1rem;
  line-height: 1;
}

.state-dropdown__menu {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  right: 0;
  z-index: 8;
  max-height: 20rem;
  overflow-y: auto;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.16);
  padding: 0.45rem;
}

.state-dropdown__clear {
  width: 100%;
  min-height: 2.25rem;
  border: 0;
  border-radius: 8px;
  background: #f1f5f9;
  color: #0f172a;
  font: inherit;
  font-weight: 900;
  cursor: pointer;
  margin-bottom: 0.35rem;
}

.state-option {
  min-height: 2.35rem;
  display: grid !important;
  grid-template-columns: 1rem minmax(0, 1fr);
  align-items: center;
  gap: 0.45rem !important;
  padding: 0.35rem 0.45rem;
  border-radius: 8px;
  cursor: pointer;
}

.state-option:hover {
  background: #f8fafc;
}

.state-option input {
  width: 1rem;
  min-height: 1rem;
  accent-color: #0f766e;
}

.state-option__name {
  min-width: 0;
  color: #0f172a;
  font-weight: 700;
}

.split-control {
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr);
  gap: 0.45rem;
}

.search-control {
  display: grid;
  grid-template-columns: 7rem minmax(0, 1fr);
  gap: 0.45rem;
}

.toggle-row {
  min-height: 2.55rem;
  display: flex !important;
  align-items: center;
  gap: 0.55rem !important;
  padding: 0 0.7rem;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 8px;
  background: #f8fafc;
}

.toggle-row input {
  width: 1rem;
  min-height: 1rem;
  accent-color: #0f766e;
}

.select-visible {
  min-height: 2.55rem;
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0 0.7rem;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 8px;
  background: #f8fafc;
  color: #0f172a;
  font-weight: 800;
}

.select-visible input,
.select-cell input {
  width: 1rem;
  height: 1rem;
  accent-color: #0f766e;
}

.selected-count {
  color: #475569;
  font-weight: 900;
}

.bulk-status-select {
  min-height: 2.6rem;
  min-width: 12rem;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #fff;
  color: #0f172a;
  padding: 0 0.65rem;
  font: inherit;
}

.filter-actions {
  justify-content: flex-end;
}

.primary-button,
.secondary-button,
.whatsapp-button {
  min-height: 2.6rem;
  border-radius: 8px;
  font-weight: 800;
  cursor: pointer;
}

.primary-button {
  border: 0;
  padding: 0 1rem;
  background: #0f766e;
  color: #fff;
}

.secondary-button {
  display: inline-flex;
  align-items: center;
  padding: 0 1rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #0f172a;
  text-decoration: none;
}

.review-shell {
  padding: 0.85rem;
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #64748b;
  font-weight: 700;
}

.group-list {
  display: grid;
  gap: 1rem;
}

.review-group {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

.group-header {
  padding: 0.9rem 1rem;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.group-header p {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-weight: 700;
}

.state-pill {
  border-radius: 999px;
  padding: 0.35rem 0.65rem;
  background: #ccfbf1;
  color: #0f766e;
  font-weight: 900;
}

.table-wrap {
  overflow-x: auto;
}

.review-table {
  width: 100%;
  min-width: 1360px;
  border-collapse: collapse;
}

.review-table th,
.review-table td {
  padding: 0.8rem 0.9rem;
  border-top: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: top;
}

.review-table th {
  color: #475569;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  background: #ffffff;
}

.select-cell {
  width: 4.8rem;
  text-align: center !important;
}

.order-link {
  color: #0f766e;
  font-weight: 900;
  text-decoration: none;
}

.product-cell {
  max-width: 360px;
  overflow-wrap: anywhere;
}

.flag-list {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.flag-pill {
  border-radius: 999px;
  padding: 0.25rem 0.5rem;
  background: #e0f2fe;
  color: #0369a1;
  font-size: 0.78rem;
  font-weight: 900;
}

.flag-pill--special {
  background: #fef3c7;
  color: #92400e;
}

.muted-text {
  color: #94a3b8;
  font-weight: 700;
}

.confidence-meter {
  min-width: 150px;
  display: grid;
  gap: 0.35rem;
}

.confidence-meter span {
  font-weight: 900;
  color: #0f172a;
}

.confidence-track {
  height: 0.5rem;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.confidence-fill {
  height: 100%;
  border-radius: inherit;
  background: #0f766e;
}

.status-select {
  min-width: 10.5rem;
  min-height: 2.35rem;
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 0 0.75rem;
  font: inherit;
  font-weight: 900;
}

.status-select--not-requested {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fecaca;
}

.status-select--requested {
  background: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}

.status-select--received-review {
  background: #dcfce7;
  color: #166534;
  border-color: #bbf7d0;
}

.whatsapp-button {
  min-width: 7.5rem;
  border: 0;
  background: #dcfce7;
  color: #166534;
}

.primary-button:disabled,
.secondary-button:disabled,
.whatsapp-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .filter-panel {
    grid-template-columns: 1fr;
  }

  .filter-actions {
    justify-content: stretch;
  }

  .bulk-panel {
    align-items: stretch;
  }

  .filter-actions .primary-button,
  .filter-actions .secondary-button,
  .bulk-panel .primary-button,
  .bulk-status-select {
    flex: 1;
  }
}
</style>
