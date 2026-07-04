<template>
  <div class="returns-page">
    <section class="returns-hero">
      <div>
        <p class="eyebrow">Returns workflow</p>
        <h1>Returns-Initiated</h1>
        <p class="returns-hero__copy">
          Product-first queue for marking return initiation and capturing the reason and follow-up action inline.
        </p>
      </div>
      <div class="returns-hero__summary">
        <span class="summary-pill">{{ visibleRows.length }} product rows</span>
        <span class="summary-pill">{{ ordersStore.pagination.total }} orders loaded</span>
      </div>
    </section>

    <OrderSearchBar
      v-model:searchKey="searchKey"
      v-model:searchValue="searchValue"
      v-model:searchOperator="searchOperator"
      :loading="ordersStore.loading"
      @search="applySearch"
      @clear="clearSearch"
    />

    <OrderListFilterBar
      v-model="advancedFilters"
      :loading="ordersStore.loading"
      @apply="applySearch"
      @clear="clearSearch"
    >
      <template #extra>
        <label class="filter-field">
          <span>Return initiated</span>
          <select v-model="returnInitiatedFilter" class="filter-input" :disabled="ordersStore.loading">
            <option value="">All return initiated states</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>

        <label class="filter-field">
          <span>Return compromised</span>
          <select v-model="returnCompromisedFilter" class="filter-input" :disabled="ordersStore.loading">
            <option value="">All return compromised states</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>
      </template>
    </OrderListFilterBar>

    <section class="returns-shell">
      <div v-if="ordersStore.loading" class="empty-state">Loading returns-initiated queue...</div>
      <div v-else-if="visibleRows.length === 0" class="empty-state">No rows found.</div>

      <template v-else>
        <ListUtilityBar
          :total="ordersStore.pagination.total"
          :page="ordersStore.pagination.page"
          :total-pages="ordersStore.pagination.totalPages"
          item-label="orders"
          editable
          helper-text="Update the return fields inline, then save each row."
        />

        <div ref="sheetWrapRef" class="sheet-wrap">
          <table class="returns-sheet">
            <thead>
              <tr>
                <th class="cell-order">Order ID</th>
                <th class="cell-status">
                  <SortableHeader label="Order Status" :direction="sortState.key === 'order_status' ? sortState.direction : null" @sort="setSort('order_status', $event)" />
                </th>
                <th class="cell-date">
                  <SortableHeader label="Date Confirmed" :direction="sortState.key === 'confirmed_date' ? sortState.direction : null" @sort="setSort('confirmed_date', $event)" />
                </th>
                <th class="cell-product">Products</th>
                <th class="cell-customer">Customer</th>
                <th class="cell-phone">Phone</th>
                <th class="cell-city">City</th>
                <th class="cell-quantity">
                  <SortableHeader label="Quantity" :direction="sortState.key === 'quantity' ? sortState.direction : null" @sort="setSort('quantity', $event)" />
                </th>
                <th class="cell-size">Customer Width (in)</th>
                <th class="cell-size">Customer Length (in)</th>
                <th class="cell-notes">Corner Style and Notes</th>
                <th class="cell-toggle">Return Initiated</th>
                <th class="cell-reason">Return Initiated Reason</th>
                <th class="cell-followup">Return Initiated Followup Action</th>
                <th class="cell-toggle">Return Initiated Compromised</th>
                <th class="cell-reason">Return Initiated Compromised Reason</th>
                <th class="cell-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in visibleRows" :key="row.rowKey" :style="getRowStyle(row)">
                <td class="cell-order">
                  <div class="order-id-line">{{ row.order.amazon_order_id }}</div>
                  <div class="order-subline">BL #{{ row.order.baselinker_order_id }}</div>
                </td>
                <td class="cell-status">
                  <span class="status-pill">{{ row.order.order_status }}</span>
                </td>
                <td class="cell-date">{{ formatDate(row.order.date_confirmed || row.order.date_add) }}</td>
                <td class="cell-product">
                  <div class="product-title">{{ formatProductName(row.product.name) }}</div>
                </td>
                <td class="cell-customer">{{ formatText(row.order.delivery_fullname || row.order.user_login) }}</td>
                <td class="cell-phone">{{ formatText(row.order.phone) }}</td>
                <td class="cell-city">{{ formatText(row.order.delivery_city) }}</td>
                <td class="cell-quantity">{{ formatNumber(row.product.quantity) }}</td>
                <td class="cell-size">{{ formatNumber(row.product.customer_width_in_inches) }}</td>
                <td class="cell-size">{{ formatNumber(row.product.customer_length_in_inches) }}</td>
                <td class="cell-notes">{{ formatLongText(row.product.corner_radius_and_notes) }}</td>
                <td class="cell-toggle">
                  <label class="toggle" :class="{ 'toggle--saving': savingRows[row.rowKey] }">
                    <input
                      :checked="row.edit.return_initiated"
                      type="checkbox"
                      @change="setToggleValue(row, 'return_initiated', ($event.target as HTMLInputElement).checked)"
                    />
                    <span class="toggle__track">
                      <span class="toggle__thumb" />
                    </span>
                    <span class="toggle__label">{{ row.edit.return_initiated ? 'True' : 'False' }}</span>
                  </label>
                </td>
                <td class="cell-reason">
                  <textarea
                    v-model="row.edit.return_initiated_reason"
                    rows="3"
                    class="sheet-textarea"
                    maxlength="500"
                    placeholder="Return initiated reason"
                  />
                </td>
                <td class="cell-followup">
                  <textarea
                    v-model="row.edit.return_initiated_followup_action"
                    rows="3"
                    class="sheet-textarea"
                    maxlength="500"
                    placeholder="Return initiated follow-up action"
                  />
                </td>
                <td class="cell-toggle">
                  <label class="toggle" :class="{ 'toggle--saving': savingRows[row.rowKey] }">
                    <input
                      :checked="row.edit.return_initiated_compromised"
                      type="checkbox"
                      @change="setToggleValue(row, 'return_initiated_compromised', ($event.target as HTMLInputElement).checked)"
                    />
                    <span class="toggle__track">
                      <span class="toggle__thumb" />
                    </span>
                    <span class="toggle__label">{{ row.edit.return_initiated_compromised ? 'True' : 'False' }}</span>
                  </label>
                </td>
                <td class="cell-reason">
                  <textarea
                    v-model="row.edit.return_initiated_compromised_reason"
                    rows="3"
                    class="sheet-textarea"
                    maxlength="500"
                    placeholder="Return initiated compromised reason"
                  />
                </td>
                <td class="cell-actions">
                  <button
                    type="button"
                    class="save-button"
                    :disabled="savingRows[row.rowKey]"
                    @click.stop.prevent="saveRow(row)"
                  >
                    {{ savingRows[row.rowKey] ? 'Saving...' : 'Save' }}
                  </button>
                  <router-link :to="`/orders/${row.order.amazon_order_id}`" class="view-link">View</router-link>
                  <p v-if="rowFeedback[row.rowKey]" class="row-feedback">{{ rowFeedback[row.rowKey] }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <StickyHorizontalScrollbar :target="sheetWrapRef" always-visible />
      </template>

      <PaginationControls
        :page="ordersStore.pagination.page"
        :total-pages="ordersStore.pagination.totalPages"
        :total="ordersStore.pagination.total"
        :limit="ordersStore.pagination.limit"
        item-label="orders"
        @change="changePage"
        @limit-change="changeLimit"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import ListUtilityBar from '@/components/ListUtilityBar.vue'
import OrderListFilterBar from '@/components/OrderListFilterBar.vue'
import OrderSearchBar from '@/components/OrderSearchBar.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import SortableHeader from '@/components/SortableHeader.vue'
import StickyHorizontalScrollbar from '@/components/StickyHorizontalScrollbar.vue'
import { useAmazonRowHighlightRulesStore } from '@/stores/amazonRowHighlightRules'
import { useOrdersStore } from '@/stores/orders'
import type { Order, OrderProduct, UpdateProductManualFieldsRequest } from '@/types'
import { buildOrderListAdvancedRequest, createOrderListAdvancedFilters } from '@/utils/orderListFilters'
import { formatStandardDate } from '@/utils/orderData'
import { sortItems, type SortDirection } from '@/utils/tableSort'

type SheetRow = {
  rowKey: string
  order: Order
  product: OrderProduct
}

type ReturnEditRow = {
  return_initiated: boolean
  return_initiated_reason: string
  return_initiated_followup_action: string
  return_initiated_compromised: boolean
  return_initiated_compromised_reason: string
}

type VisibleRow = SheetRow & {
  edit: ReturnEditRow
}

type SortKey = 'order_status' | 'confirmed_date' | 'quantity'

const ordersStore = useOrdersStore()
const rowHighlightRulesStore = useAmazonRowHighlightRulesStore()
const filters = ref({
  page: 1,
  limit: 100,
})
const advancedFilters = ref(createOrderListAdvancedFilters())
const searchOperator = ref<'gt' | 'gte' | 'lt' | 'lte' | 'eq'>('gte')
const sortState = ref<{ key: SortKey | null; direction: SortDirection }>({
  key: null,
  direction: 'asc',
})
const searchKey = ref('order_id')
const searchValue = ref('')
const returnInitiatedFilter = ref('')
const returnCompromisedFilter = ref('')
const SAVE_TIMEOUT_MS = 15000

const rowEdits = reactive<Record<string, ReturnEditRow>>({})
const savingRows = reactive<Record<string, boolean>>({})
const rowFeedback = reactive<Record<string, string>>({})
const sheetWrapRef = ref<HTMLElement | null>(null)

const productKey = (amazonOrderId: string, orderProductId: number) => `${amazonOrderId}:${orderProductId}`

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

const buildRowEdit = (row: SheetRow): ReturnEditRow => ({
  return_initiated: row.product.return_initiated === true,
  return_initiated_reason: row.product.return_initiated_reason ?? '',
  return_initiated_followup_action: row.product.return_initiated_followup_action ?? '',
  return_initiated_compromised: row.product.return_initiated_compromised === true,
  return_initiated_compromised_reason: row.product.return_initiated_compromised_reason ?? '',
})

const ensureRowEdit = (row: SheetRow) => {
  if (!rowEdits[row.rowKey]) {
    rowEdits[row.rowKey] = buildRowEdit(row)
  }
  return rowEdits[row.rowKey] as ReturnEditRow
}

const syncRowEdits = () => {
  for (const row of sheetRows.value) {
    rowEdits[row.rowKey] = buildRowEdit(row)
  }
}

const visibleRows = computed<VisibleRow[]>(() => {
  const rows = sheetRows.value
    .map((row) => ({
      ...row,
      edit: ensureRowEdit(row),
    }))

  if (!sortState.value.key) return rows

  return sortItems(rows, (row) => {
    switch (sortState.value.key) {
      case 'order_status':
        return row.order.order_status || ''
      case 'confirmed_date':
        return row.order.date_confirmed || row.order.date_add || ''
      case 'quantity':
        return row.product.quantity
      default:
        return ''
    }
  }, sortState.value.direction)
})

const getRowStyle = (row: SheetRow) => rowHighlightRulesStore.getRowHighlightStyle(row.order, [row.product])
const setSort = (key: SortKey, direction: SortDirection) => {
  sortState.value = { key, direction }
}

const formatDate = (value?: string | null) => formatStandardDate(value)
const formatText = (value?: string | null) => value?.trim() || 'Not available'
const formatNumber = (value?: number | null) => (value == null ? 'Not set' : String(value))
const formatLongText = (value?: string | null) => value?.trim() || 'Not available'
const formatProductName = (value?: string | null) => {
  const trimmed = value?.trim()
  if (!trimmed) return 'Unnamed product'
  return trimmed.length > 110 ? `${trimmed.slice(0, 110)}...` : trimmed
}

const setToggleValue = (
  row: SheetRow,
  field: 'return_initiated' | 'return_initiated_compromised',
  checked: boolean,
) => {
  rowEdits[row.rowKey] = {
    ...ensureRowEdit(row),
    [field]: checked,
  }
}

const buildSearchFilters = () => {
  const value = searchValue.value.trim()
  if (!value) return {}

  if (searchKey.value === 'order_id') return { order_id: value }
  if (searchKey.value === 'customer') return { customer: value }
  if (searchKey.value === 'phone') return { phone: value }
  if (searchKey.value === 'sku') return { sku: value }
  if (searchKey.value === 'thickness') return { thickness: value }
  if (searchKey.value === 'priority') return { priority: value }
  if (searchKey.value === 'is_round') return { round_product: value === 'true' }
  if (searchKey.value === 'confirmed_date') return { confirmed_date: value }
  if (searchKey.value === 'order_status') return { order_status: value }
  if (searchKey.value === 'default_width_in_inches') {
    return {
      default_width_in_inches: value,
      default_width_in_inches_operator: searchOperator.value,
    }
  }
  if (searchKey.value === 'default_length_in_inches') {
    return {
      default_length_in_inches: value,
      default_length_in_inches_operator: searchOperator.value,
    }
  }
  return {}
}

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

const saveProductFields = async (row: SheetRow, payload: UpdateProductManualFieldsRequest, successMessage: string) => {
  savingRows[row.rowKey] = true
  rowFeedback[row.rowKey] = ''

  try {
    await withTimeout(
      ordersStore.updateProductManualFields(row.order.amazon_order_id, row.product.order_product_id, payload),
      SAVE_TIMEOUT_MS,
    )
    rowFeedback[row.rowKey] = successMessage
    syncRowEdits()
  } catch (error: any) {
    rowFeedback[row.rowKey] = error?.response?.data?.error || error?.message || 'Failed to save row'
    rowEdits[row.rowKey] = buildRowEdit(row)
  } finally {
    savingRows[row.rowKey] = false
    window.setTimeout(() => {
      if (rowFeedback[row.rowKey] === successMessage) {
        rowFeedback[row.rowKey] = ''
      }
    }, 2500)
  }
}

const saveRow = async (row: SheetRow) => {
  const edit = ensureRowEdit(row)

  if (edit.return_initiated && !edit.return_initiated_reason.trim()) {
    rowFeedback[row.rowKey] = 'Enter return_initiated_reason before saving.'
    return
  }

  if (edit.return_initiated_compromised && !edit.return_initiated_compromised_reason.trim()) {
    rowFeedback[row.rowKey] = 'Enter return_initiated_compromised_reason before saving.'
    return
  }

  await saveProductFields(row, {
    return_initiated: edit.return_initiated,
    return_initiated_reason: edit.return_initiated_reason.trim() || '',
    return_initiated_followup_action: edit.return_initiated_followup_action.trim() || '',
    return_initiated_compromised: edit.return_initiated_compromised,
    return_initiated_compromised_reason: edit.return_initiated_compromised_reason.trim() || '',
  }, 'Return details saved')
}

const applyFilters = async () => {
  const returnInitiatedValue =
    returnInitiatedFilter.value === ''
      ? undefined
      : returnInitiatedFilter.value === 'true'
  const returnCompromisedValue =
    returnCompromisedFilter.value === ''
      ? undefined
      : returnCompromisedFilter.value === 'true'

  await ordersStore.fetchOrders({
    page: filters.value.page,
    limit: filters.value.limit,
    search_key: searchKey.value,
    search_value: searchValue.value.trim() || undefined,
    search_operator: searchOperator.value,
    return_initiated: returnInitiatedValue,
    return_initiated_compromised: returnCompromisedValue,
    ...buildSearchFilters(),
    ...buildOrderListAdvancedRequest(advancedFilters.value),
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
  searchOperator.value = 'gte'
  advancedFilters.value = createOrderListAdvancedFilters()
  returnInitiatedFilter.value = ''
  returnCompromisedFilter.value = ''
  filters.value.page = 1
  await applyFilters()
}

const changePage = async (page: number) => {
  if (page === filters.value.page) return
  filters.value.page = page
  await applyFilters()
}

const changeLimit = async (limit: number) => {
  if (limit === filters.value.limit) return
  filters.value.limit = limit
  filters.value.page = 1
  await applyFilters()
}

onMounted(() => {
  void rowHighlightRulesStore.ensureLoaded()
  void applyFilters()
})
</script>

<style scoped>
.returns-page {
  max-width: 1880px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.returns-hero,
.returns-shell {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.returns-hero {
  padding: 1.5rem 1.65rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  background:
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.18), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 251, 235, 0.9));
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
  font-size: clamp(2rem, 4vw, 3.15rem);
  line-height: 1;
  color: #0f172a;
  font-weight: 900;
}

.returns-hero__copy {
  margin: 0.8rem 0 0;
  max-width: 64ch;
  color: #475569;
}

.returns-hero__summary {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.summary-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(255, 255, 255, 0.88);
  font-weight: 700;
  color: #475569;
}

.returns-shell {
  padding: 1rem;
  display: grid;
  gap: 1rem;
}

.returns-filter-shell {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.sheet-wrap {
  overflow-x: auto;
  padding-bottom: 0.25rem;
}

.returns-sheet {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.returns-sheet th,
.returns-sheet td {
  padding: 1rem 0.75rem;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid #e2e8f0;
}

.returns-sheet th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f8fafc;
  color: #0f766e;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.74rem;
  font-weight: 800;
}

.cell-order {
  min-width: 210px;
}

.cell-date {
  min-width: 130px;
}

.cell-status {
  min-width: 130px;
}

.cell-product {
  min-width: 300px;
}

.cell-customer {
  min-width: 180px;
}

.cell-phone,
.cell-city {
  min-width: 140px;
}

.cell-quantity,
.cell-size {
  min-width: 110px;
}

.cell-notes {
  min-width: 300px;
  max-width: 300px;
  white-space: normal;
  word-break: break-word;
}

.cell-toggle {
  min-width: 180px;
}

.cell-reason,
.cell-followup {
  min-width: 340px;
}

.cell-actions {
  min-width: 150px;
}

.order-id-line {
  font-weight: 800;
  color: #0f172a;
}

.order-subline {
  margin-top: 0.35rem;
  color: #64748b;
  font-size: 0.95rem;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: #dcfce7;
  color: #166534;
  font-weight: 700;
  text-transform: capitalize;
}

.product-title {
  color: #0f172a;
  font-weight: 700;
  line-height: 1.45;
  white-space: normal;
  word-break: break-word;
}

.sheet-textarea {
  width: 100%;
  min-height: 5.5rem;
  resize: vertical;
  border-radius: 18px;
  border: 1px solid #cbd5e1;
  padding: 0.85rem 0.95rem;
  font: inherit;
  color: #0f172a;
  background: #ffffff;
}

.sheet-textarea:focus {
  outline: none;
  border-color: #0f766e;
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
}

.filter-input {
  min-width: 240px;
  min-height: 3rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #ffffff;
  color: #0f172a;
  padding: 0.75rem 0.85rem;
  font: inherit;
}

.filter-button {
  min-height: 3rem;
  padding: 0 1.2rem;
  border-radius: 14px;
  border: 0;
  background: #0f766e;
  color: #ffffff;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.filter-button:disabled,
.filter-input:disabled {
  opacity: 0.7;
  cursor: wait;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.toggle input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.toggle__track {
  width: 3.25rem;
  height: 1.85rem;
  border-radius: 999px;
  background: #cbd5e1;
  padding: 0.2rem;
  transition: background 160ms ease;
}

.toggle__thumb {
  display: block;
  width: 1.45rem;
  height: 1.45rem;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.18);
  transition: transform 160ms ease;
}

.toggle input:checked + .toggle__track {
  background: #0f766e;
}

.toggle input:checked + .toggle__track .toggle__thumb {
  transform: translateX(1.4rem);
}

.toggle__label {
  font-weight: 700;
  color: #0f172a;
}

.toggle--saving {
  opacity: 0.7;
}

.save-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 110px;
  min-height: 2.8rem;
  border: 0;
  border-radius: 999px;
  background: #0f766e;
  color: #ffffff;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.save-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.view-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 110px;
  min-height: 2.8rem;
  margin-top: 0.6rem;
  border-radius: 999px;
  background: #e2e8f0;
  color: #1d4ed8;
  font-weight: 800;
  text-decoration: none;
}

.row-feedback {
  margin: 0.5rem 0 0;
  font-size: 0.88rem;
  color: #0f766e;
  max-width: 14rem;
}

.empty-state {
  padding: 3rem 1rem;
  text-align: center;
  color: #64748b;
  font-weight: 600;
}

@media (max-width: 900px) {
  .returns-hero {
    flex-direction: column;
  }

  .returns-hero__summary {
    justify-content: flex-start;
  }

  .returns-filter-shell {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
