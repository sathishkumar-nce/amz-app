<template>
  <div class="cnc-page">
    <section class="cnc-hero">
      <div>
        <p class="eyebrow">CNC operator board</p>
        <h1>CNC Cut Queue</h1>
        <p class="cnc-hero__copy">
          Product-first view for machining work. Adjust customer size inputs inline, use quick inch offsets, and save each row without leaving the board.
        </p>
      </div>
      <div class="cnc-hero__summary">
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
    />

    <section class="cnc-shell">
      <div v-if="ordersStore.loading" class="empty-state">Loading CNC queue...</div>
      <div v-else-if="visibleRows.length === 0" class="empty-state">No CNC rows found.</div>

      <template v-else>
        <ListUtilityBar
          :total="ordersStore.pagination.total"
          :page="ordersStore.pagination.page"
          :total-pages="ordersStore.pagination.totalPages"
          item-label="orders"
          editable
          helper-text="Use the quick inch chips for faster dimension updates"
        />
        <div class="sheet-wrap">
          <table class="cnc-sheet">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>
                <SortableHeader label="Confirmed Date" :direction="sortState.key === 'confirmed_date' ? sortState.direction : null" @sort="setSort('confirmed_date', $event)" />
              </th>
              <th>
                <SortableHeader label="Order Status" :direction="sortState.key === 'order_status' ? sortState.direction : null" @sort="setSort('order_status', $event)" />
              </th>
              <th>Products</th>
              <th>
                <SortableHeader label="Quantity" :direction="sortState.key === 'quantity' ? sortState.direction : null" @sort="setSort('quantity', $event)" />
              </th>
              <th>
                <SortableHeader label="Thickness" :direction="sortState.key === 'thickness' ? sortState.direction : null" @sort="setSort('thickness', $event)" />
              </th>
              <th>Round Product</th>
              <th>
                <SortableHeader label="SKU" :direction="sortState.key === 'sku' ? sortState.direction : null" @sort="setSort('sku', $event)" />
              </th>
              <th>
                <SortableHeader label="Default Width (in)" :direction="sortState.key === 'default_width_in' ? sortState.direction : null" @sort="setSort('default_width_in', $event)" />
              </th>
              <th>
                <SortableHeader label="Default Length (in)" :direction="sortState.key === 'default_length_in' ? sortState.direction : null" @sort="setSort('default_length_in', $event)" />
              </th>
              <th>Default Width (mm)</th>
              <th>Default Length (mm)</th>
              <th>Customer Width (in)</th>
              <th>Customer Length (in)</th>
              <th>Customer Width (mm)</th>
              <th>Customer Length (mm)</th>
              <th>Corner Radius and Notes</th>
              <th>Order Status</th>
              <th>Customer</th>
              <th>City</th>
              <th>Actions</th>
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
              <td class="cell-product">
                <div class="product-title">{{ row.product.name || 'Unnamed product' }}</div>
              </td>
              <td class="cell-quantity">{{ formatNumber(row.product.quantity) }}</td>
              <td>{{ row.product.thickness || 'Not set' }}</td>
              <td><span class="status-pill">{{ row.product.is_round ? 'Yes' : 'No' }}</span></td>
              <td>{{ row.product.sku || 'Not set' }}</td>
              <td>{{ formatNumber(row.product.default_width_in_inches) }}</td>
              <td>{{ formatNumber(row.product.default_length_in_inches) }}</td>
              <td>{{ formatNumber(row.product.default_width_in_mm) }}</td>
              <td>{{ formatNumber(row.product.default_length_in_mm) }}</td>

              <td class="cell-input-group">
                <input
                  v-model="row.productEdit.customer_width_in_inches"
                  type="number"
                  step="0.01"
                  class="sheet-input"
                  placeholder="Width in"
                />
                <div class="increment-row">
                  <button
                    v-for="step in incrementSteps"
                    :key="`width-${step}`"
                    @click="applyInchIncrement(row.productEdit, 'customer_width_in_inches', step)"
                    type="button"
                    class="increment-button"
                  >
                    +{{ step.toFixed(2) }}
                  </button>
                </div>
              </td>

              <td class="cell-input-group">
                <input
                  v-model="row.productEdit.customer_length_in_inches"
                  type="number"
                  step="0.01"
                  class="sheet-input"
                  placeholder="Length in"
                />
                <div class="increment-row">
                  <button
                    v-for="step in incrementSteps"
                    :key="`length-${step}`"
                    @click="applyInchIncrement(row.productEdit, 'customer_length_in_inches', step)"
                    type="button"
                    class="increment-button"
                  >
                    +{{ step.toFixed(2) }}
                  </button>
                </div>
              </td>

              <td class="cell-mm">
                <input
                  v-model="row.productEdit.customer_width_in_mm"
                  type="number"
                  step="0.01"
                  class="sheet-input sheet-input--mm"
                  placeholder="Width mm"
                />
              </td>
              <td class="cell-mm">
                <input
                  v-model="row.productEdit.customer_length_in_mm"
                  type="number"
                  step="0.01"
                  class="sheet-input sheet-input--mm"
                  placeholder="Length mm"
                />
              </td>
              <td class="cell-notes">
                <textarea
                  v-model="row.productEdit.corner_radius_and_notes"
                  rows="3"
                  class="sheet-textarea"
                  placeholder="Corner radius and notes"
                />
              </td>
              <td class="cell-status-edit">
                <select v-model="row.orderEdit.order_status" class="sheet-input">
                  <option value="received">received</option>
                  <option value="manufactured">manufactured</option>
                  <option value="cancelled">cancelled</option>
                  <option value="returned">returned</option>
                </select>
              </td>
              <td>{{ formatText(row.order.delivery_fullname || row.order.user_login) }}</td>
              <td>{{ formatText(row.order.delivery_city) }}</td>
              <td class="cell-actions">
                <button
                  type="button"
                  @click.stop.prevent="saveProductRow(row)"
                  :disabled="savingProducts[row.rowKey]"
                  class="save-button"
                >
                  {{ savingProducts[row.rowKey] ? 'Saving...' : 'Save' }}
                </button>
                <router-link :to="`/orders/${row.order.amazon_order_id}`" class="view-link">View</router-link>
                <p v-if="productFeedback[row.rowKey]" class="product-feedback">{{ productFeedback[row.rowKey] }}</p>
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
        @limit-change="changeLimit"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import ListUtilityBar from '@/components/ListUtilityBar.vue'
import OrderListFilterBar from '@/components/OrderListFilterBar.vue'
import OrderSearchBar from '@/components/OrderSearchBar.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import SortableHeader from '@/components/SortableHeader.vue'
import { useAmazonRowHighlightRulesStore } from '@/stores/amazonRowHighlightRules'
import { useOrdersStore } from '@/stores/orders'
import type { Order, OrderProduct, UpdateManualFieldsRequest, UpdateProductManualFieldsRequest } from '@/types'
import { buildOrderListAdvancedRequest, createOrderListAdvancedFilters } from '@/utils/orderListFilters'
import { formatStandardDate } from '@/utils/orderData'
import { sortItems, type SortDirection } from '@/utils/tableSort'

type ProductEditRow = {
  customer_width_in_inches: string
  customer_length_in_inches: string
  customer_width_in_mm: string
  customer_length_in_mm: string
  corner_radius_and_notes: string
}

type OrderEditRow = {
  order_status: string
}

type SheetRow = {
  rowKey: string
  order: Order
  product: OrderProduct
}

type VisibleRow = SheetRow & {
  productEdit: ProductEditRow
  orderEdit: OrderEditRow
}

type SortKey =
  | 'confirmed_date'
  | 'order_status'
  | 'quantity'
  | 'thickness'
  | 'sku'
  | 'default_width_in'
  | 'default_length_in'

const ordersStore = useOrdersStore()
const rowHighlightRulesStore = useAmazonRowHighlightRulesStore()
const filters = ref({
  page: 1,
  limit: 200,
})
const advancedFilters = ref(createOrderListAdvancedFilters())
const searchOperator = ref<'gt' | 'gte' | 'lt' | 'lte' | 'eq'>('gte')
const sortState = ref<{ key: SortKey | null; direction: SortDirection }>({
  key: null,
  direction: 'asc',
})
const searchKey = ref('order_id')
const searchValue = ref('')
const incrementSteps = [0, 0.25, 0.5, 0.75, 1]
const SAVE_TIMEOUT_MS = 15000
const AUTO_REFRESH_MS = 15000

const productEdits = reactive<Record<string, ProductEditRow>>({})
const orderEdits = reactive<Record<string, OrderEditRow>>({})
const savingProducts = reactive<Record<string, boolean>>({})
const productFeedback = reactive<Record<string, string>>({})
let autoRefreshTimer: ReturnType<typeof window.setInterval> | null = null

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

const buildProductEdit = (product: OrderProduct): ProductEditRow => ({
  customer_width_in_inches: numberToString(product.customer_width_in_inches),
  customer_length_in_inches: numberToString(product.customer_length_in_inches),
  customer_width_in_mm: numberToString(product.customer_width_in_mm),
  customer_length_in_mm: numberToString(product.customer_length_in_mm),
  corner_radius_and_notes: product.corner_radius_and_notes ?? '',
})

const buildOrderEdit = (order: Order): OrderEditRow => ({
  order_status: order.order_status || 'received',
})

const ensureProductEdit = (amazonOrderId: string, orderProductId: number, product: OrderProduct) => {
  const key = productKey(amazonOrderId, orderProductId)
  if (!productEdits[key]) {
    productEdits[key] = buildProductEdit(product)
  }
  return productEdits[key] as ProductEditRow
}

const ensureOrderEdit = (order: Order) => {
  if (!orderEdits[order.amazon_order_id]) {
    orderEdits[order.amazon_order_id] = buildOrderEdit(order)
  }
  return orderEdits[order.amazon_order_id] as OrderEditRow
}

const syncProductEdits = () => {
  for (const order of ordersStore.orders) {
    orderEdits[order.amazon_order_id] = buildOrderEdit(order)
    for (const product of order.products || []) {
      const key = productKey(order.amazon_order_id, product.order_product_id)
      productEdits[key] = buildProductEdit(product)
      savingProducts[key] = false
      productFeedback[key] = ''
    }
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

const roundForInput = (value: number) => {
  const rounded = Math.round(value * 100) / 100
  return rounded.toFixed(2)
}

const applyInchIncrement = (
  edit: ProductEditRow,
  field: 'customer_width_in_inches' | 'customer_length_in_inches',
  delta: number,
) => {
  const mmField = field === 'customer_width_in_inches' ? 'customer_width_in_mm' : 'customer_length_in_mm'
  const currentInches = Number(edit[field] || 0)
  const currentMM = Number(edit[mmField] || 0)
  const baseMM = Number.isFinite(currentMM) && currentMM > 0 ? currentMM : currentInches * 25.4
  const nextMM = baseMM + (delta * 25.4)

  edit[mmField] = roundForInput(nextMM)
}

const getRowStyle = (row: SheetRow) => rowHighlightRulesStore.getRowHighlightStyle(row.order, [row.product])
const setSort = (key: SortKey, direction: SortDirection) => {
  sortState.value = { key, direction }
}

const visibleRows = computed<VisibleRow[]>(() => {
  const rows = sheetRows.value
    .map((row) => ({
      ...row,
      productEdit: ensureProductEdit(row.order.amazon_order_id, row.product.order_product_id, row.product),
      orderEdit: ensureOrderEdit(row.order),
    }))

  if (!sortState.value.key) return rows

  return sortItems(rows, (row) => {
    switch (sortState.value.key) {
      case 'confirmed_date':
        return row.order.date_confirmed || row.order.date_add || ''
      case 'order_status':
        return row.order.order_status || ''
      case 'quantity':
        return row.product.quantity
      case 'thickness':
        return row.product.thickness || ''
      case 'sku':
        return row.product.sku || ''
      case 'default_width_in':
        return row.product.default_width_in_inches
      case 'default_length_in':
        return row.product.default_length_in_inches
      default:
        return ''
    }
  }, sortState.value.direction)
})

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

const applyFilters = async () => {
  await ordersStore.fetchOrders({
    page: filters.value.page,
    limit: filters.value.limit,
    search_key: searchKey.value,
    search_value: searchValue.value.trim() || undefined,
    search_operator: searchOperator.value,
    ...buildSearchFilters(),
    ...buildOrderListAdvancedRequest(advancedFilters.value),
  })
  syncProductEdits()
}

const hasPendingProductSave = () => Object.values(savingProducts).some(Boolean)

const runAutoRefresh = async () => {
  if (document.hidden || ordersStore.loading || hasPendingProductSave()) {
    return
  }
  await applyFilters()
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

const saveProductRow = async (row: VisibleRow) => {
  const key = row.rowKey
  const edit = row.productEdit
  if (!edit) return

  savingProducts[key] = true
  productFeedback[key] = ''

  try {
    const payload: UpdateProductManualFieldsRequest = {
      customer_width_in_inches: toOptionalNumber(edit.customer_width_in_inches),
      customer_length_in_inches: toOptionalNumber(edit.customer_length_in_inches),
      customer_width_in_mm: toOptionalNumber(edit.customer_width_in_mm),
      customer_length_in_mm: toOptionalNumber(edit.customer_length_in_mm),
      corner_radius_and_notes: edit.corner_radius_and_notes || undefined,
    }
    const orderPayload: UpdateManualFieldsRequest = {
      order_status: row.orderEdit.order_status || 'received',
    }

    await withTimeout(
      ordersStore.updateOrderManualFields(row.order.amazon_order_id, orderPayload),
      SAVE_TIMEOUT_MS,
    )

    const updated = await withTimeout(
      ordersStore.updateProductManualFields(row.order.amazon_order_id, row.product.order_product_id, payload),
      SAVE_TIMEOUT_MS,
    )
    const updatedProduct = updated?.products?.find((product) => product.order_product_id === row.product.order_product_id)
    if (updatedProduct) {
      productEdits[key] = buildProductEdit(updatedProduct)
    }
    orderEdits[row.order.amazon_order_id] = buildOrderEdit(updated)
    productFeedback[key] = 'Saved'
  } catch (error: any) {
    productFeedback[key] = error.response?.data?.error || error.message || 'Save failed'
  } finally {
    savingProducts[key] = false
  }
}

onMounted(() => {
  void rowHighlightRulesStore.ensureLoaded()
  void applyFilters()
  autoRefreshTimer = window.setInterval(() => {
    void runAutoRefresh()
  }, AUTO_REFRESH_MS)
})

onBeforeUnmount(() => {
  if (autoRefreshTimer != null) {
    window.clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
})
</script>

<style scoped>
.cnc-page {
  max-width: 1820px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.cnc-hero,
.cnc-filters,
.cnc-shell {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.cnc-hero {
  padding: 1.5rem 1.65rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.16), transparent 32%),
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
  font-size: clamp(2rem, 3.8vw, 3.2rem);
  line-height: 1;
  color: #0f172a;
  font-weight: 900;
}

.cnc-hero__copy {
  margin: 0.8rem 0 0;
  max-width: 64ch;
  color: #475569;
}

.cnc-hero__summary {
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
  background: #e0f2fe;
  color: #075985;
}

.cnc-filters {
  padding: 1rem;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
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
  padding: 0.75rem 0.85rem;
  font: inherit;
}

.sheet-textarea {
  min-height: 5.4rem;
  min-width: 16rem;
  resize: vertical;
}

.action-button,
.save-button,
.increment-button {
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

.cnc-shell {
  padding: 0.8rem;
  content-visibility: auto;
  contain-intrinsic-size: 860px;
}

.sheet-wrap {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pan-y;
}

.cnc-sheet {
  width: 100%;
  min-width: 1980px;
  border-collapse: separate;
  border-spacing: 0;
}

.cnc-sheet th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0.85rem 0.7rem;
  text-align: left;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #0f766e;
  background: #f8fafc;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
}

.cell-status-edit {
  min-width: 170px;
}

.cnc-sheet td {
  padding: 0.85rem 0.7rem;
  vertical-align: top;
  border-bottom: 1px solid rgba(226, 232, 240, 0.85);
  color: #0f172a;
  background: var(--row-highlight-background, rgba(255, 255, 255, 0.9));
}

.cell-order {
  min-width: 16rem;
}

.order-id-line {
  font-size: 1rem;
  font-weight: 900;
  white-space: nowrap;
}

.order-subline {
  margin-top: 0.3rem;
  color: #64748b;
  font-size: 0.88rem;
}

.cell-product {
  min-width: 18rem;
}

.product-title {
  font-weight: 700;
  line-height: 1.45;
}

.cell-quantity {
  font-weight: 800;
}

.cell-input-group {
  min-width: 14rem;
}

.cell-mm {
  min-width: 10rem;
}

.sheet-input--mm {
  min-width: 8.75rem;
}

.increment-row {
  margin-top: 0.45rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.increment-button {
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  padding: 0.28rem 0.55rem;
  font-size: 0.73rem;
  font-weight: 800;
}

.cell-actions {
  min-width: 9rem;
}

.cell-notes {
  min-width: 18rem;
}

.save-button,
.view-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 2.7rem;
  border-radius: 14px;
  font-weight: 800;
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

@media (max-width: 1200px) {
  .cnc-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cnc-hero {
    flex-direction: column;
  }
}

@media (max-width: 680px) {
  .cnc-filters {
    grid-template-columns: 1fr;
  }
}
</style>
