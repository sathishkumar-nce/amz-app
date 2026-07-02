<template>
  <div class="direct-cnc-page">
    <section class="hero-card">
      <div>
        <p class="eyebrow">Direct CNC workflow</p>
        <h1>Direct Order CNC Ops</h1>
        <p class="hero-copy">
          Review direct-order item dimensions inline, use quick inch adjustments, and save each line without leaving the machining queue.
        </p>
      </div>
      <div class="hero-pills">
        <span class="hero-pill">{{ rows.length }} item rows</span>
        <span class="hero-pill">{{ store.pagination.total }} orders</span>
      </div>
    </section>

    <DirectOrderFilterBar
      v-model="advancedFilters"
      :loading="store.loading"
      @apply="applyFilters"
      @clear="clearFilters"
    />

    <DirectOrderSearchBar
      v-model:searchKey="searchKey"
      v-model:searchValue="searchValue"
      :loading="store.loading"
      @search="applyFilters"
      @clear="clearSearch"
    />

    <section class="table-card">
      <div v-if="store.loading" class="empty-state">Loading direct CNC queue...</div>
      <div v-else-if="rows.length === 0" class="empty-state">No direct-order CNC rows found.</div>

      <template v-else>
        <div class="table-wrap">
          <table class="ops-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Order Status</th>
                <th>Customer</th>
                <th>Item</th>
                <th>Thickness</th>
                <th>Quantity</th>
                <th>Customer Width (in)</th>
                <th>Customer Length (in)</th>
                <th>Customer Width (mm)</th>
                <th>Customer Length (mm)</th>
                <th>Corner Radius and Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.rowKey" :class="rowHighlightClass(row.orderEdit.order_status)">
                <td>
                  <div class="cell-title">{{ row.order.order_id }}</div>
                  <div class="cell-subtitle">{{ row.order.mobile || 'No mobile' }}</div>
                </td>
                <td>{{ formatDate(row.order.created_at) }}</td>
                <td class="cell-status">
                  <select v-model="row.orderEdit.order_status" class="sheet-input">
                    <option v-for="status in orderStatusOptions" :key="status" :value="status">{{ status }}</option>
                  </select>
                </td>
                <td class="cell-customer">{{ row.order.customer_name || 'Customer pending' }}</td>
                <td class="cell-item">{{ row.item.item || 'Unnamed item' }}</td>
                <td class="cell-thickness">{{ row.item.thickness || 'Not set' }}</td>
                <td>{{ row.item.quantity }}</td>
                <td class="cell-dimension">
                  <input v-model="row.itemEdit.customer_width_in_inches" type="number" step="0.01" class="sheet-input" />
                  <div class="increment-row">
                    <button
                      v-for="step in incrementSteps"
                      :key="`${row.rowKey}-width-${step}`"
                      type="button"
                      class="increment-button"
                      @click="applyInchIncrement(row.itemEdit, 'customer_width_in_inches', step)"
                    >
                      +{{ step.toFixed(2) }}
                    </button>
                  </div>
                </td>
                <td class="cell-dimension">
                  <input v-model="row.itemEdit.customer_length_in_inches" type="number" step="0.01" class="sheet-input" />
                  <div class="increment-row">
                    <button
                      v-for="step in incrementSteps"
                      :key="`${row.rowKey}-length-${step}`"
                      type="button"
                      class="increment-button"
                      @click="applyInchIncrement(row.itemEdit, 'customer_length_in_inches', step)"
                    >
                      +{{ step.toFixed(2) }}
                    </button>
                  </div>
                </td>
                <td><input v-model="row.itemEdit.customer_width_in_mm" type="number" step="0.01" class="sheet-input" /></td>
                <td><input v-model="row.itemEdit.customer_length_in_mm" type="number" step="0.01" class="sheet-input" /></td>
                <td class="cell-notes">
                  <input v-model="row.itemEdit.corner_radius_and_notes" type="text" class="sheet-input" />
                </td>
                <td class="cell-actions">
                  <button type="button" class="btn btn-primary btn-block" :disabled="Boolean(savingRows[row.rowKey])" @click="saveRow(row)">
                    {{ savingRows[row.rowKey] ? 'Saving...' : 'Save' }}
                  </button>
                  <router-link :to="`/direct-orders/${row.order.order_id}`" class="btn btn-secondary btn-block">View</router-link>
                  <router-link :to="`/direct-orders/${row.order.order_id}/edit`" class="btn btn-secondary btn-block">Edit</router-link>
                  <p v-if="rowFeedback[row.rowKey]" class="feedback">{{ rowFeedback[row.rowKey] }}</p>
                </td>
              </tr>
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
import { computed, onMounted, reactive, ref } from 'vue'
import DirectOrderFilterBar from '@/components/DirectOrderFilterBar.vue'
import DirectOrderSearchBar from '@/components/DirectOrderSearchBar.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { useDirectOrdersStore } from '@/stores/directOrders'
import type { DirectOrder, DirectOrderFilters, DirectOrderItem, UpdateDirectOrderRequest } from '@/types'
import { buildDirectOrderAdvancedRequest, createDirectOrderAdvancedFilters } from '@/utils/directOrderListFilters'

type ItemEditRow = {
  customer_width_in_inches: string
  customer_length_in_inches: string
  customer_width_in_mm: string
  customer_length_in_mm: string
  corner_radius_and_notes: string
}

type OrderEditRow = {
  order_status: string
  issues: string
}

type VisibleRow = {
  rowKey: string
  order: DirectOrder
  itemIndex: number
  item: DirectOrderItem
  itemEdit: ItemEditRow
  orderEdit: OrderEditRow
}

const store = useDirectOrdersStore()
const incrementSteps = [0, 0.25, 0.5, 0.75, 1]
const issueRequiredStatuses = new Set(['cancelled', 'on-hold', 'other-issues', 'returned'])
const orderStatusOptions = ['confirmed', 'manufactured', 'on-hold', 'forwarded', 'cancelled', 'returned', 'other-issues']
const advancedFilters = ref(createDirectOrderAdvancedFilters())
const searchKey = ref('order_id')
const searchValue = ref('')

const filters = ref<DirectOrderFilters>({
  page: 1,
  limit: 100,
})

const itemEdits = reactive<Record<string, ItemEditRow>>({})
const orderEdits = reactive<Record<string, OrderEditRow>>({})
const savingRows = reactive<Record<string, boolean>>({})
const rowFeedback = reactive<Record<string, string>>({})

const numberToString = (value?: number | null) => (value == null ? '' : String(value))
const toOptionalNumber = (value?: string | null) => {
  if (!value?.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const buildItemEdit = (item: DirectOrderItem): ItemEditRow => ({
  customer_width_in_inches: numberToString(item.customer_width_in_inches),
  customer_length_in_inches: numberToString(item.customer_length_in_inches),
  customer_width_in_mm: numberToString(item.customer_width_in_mm),
  customer_length_in_mm: numberToString(item.customer_length_in_mm),
  corner_radius_and_notes: item.corner_radius_and_notes || '',
})

const buildOrderEdit = (order: DirectOrder): OrderEditRow => ({
  order_status: order.order_status || 'confirmed',
  issues: order.issues || '',
})

const rowKey = (orderId: string, itemIndex: number) => `${orderId}:${itemIndex}`

const ensureItemEdit = (rowId: string, item: DirectOrderItem) => {
  if (!itemEdits[rowId]) {
    itemEdits[rowId] = buildItemEdit(item)
  }
  return itemEdits[rowId] as ItemEditRow
}

const ensureOrderEdit = (order: DirectOrder) => {
  if (!orderEdits[order.order_id]) {
    orderEdits[order.order_id] = buildOrderEdit(order)
  }
  return orderEdits[order.order_id] as OrderEditRow
}

const rows = computed<VisibleRow[]>(() =>
  store.orders.flatMap((order) =>
    order.items.map((item, itemIndex) => {
      const currentRowKey = rowKey(order.order_id, itemIndex)
      return {
        rowKey: currentRowKey,
        order,
        itemIndex,
        item,
        itemEdit: ensureItemEdit(currentRowKey, item),
        orderEdit: ensureOrderEdit(order),
      }
    }),
  ),
)

const formatDate = (value?: string | null) => {
  if (!value) return 'Date pending'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
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

const roundToTwo = (value: number) => (Math.round(value * 100) / 100).toFixed(2)

const applyInchIncrement = (
  edit: ItemEditRow,
  field: 'customer_width_in_inches' | 'customer_length_in_inches',
  delta: number,
) => {
  const mmField = field === 'customer_width_in_inches' ? 'customer_width_in_mm' : 'customer_length_in_mm'
  const currentInches = Number(edit[field] || 0)
  const nextInches = currentInches + delta
  edit[field] = roundToTwo(nextInches)
  edit[mmField] = roundToTwo(nextInches * 25.4)
}

const loadOrders = async () => {
  await store.fetchOrders({
    ...filters.value,
    ...buildDirectOrderAdvancedRequest(advancedFilters.value),
    ...buildSearchFilters(),
    page: filters.value.page || 1,
    limit: filters.value.limit || 100,
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
    limit: 100,
  }
  advancedFilters.value = createDirectOrderAdvancedFilters()
  searchKey.value = 'order_id'
  searchValue.value = ''
  await loadOrders()
}

const changePage = async (page: number) => {
  filters.value.page = page
  await loadOrders()
}

const changeLimit = async (limit: number) => {
  filters.value.limit = limit
  filters.value.page = 1
  await loadOrders()
}

const ensureIssuesForSave = (order: DirectOrder, edit: OrderEditRow) => {
  if (!issueRequiredStatuses.has(edit.order_status)) {
    return edit.issues || undefined
  }
  if (edit.issues.trim()) {
    return edit.issues.trim()
  }
  const entered = window.prompt(`Issues is required when order status is "${edit.order_status}". Enter the reason before saving:`, order.issues || '')?.trim()
  if (!entered) {
    throw new Error('Issues field is required for the selected order status.')
  }
  edit.issues = entered
  return entered
}

const buildUpdatedItems = (order: DirectOrder, targetIndex: number, edit: ItemEditRow) =>
  order.items.map((item, index) => ({
    order_id: order.order_id,
    item: item.item ?? undefined,
    quantity: item.quantity,
    dimension: item.dimension ?? undefined,
    thickness: item.thickness ?? undefined,
    weight: item.weight ?? undefined,
    amount: item.amount ?? undefined,
    remark: item.remark ?? undefined,
    sku: item.sku ?? undefined,
    hsn: item.hsn ?? undefined,
    unit_price: item.unit_price ?? undefined,
    tax_rate: item.tax_rate ?? undefined,
    customer_width_in_inches: index === targetIndex ? toOptionalNumber(edit.customer_width_in_inches) : item.customer_width_in_inches ?? undefined,
    customer_length_in_inches: index === targetIndex ? toOptionalNumber(edit.customer_length_in_inches) : item.customer_length_in_inches ?? undefined,
    customer_width_in_mm: index === targetIndex ? toOptionalNumber(edit.customer_width_in_mm) : item.customer_width_in_mm ?? undefined,
    customer_length_in_mm: index === targetIndex ? toOptionalNumber(edit.customer_length_in_mm) : item.customer_length_in_mm ?? undefined,
    corner_radius_and_notes: index === targetIndex ? (edit.corner_radius_and_notes.trim() || undefined) : item.corner_radius_and_notes ?? undefined,
  }))

const saveRow = async (row: VisibleRow) => {
  savingRows[row.rowKey] = true
  rowFeedback[row.rowKey] = ''

  try {
    const issues = ensureIssuesForSave(row.order, row.orderEdit)
    const payload: UpdateDirectOrderRequest = {
      order_status: row.orderEdit.order_status,
      issues,
      items: buildUpdatedItems(row.order, row.itemIndex, row.itemEdit),
    }

    const updated = await store.updateOrder(row.order.order_id, payload)
    const updatedItem = updated.items[row.itemIndex]
    if (updatedItem) {
      itemEdits[row.rowKey] = buildItemEdit(updatedItem)
    }
    orderEdits[row.order.order_id] = buildOrderEdit(updated)
    rowFeedback[row.rowKey] = 'Saved'
  } catch (error: any) {
    rowFeedback[row.rowKey] = error.response?.data?.error || error.message || 'Save failed'
  } finally {
    savingRows[row.rowKey] = false
  }
}

onMounted(async () => {
  await loadOrders()
})
</script>

<style scoped>
.direct-cnc-page {
  max-width: 1820px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.hero-card,
.filters-card,
.table-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.hero-card {
  padding: 1.4rem 1.5rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
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
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 900;
}

.hero-copy {
  margin: 0.75rem 0 0;
  color: #475569;
  max-width: 64ch;
}

.hero-pills,
.filter-actions,
.cell-actions {
  display: flex;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.hero-pill {
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  background: #ecfeff;
  color: #0f766e;
  font-size: 0.82rem;
  font-weight: 800;
}

.filters-card,
.table-card {
  padding: 1rem;
}

.filters-card {
  display: grid;
  grid-template-columns: minmax(0, 2fr) repeat(2, minmax(0, 1fr)) auto;
  gap: 0.8rem;
  align-items: end;
}

.field {
  display: grid;
  gap: 0.38rem;
}

.field--wide {
  min-width: 0;
}

.field span {
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 800;
}

.sheet-input,
.sheet-textarea,
.field input,
.field select {
  width: 100%;
  box-sizing: border-box;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #ffffff;
  color: #0f172a;
  padding: 0.78rem 0.85rem;
  font: inherit;
}

.sheet-textarea {
  min-height: 5.25rem;
  resize: vertical;
}

.table-wrap {
  overflow: auto;
}

.ops-table {
  width: 100%;
  min-width: 1920px;
  border-collapse: separate;
  border-spacing: 0;
}

.ops-table th,
.ops-table td {
  padding: 0.8rem 0.65rem;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  white-space: nowrap;
}

.ops-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f8fafc;
  color: #0f766e;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.ops-table tbody tr.row-highlight--confirmed {
  background: rgba(254, 249, 195, 0.5);
}

.ops-table tbody tr.row-highlight--forwarded {
  background: rgba(219, 234, 254, 0.52);
}

.ops-table tbody tr.row-highlight--manufactured {
  background: rgba(220, 252, 231, 0.5);
}

.ops-table tbody tr.row-highlight--cancelled {
  background: rgba(254, 226, 226, 0.52);
}

.ops-table tbody tr.row-highlight--other-issues {
  background: rgba(252, 231, 243, 0.56);
}

.ops-table tbody tr.row-highlight--returned {
  background: rgba(255, 237, 213, 0.58);
}

.ops-table tbody tr.row-highlight--on-hold {
  background: rgba(241, 245, 249, 0.88);
}

.ops-table tbody tr.row-highlight--confirmed:hover {
  background: rgba(254, 240, 138, 0.58);
}

.ops-table tbody tr.row-highlight--forwarded:hover {
  background: rgba(191, 219, 254, 0.58);
}

.ops-table tbody tr.row-highlight--manufactured:hover {
  background: rgba(187, 247, 208, 0.58);
}

.ops-table tbody tr.row-highlight--cancelled:hover {
  background: rgba(254, 202, 202, 0.6);
}

.ops-table tbody tr.row-highlight--other-issues:hover {
  background: rgba(251, 207, 232, 0.62);
}

.ops-table tbody tr.row-highlight--returned:hover {
  background: rgba(254, 215, 170, 0.62);
}

.ops-table tbody tr.row-highlight--on-hold:hover {
  background: rgba(226, 232, 240, 0.92);
}

.cell-title {
  font-weight: 900;
  color: #0f172a;
  white-space: nowrap;
}

.cell-subtitle {
  margin-top: 0.3rem;
  color: #64748b;
  font-size: 0.86rem;
  white-space: nowrap;
}

.cell-status {
  min-width: 13rem;
}

.cell-customer {
  min-width: 10rem;
}

.cell-dimension {
  min-width: 17rem;
}

.cell-item {
  min-width: 11rem;
  white-space: normal !important;
  line-height: 1.45;
}

.cell-thickness {
  min-width: 7.5rem;
}

.ops-table th:nth-child(9),
.ops-table td:nth-child(9),
.ops-table th:nth-child(10),
.ops-table td:nth-child(10) {
  min-width: 10rem;
}

.ops-table th:nth-child(11),
.ops-table td:nth-child(11),
.ops-table th:nth-child(12),
.ops-table td:nth-child(12) {
  min-width: 11rem;
}

.ops-table th:nth-child(13),
.ops-table td:nth-child(13) {
  min-width: 20rem;
}

.ops-table th:nth-child(14),
.ops-table td:nth-child(14) {
  min-width: 10.5rem;
}

.cell-notes {
  min-width: 20rem;
}

.cell-actions {
  min-width: 10.5rem;
  display: grid;
}

.increment-row {
  margin-top: 0.45rem;
  display: flex;
  gap: 0.45rem;
  flex-wrap: nowrap;
  overflow-x: auto;
  white-space: nowrap;
  scrollbar-width: thin;
}

.increment-button,
.btn {
  border: 0;
  cursor: pointer;
  font: inherit;
  font-weight: 800;
}

.increment-button {
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  padding: 0.3rem 0.58rem;
  font-size: 0.74rem;
}

.btn {
  min-height: 2.7rem;
  padding: 0 0.95rem;
  border-radius: 14px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #0f766e, #115e59);
  color: #ffffff;
}

.btn-secondary {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid rgba(59, 130, 246, 0.16);
}

.btn-block {
  width: 100%;
}

.feedback {
  margin: 0;
  color: #0f766e;
  font-size: 0.84rem;
  font-weight: 700;
  white-space: normal;
}

.empty-state {
  padding: 2.5rem 1rem;
  text-align: center;
  color: #64748b;
  font-weight: 700;
}

@media (max-width: 1080px) {
  .hero-card {
    flex-direction: column;
  }

  .filters-card {
    grid-template-columns: 1fr;
  }
}
</style>
