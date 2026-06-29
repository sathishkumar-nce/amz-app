<template>
  <div class="confirm-page">
    <section class="confirm-hero">
      <div>
        <p class="eyebrow">Order confirmation board</p>
        <h1>Order Confirmation Queue</h1>
        <p class="confirm-hero__copy">
          Product-first confirmation screen for checking customer details, filling custom size fields, and updating order priority before production handoff.
        </p>
      </div>
      <div class="confirm-hero__summary">
        <span class="summary-pill">{{ visibleRows.length }} product rows</span>
        <span class="summary-pill">{{ ordersStore.pagination.total }} orders loaded</span>
      </div>
    </section>

    <OrderSearchBar
      v-model:searchKey="searchKey"
      v-model:searchValue="searchValue"
      :loading="ordersStore.loading"
      @search="applySearch"
      @clear="clearSearch"
    />

    <section class="confirm-shell">
      <div v-if="ordersStore.loading" class="empty-state">Loading confirmation queue...</div>
      <div v-else-if="visibleRows.length === 0" class="empty-state">No confirmation rows found.</div>

      <template v-else>
        <ListUtilityBar
          :total="ordersStore.pagination.total"
          :page="ordersStore.pagination.page"
          :total-pages="ordersStore.pagination.totalPages"
          item-label="orders"
          editable
          helper-text="Priority and customer fields can be updated inline"
        />
        <div class="sheet-wrap">
          <table class="confirm-sheet">
          <thead>
            <tr>
              <th class="cell-order">Order ID</th>
              <th>Confirmed</th>
              <th>Status</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>City / State</th>
              <th class="cell-product">Product</th>
              <th class="cell-quantity">Qty</th>
              <th>Thickness</th>
              <th>SKU</th>
              <th>Priority</th>
              <th>is_round</th>
              <th>Width (in)</th>
              <th>Length (in)</th>
              <th>Corner / Notes</th>
              <th class="cell-actions">Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="row in visibleRows" :key="row.rowKey" :style="getRowStyle(row)">
              <td class="cell-order">
                <div class="order-id-line">{{ row.order.amazon_order_id }}</div>
                <div class="order-subline">BL #{{ row.order.baselinker_order_id }}</div>
              </td>
              <td>{{ formatDate(row.order.date_confirmed || row.order.date_add) }}</td>
              <td><span class="status-pill">{{ row.order.order_status }}</span></td>
              <td>{{ formatText(row.order.delivery_fullname || row.order.user_login) }}</td>
              <td>{{ formatText(row.order.phone) }}</td>
              <td class="cell-location">
                <div class="location-city">{{ formatText(row.order.delivery_city) }}</div>
                <div class="location-state">{{ formatText(row.order.delivery_state) }}</div>
              </td>
              <td class="cell-product">
                <div class="product-title">{{ formatProductName(row.product.name) }}</div>
              </td>
              <td class="cell-quantity">{{ formatNumber(row.product.quantity) }}</td>
              <td>{{ row.product.thickness || 'Not set' }}</td>
              <td>{{ row.product.sku || 'Not set' }}</td>
              <td>
                <select v-model="row.edit.priority" class="sheet-input">
                  <option value="p1">P1</option>
                  <option value="p2">P2</option>
                  <option value="p3">P3</option>
                  <option value="p4">P4</option>
                </select>
              </td>
              <td><span class="status-pill">{{ row.product.is_round ? 'Yes' : 'No' }}</span></td>
              <td>
                <input
                  v-model="row.edit.customer_width_in_inches"
                  type="number"
                  step="0.01"
                  class="sheet-input"
                  placeholder="Width in"
                />
              </td>
              <td>
                <input
                  v-model="row.edit.customer_length_in_inches"
                  type="number"
                  step="0.01"
                  class="sheet-input"
                  placeholder="Length in"
                />
              </td>
              <td>
                <textarea
                  v-model="row.edit.corner_radius_and_notes"
                  rows="3"
                  class="sheet-textarea"
                  placeholder="Corner radius and notes"
                />
              </td>
              <td class="cell-actions">
                <button
                  type="button"
                  @click.stop.prevent="saveRow(row)"
                  :disabled="savingRows[row.rowKey]"
                  class="save-button"
                >
                  {{ savingRows[row.rowKey] ? 'Saving...' : 'Save Row' }}
                </button>
                <router-link :to="`/orders/${row.order.amazon_order_id}`" class="view-link">View</router-link>
                <p v-if="rowFeedback[row.rowKey]" class="product-feedback">{{ rowFeedback[row.rowKey] }}</p>
              </td>
            </tr>
          </tbody>
          </table>
        </div>
      </template>

      <PaginationControls
        :page="ordersStore.pagination.page"
        :total-pages="ordersStore.pagination.totalPages"
        :total="ordersStore.pagination.total"
        :limit="ordersStore.pagination.limit"
        item-label="orders"
        @change="changePage"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import ListUtilityBar from '@/components/ListUtilityBar.vue'
import OrderSearchBar from '@/components/OrderSearchBar.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { useAmazonRowHighlightRulesStore } from '@/stores/amazonRowHighlightRules'
import { useOrdersStore } from '@/stores/orders'
import type { Order, OrderProduct, UpdateManualFieldsRequest, UpdateProductManualFieldsRequest } from '@/types'
import { formatStandardDate } from '@/utils/orderData'

type SheetRow = {
  rowKey: string
  order: Order
  product: OrderProduct
}

type VisibleRow = SheetRow & {
  edit: ConfirmationRowEdit
}

type ConfirmationRowEdit = {
  priority: string
  customer_width_in_inches: string
  customer_length_in_inches: string
  corner_radius_and_notes: string
}

const ordersStore = useOrdersStore()
const rowHighlightRulesStore = useAmazonRowHighlightRulesStore()
const filters = ref({
  page: 1,
  limit: 200,
})
const searchKey = ref('order_id')
const searchValue = ref('')
const SAVE_TIMEOUT_MS = 15000

const rowEdits = reactive<Record<string, ConfirmationRowEdit>>({})
const savingRows = reactive<Record<string, boolean>>({})
const rowFeedback = reactive<Record<string, string>>({})

const sheetRows = computed<SheetRow[]>(() =>
  ordersStore.orders.flatMap((order) =>
    (order.products || [])
      .filter((product) => !product.is_discount_line)
      .map((product) => ({
        rowKey: productKey(order.amazon_order_id, product.order_product_id),
        order,
        product,
      })),
  ),
)

const productKey = (amazonOrderId: string, orderProductId: number) => `${amazonOrderId}:${orderProductId}`
const formatDate = (dateString?: string | null) => formatStandardDate(dateString)
const formatText = (value?: string | null) => value?.trim() || 'Not available'
const formatNumber = (value?: number | null) => (value == null ? 'Not set' : String(value))
const numberToString = (value?: number | null) => (value == null ? '' : String(value))
const formatProductName = (value?: string | null) => {
  const trimmed = value?.trim()
  if (!trimmed) return 'Unnamed product'
  return trimmed.length > 110 ? `${trimmed.slice(0, 110)}...` : trimmed
}

const buildRowEdit = (row: SheetRow): ConfirmationRowEdit => ({
  priority: row.order.priority || 'p3',
  customer_width_in_inches: numberToString(row.product.customer_width_in_inches),
  customer_length_in_inches: numberToString(row.product.customer_length_in_inches),
  corner_radius_and_notes: row.product.corner_radius_and_notes ?? '',
})

const ensureRowEdit = (row: SheetRow) => {
  if (!rowEdits[row.rowKey]) {
    rowEdits[row.rowKey] = buildRowEdit(row)
  }
  return rowEdits[row.rowKey] as ConfirmationRowEdit
}

const syncRowEdits = () => {
  for (const row of sheetRows.value) {
    rowEdits[row.rowKey] = buildRowEdit(row)
  }
}

const toOptionalNumber = (value?: string | number | null) => {
  if (value == null) return undefined
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const hasMissingConfirmationFields = (edit: ConfirmationRowEdit) =>
  !edit.customer_width_in_inches.trim() &&
  !edit.customer_length_in_inches.trim() &&
  !edit.corner_radius_and_notes.trim()

const getRowStyle = (row: SheetRow) => rowHighlightRulesStore.getRowHighlightStyle(row.order, [row.product])

const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
  let timeoutId: number | undefined

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error('Save timed out. Please try again.'))
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

const visibleRows = computed<VisibleRow[]>(() => {
  const rows = sheetRows.value
    .map((row) => ({
      ...row,
      edit: ensureRowEdit(row),
    }))
  return rows
})

const buildSearchFilters = () => {
  const value = searchValue.value.trim()
  if (!value) return {}

  if (searchKey.value === 'order_id') {
    return { order_id: value }
  }
  if (searchKey.value === 'customer') {
    return { customer: value }
  }
  if (searchKey.value === 'phone') {
    return { phone: value }
  }
  if (searchKey.value === 'sku') {
    return { sku: value }
  }
  if (searchKey.value === 'thickness') {
    return { thickness: value }
  }
  if (searchKey.value === 'priority') {
    return { priority: value }
  }
  if (searchKey.value === 'is_round') {
    return { round_product: value === 'true' }
  }
  if (searchKey.value === 'confirmed_date') {
    return { confirmed_date: value }
  }
  if (searchKey.value === 'order_status') {
    return { order_status: value }
  }
  return {}
}

const applyFilters = async () => {
  await ordersStore.fetchOrders({
    page: filters.value.page,
    limit: filters.value.limit,
    search_key: searchKey.value,
    search_value: searchValue.value.trim() || undefined,
    ...buildSearchFilters(),
  })
  syncRowEdits()
}

const applySearch = async () => {
  filters.value.page = 1
  await applyFilters()
}

const clearSearch = async () => {
  searchKey.value = 'order_id'
  searchValue.value = ''
  filters.value.page = 1
  await applyFilters()
}

const changePage = async (page: number) => {
  if (page === filters.value.page) return
  filters.value.page = page
  await applyFilters()
}

const saveRow = async (row: SheetRow) => {
  const edit = rowEdits[row.rowKey]
  if (!edit) return

  savingRows[row.rowKey] = true
  rowFeedback[row.rowKey] = ''

  try {
    const orderPayload: UpdateManualFieldsRequest = {
      priority: edit.priority,
    }

    const productPayload: UpdateProductManualFieldsRequest = {
      customer_width_in_inches: toOptionalNumber(edit.customer_width_in_inches),
      customer_length_in_inches: toOptionalNumber(edit.customer_length_in_inches),
      corner_radius_and_notes: edit.corner_radius_and_notes || undefined,
    }

    await withTimeout(
      ordersStore.updateOrderManualFields(row.order.amazon_order_id, orderPayload),
      SAVE_TIMEOUT_MS,
    )
    const updated = await withTimeout(
      ordersStore.updateProductManualFields(row.order.amazon_order_id, row.product.order_product_id, productPayload),
      SAVE_TIMEOUT_MS,
    )
    const refreshedRow = updated?.products?.find((product) => product.order_product_id === row.product.order_product_id)
    if (refreshedRow) {
      rowEdits[row.rowKey] = {
        priority: updated.priority || 'p3',
        customer_width_in_inches: numberToString(refreshedRow.customer_width_in_inches),
        customer_length_in_inches: numberToString(refreshedRow.customer_length_in_inches),
        corner_radius_and_notes: refreshedRow.corner_radius_and_notes ?? '',
      }
    }
    rowFeedback[row.rowKey] = 'Row saved'
  } catch (error: any) {
    rowFeedback[row.rowKey] = error.response?.data?.error || error.message || 'Save failed'
  } finally {
    savingRows[row.rowKey] = false
  }
}

onMounted(() => {
  void rowHighlightRulesStore.ensureLoaded()
  applyFilters()
})
</script>

<style scoped>
.confirm-page {
  max-width: 1720px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.confirm-hero,
.confirm-filters,
.confirm-shell {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.confirm-hero {
  padding: 1.5rem 1.65rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  background:
    radial-gradient(circle at top right, rgba(250, 204, 21, 0.18), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(254, 249, 195, 0.7));
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
  font-size: clamp(2rem, 3.8vw, 3.2rem);
  line-height: 1;
  color: #0f172a;
  font-weight: 900;
}

.confirm-hero__copy {
  margin: 0.8rem 0 0;
  max-width: 64ch;
  color: #475569;
}

.confirm-hero__summary {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.summary-pill,
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  font-size: 0.85rem;
  font-weight: 800;
  background: #ecfccb;
  color: #3f6212;
}

.confirm-filters {
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  grid-auto-rows: minmax(3rem, auto);
  align-items: stretch;
  gap: 0.75rem;
}

.filter-input,
.sheet-input,
.sheet-textarea {
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #ffffff;
  color: #0f172a;
  padding: 0.62rem 0.7rem;
  font: inherit;
}

.sheet-textarea {
  min-height: 4.5rem;
  resize: vertical;
}

.action-button,
.save-button,
.toggle-button {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.action-button {
  min-height: 3rem;
  border-radius: 16px;
  background: #0f766e;
  color: #ffffff;
  font-weight: 800;
  width: 100%;
}

.action-button--small {
  min-height: 100%;
}

.toggle-button {
  min-height: 3rem;
  border-radius: 16px;
  background: #f8fafc;
  color: #334155;
  border: 1px solid rgba(148, 163, 184, 0.3);
  font-weight: 700;
  padding: 0 1rem;
  width: 100%;
}

.toggle-button--active {
  background: #dcfce7;
  color: #166534;
}

.confirm-shell {
  padding: 0.8rem;
  content-visibility: auto;
  contain-intrinsic-size: 820px;
}

.sheet-wrap {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pan-y;
}

.confirm-sheet {
  width: 100%;
  min-width: 1820px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: auto;
}

.confirm-sheet th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0.72rem 0.5rem;
  text-align: left;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #0f766e;
  background: #f8fafc;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
}

.confirm-sheet td {
  padding: 0.72rem 0.5rem;
  vertical-align: top;
  border-bottom: 1px solid rgba(226, 232, 240, 0.85);
  color: #0f172a;
  background: var(--row-highlight-background, rgba(255, 255, 255, 0.9));
}

.cell-order {
  min-width: 13rem;
}

.order-id-line {
  font-size: 0.95rem;
  font-weight: 900;
  white-space: nowrap;
}

.order-subline {
  margin-top: 0.2rem;
  color: #64748b;
  font-size: 0.8rem;
}

.cell-product {
  min-width: 24rem;
  max-width: 24rem;
}

.product-title {
  font-weight: 700;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
}

.cell-quantity {
  min-width: 4.5rem;
  font-weight: 800;
}

.cell-location {
  min-width: 9rem;
  white-space: normal;
}

.location-city,
.location-state {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}

.location-city {
  font-weight: 700;
}

.location-state {
  margin-top: 0.18rem;
  color: #64748b;
  font-size: 0.84rem;
}

.cell-actions {
  min-width: 10rem;
}

.confirm-sheet td:not(.cell-product):not(.cell-order):not(.cell-actions):not(.cell-location) {
  white-space: nowrap;
}

.confirm-sheet td:nth-child(13),
.confirm-sheet td:nth-child(14) {
  min-width: 9rem;
}

.confirm-sheet td:nth-child(15) {
  min-width: 28rem;
}

.confirm-sheet td:nth-child(13) .sheet-input,
.confirm-sheet td:nth-child(14) .sheet-input {
  min-width: 8rem;
}

.confirm-sheet td:nth-child(15) .sheet-textarea {
  min-width: 26rem;
  min-height: 6.8rem;
}

.save-button,
.view-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 2.4rem;
  border-radius: 14px;
  font-weight: 800;
  font-size: 0.92rem;
}

.save-button {
  background: #0f766e;
  color: #ffffff;
}

.view-link {
  margin-top: 0.45rem;
  background: #eff6ff;
  color: #1d4ed8;
}

.product-feedback {
  margin: 0.45rem 0 0;
  color: #0f766e;
  font-size: 0.85rem;
  font-weight: 700;
}

.empty-state {
  padding: 2.5rem 1rem;
  text-align: center;
  color: #64748b;
  font-weight: 700;
}

@media (max-width: 1280px) {
  .confirm-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .confirm-hero {
    flex-direction: column;
  }
}

@media (max-width: 720px) {
  .confirm-filters {
    grid-template-columns: 1fr;
  }
}
</style>
