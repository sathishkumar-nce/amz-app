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
        <div class="bulk-toolbar">
          <label class="bulk-toolbar__select-all">
            <input
              :checked="allVisibleRowsSelected"
              type="checkbox"
              @change="toggleVisibleRowsSelection(($event.target as HTMLInputElement).checked)"
            />
            <span>Select visible rows</span>
          </label>
          <span class="bulk-toolbar__count">{{ selectedVisibleRowCount }} selected</span>
          <select v-model="bulkOrderStatus" class="sheet-input bulk-toolbar__status">
            <option value="">Bulk order status</option>
            <option value="received">received</option>
            <option value="manufactured">manufactured</option>
            <option value="cancelled">cancelled</option>
            <option value="returned">returned</option>
          </select>
          <button
            type="button"
            class="action-button action-button--inline"
            :disabled="bulkSaving || !bulkOrderStatus || selectedVisibleRowCount === 0"
            @click="applyBulkStatusUpdate"
          >
            {{ bulkSaving ? 'Updating...' : 'Update Selected Status' }}
          </button>
          <span v-if="bulkFeedback" class="bulk-toolbar__feedback">{{ bulkFeedback }}</span>
        </div>

        <ListUtilityBar
          :total="ordersStore.pagination.total"
          :page="ordersStore.pagination.page"
          :total-pages="ordersStore.pagination.totalPages"
          item-label="orders"
          editable
          helper-text="Use the quick inch chips for faster dimension updates"
        />
        <div ref="sheetWrapRef" class="sheet-wrap">
          <table class="cnc-sheet">
          <thead>
            <tr>
              <th class="cell-check">
                <input
                  :checked="allVisibleRowsSelected"
                  type="checkbox"
                  @change="toggleVisibleRowsSelection(($event.target as HTMLInputElement).checked)"
                />
              </th>
              <th>Order ID</th>
              <th>
                <SortableHeader label="Confirmed Date" :direction="sortState.key === 'confirmed_date' ? sortState.direction : null" @sort="setSort('confirmed_date', $event)" />
              </th>
              <th>Updated At</th>
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
              <td class="cell-check">
                <input
                  :checked="isRowSelected(row.rowKey)"
                  type="checkbox"
                  @change="setRowSelected(row.rowKey, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <td class="cell-order">
                <div class="order-id-line">{{ row.order.amazon_order_id }}</div>
                <div class="order-subline">BL #{{ row.order.baselinker_order_id }}</div>
              </td>
              <td>{{ formatDate(row.order.date_confirmed || row.order.date_add) }}</td>
              <td>{{ formatDateTime(row.product.updated_at || row.order.updated_at) }}</td>
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
                    @click="applyInchIncrement(row, 'customer_width_in_inches', step)"
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
                    @click="applyInchIncrement(row, 'customer_length_in_inches', step)"
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
                  @input="scheduleMmFieldAutoSave(row)"
                />
                <div class="increment-row">
                  <button type="button" class="increment-button increment-button--indicator" disabled>
                    {{ formatInchDifference(row.productEdit, 'customer_width_in_inches') }}
                  </button>
                </div>
              </td>
              <td class="cell-mm">
                <input
                  v-model="row.productEdit.customer_length_in_mm"
                  type="number"
                  step="0.01"
                  class="sheet-input sheet-input--mm"
                  placeholder="Length mm"
                  @input="scheduleMmFieldAutoSave(row)"
                />
                <div class="increment-row">
                  <button type="button" class="increment-button increment-button--indicator" disabled>
                    {{ formatInchDifference(row.productEdit, 'customer_length_in_inches') }}
                  </button>
                </div>
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
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ordersApi } from '@/api/orders'
import ListUtilityBar from '@/components/ListUtilityBar.vue'
import OrderListFilterBar from '@/components/OrderListFilterBar.vue'
import OrderSearchBar from '@/components/OrderSearchBar.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import SortableHeader from '@/components/SortableHeader.vue'
import StickyHorizontalScrollbar from '@/components/StickyHorizontalScrollbar.vue'
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
const incrementSteps = [0, 0.1, 0.2, 0.25, 0.5, 0.75, 1]
const SAVE_TIMEOUT_MS = 15000
const AUTO_SAVE_DEBOUNCE_MS = 500
const productEdits = reactive<Record<string, ProductEditRow>>({})
const orderEdits = reactive<Record<string, OrderEditRow>>({})
const savingProducts = reactive<Record<string, boolean>>({})
const productFeedback = reactive<Record<string, string>>({})
const selectedRows = reactive<Record<string, boolean>>({})
const bulkOrderStatus = ref('')
const bulkSaving = ref(false)
const bulkFeedback = ref('')
const sheetWrapRef = ref<HTMLElement | null>(null)
const autoSaveTimers = new Map<string, number>()
const autoSaveRowCache = new Map<string, VisibleRow>()
const queuedAutoSaveKeys = new Set<string>()
const activeSavePromises = new Map<string, Promise<void>>()

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
const formatDateTime = (dateString?: string | null) => formatStandardDate(dateString)
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

const clearAutoSaveTimer = (rowKey: string) => {
  const timerId = autoSaveTimers.get(rowKey)
  if (timerId == null) return
  window.clearTimeout(timerId)
  autoSaveTimers.delete(rowKey)
}

const queueAutoSave = (rowKey: string, delay = AUTO_SAVE_DEBOUNCE_MS) => {
  clearAutoSaveTimer(rowKey)
  autoSaveTimers.set(
    rowKey,
    window.setTimeout(() => {
      autoSaveTimers.delete(rowKey)
      if (activeSavePromises.has(rowKey)) {
        queuedAutoSaveKeys.add(rowKey)
        return
      }
      void autoSaveProductRowByKey(rowKey)
    }, delay),
  )
}

const scheduleMmFieldAutoSave = (row: VisibleRow) => {
  autoSaveRowCache.set(row.rowKey, row)
  queueAutoSave(row.rowKey)
}

const applyInchIncrement = (
  row: VisibleRow,
  field: 'customer_width_in_inches' | 'customer_length_in_inches',
  delta: number,
) => {
  const edit = row.productEdit
  const mmField = field === 'customer_width_in_inches' ? 'customer_width_in_mm' : 'customer_length_in_mm'
  const currentInches = Number(edit[field] || 0)
  const nextInches = currentInches + delta
  edit[mmField] = roundForInput(nextInches * 25.4)
  scheduleMmFieldAutoSave(row)
}

const formatInchDifference = (
  edit: ProductEditRow,
  field: 'customer_width_in_inches' | 'customer_length_in_inches',
) => {
  const mmField = field === 'customer_width_in_inches' ? 'customer_width_in_mm' : 'customer_length_in_mm'
  const mmValue = edit[mmField]

  if (!mmValue || Number.isNaN(Number(mmValue))) {
    return '+0.00 in'
  }

  const inches = Number(edit[field] || 0)
  const delta = Number(mmValue) / 25.4 - (Number.isFinite(inches) ? inches : 0)
  const normalized = Math.abs(delta) < 0.005 ? 0 : Math.round(delta * 100) / 100
  const sign = normalized >= 0 ? '+' : '-'
  return `${sign}${Math.abs(normalized).toFixed(2)} in`
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

const rowLookup = computed(() => {
  const lookup = new Map<string, SheetRow>()
  for (const row of sheetRows.value) {
    lookup.set(row.rowKey, row)
  }
  return lookup
})

const selectedVisibleRows = computed(() => visibleRows.value.filter((row) => Boolean(selectedRows[row.rowKey])))
const selectedVisibleRowCount = computed(() => selectedVisibleRows.value.length)
const allVisibleRowsSelected = computed(() => visibleRows.value.length > 0 && selectedVisibleRows.value.length === visibleRows.value.length)

const isRowSelected = (rowKey: string) => Boolean(selectedRows[rowKey])

const setRowSelected = (rowKey: string, checked: boolean) => {
  if (checked) {
    selectedRows[rowKey] = true
    return
  }
  delete selectedRows[rowKey]
}

const toggleVisibleRowsSelection = (checked: boolean) => {
  for (const row of visibleRows.value) {
    setRowSelected(row.rowKey, checked)
  }
}

const pruneRowSelection = (allowedRowKeys: string[]) => {
  const allowed = new Set(allowedRowKeys)
  for (const rowKey of Object.keys(selectedRows)) {
    if (!allowed.has(rowKey)) {
      delete selectedRows[rowKey]
    }
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

const buildProductPayload = (edit: ProductEditRow): UpdateProductManualFieldsRequest => ({
  customer_width_in_inches: toOptionalNumber(edit.customer_width_in_inches),
  customer_length_in_inches: toOptionalNumber(edit.customer_length_in_inches),
  customer_width_in_mm: toOptionalNumber(edit.customer_width_in_mm),
  customer_length_in_mm: toOptionalNumber(edit.customer_length_in_mm),
  corner_radius_and_notes: edit.corner_radius_and_notes || undefined,
})

const resolveRowForSave = (rowKey: string) => rowLookup.value.get(rowKey) ?? autoSaveRowCache.get(rowKey)

const autoSaveProductRowByKey = async (rowKey: string) => {
  if (activeSavePromises.has(rowKey)) {
    queuedAutoSaveKeys.add(rowKey)
    return
  }

  const baseRow = resolveRowForSave(rowKey)
  if (!baseRow) return

  const key = baseRow.rowKey
  const edit = ensureProductEdit(baseRow.order.amazon_order_id, baseRow.product.order_product_id, baseRow.product)

  clearAutoSaveTimer(key)
  queuedAutoSaveKeys.delete(key)

  const request = (async () => {
    try {
      await withTimeout(
        ordersApi.updateProductManualFields(baseRow.order.amazon_order_id, baseRow.product.order_product_id, buildProductPayload(edit)),
        SAVE_TIMEOUT_MS,
      )
    } catch (error: any) {
      productFeedback[key] = error.response?.data?.error || error.message || 'Auto-save failed'
    } finally {
      activeSavePromises.delete(key)
      if (queuedAutoSaveKeys.has(key)) {
        queuedAutoSaveKeys.delete(key)
        queueAutoSave(key, 0)
        return
      }
      autoSaveRowCache.delete(key)
    }
  })()

  activeSavePromises.set(key, request)
  await request
}

const saveProductRowByKey = async (rowKey: string) => {
  const existingRequest = activeSavePromises.get(rowKey)
  if (existingRequest) {
    await existingRequest
  }

  const cachedRow = autoSaveRowCache.get(rowKey)
  const baseRow = rowLookup.value.get(rowKey) ?? cachedRow
  if (!baseRow) return

  const key = baseRow.rowKey
  const edit = ensureProductEdit(baseRow.order.amazon_order_id, baseRow.product.order_product_id, baseRow.product)
  const orderEdit = ensureOrderEdit(baseRow.order)

  clearAutoSaveTimer(key)
  queuedAutoSaveKeys.delete(key)
  const request = (async () => {
    savingProducts[key] = true
    productFeedback[key] = ''

    try {
      const orderPayload: UpdateManualFieldsRequest = {
        order_status: orderEdit.order_status || 'received',
      }

      await withTimeout(
        ordersStore.updateOrderManualFields(baseRow.order.amazon_order_id, orderPayload),
        SAVE_TIMEOUT_MS,
      )

      const updated = await withTimeout(
        ordersStore.updateProductManualFields(baseRow.order.amazon_order_id, baseRow.product.order_product_id, buildProductPayload(edit)),
        SAVE_TIMEOUT_MS,
      )
      const updatedProduct = updated?.products?.find((product) => product.order_product_id === baseRow.product.order_product_id)
      if (updatedProduct) {
        productEdits[key] = buildProductEdit(updatedProduct)
      }
      orderEdits[baseRow.order.amazon_order_id] = buildOrderEdit(updated)
      productFeedback[key] = 'Saved'
    } catch (error: any) {
      productFeedback[key] = error.response?.data?.error || error.message || 'Save failed'
    } finally {
      savingProducts[key] = false
      activeSavePromises.delete(key)
      if (queuedAutoSaveKeys.has(key)) {
        queuedAutoSaveKeys.delete(key)
        queueAutoSave(key, 0)
        return
      }
      autoSaveRowCache.delete(key)
    }
  })()

  activeSavePromises.set(key, request)
  await request
}

const saveProductRow = async (row: VisibleRow) => {
  await saveProductRowByKey(row.rowKey)
}

const applyBulkStatusUpdate = async () => {
  if (!bulkOrderStatus.value || selectedVisibleRows.value.length === 0) return

  bulkSaving.value = true
  bulkFeedback.value = ''

  try {
    const selectedRowCount = selectedVisibleRows.value.length
    const uniqueOrderIds = [...new Set(selectedVisibleRows.value.map((row) => row.order.amazon_order_id))]
    for (const amazonOrderId of uniqueOrderIds) {
      const updated = await withTimeout(
        ordersStore.updateOrderManualFields(amazonOrderId, {
          order_status: bulkOrderStatus.value,
        }),
        SAVE_TIMEOUT_MS,
      )
      orderEdits[amazonOrderId] = buildOrderEdit(updated)
    }

    syncProductEdits()
    bulkFeedback.value = `Updated ${selectedRowCount} selected rows across ${uniqueOrderIds.length} orders`
  } catch (error: any) {
    bulkFeedback.value = error.response?.data?.error || error.message || 'Bulk update failed'
  } finally {
    bulkSaving.value = false
  }
}

watch(
  () => visibleRows.value.map((row) => row.rowKey),
  (rowKeys) => {
    pruneRowSelection(rowKeys)
  },
  { immediate: true },
)

onMounted(() => {
  void rowHighlightRulesStore.ensureLoaded()
  void applyFilters()
})

onBeforeUnmount(() => {
  for (const timerId of autoSaveTimers.values()) {
    window.clearTimeout(timerId)
  }
  autoSaveTimers.clear()
  autoSaveRowCache.clear()
  queuedAutoSaveKeys.clear()
  activeSavePromises.clear()
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

.action-button--inline {
  width: auto;
  min-width: 13rem;
  padding: 0 1rem;
}

.cnc-shell {
  padding: 0.8rem;
}

.bulk-toolbar {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
  margin-bottom: 0.9rem;
}

.bulk-toolbar__select-all {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  color: #0f172a;
}

.bulk-toolbar__count,
.bulk-toolbar__feedback {
  font-size: 0.88rem;
  font-weight: 700;
  color: #475569;
}

.sheet-input.bulk-toolbar__status {
  flex: 0 0 clamp(11rem, 16vw, 13rem);
  width: clamp(11rem, 16vw, 13rem);
  max-width: 100%;
}

.sheet-wrap {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pan-y;
  padding-bottom: 0.35rem;
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

.cell-check {
  width: 3.4rem;
  min-width: 3.4rem;
  text-align: center;
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

.increment-button--indicator {
  min-width: 5.75rem;
  justify-content: center;
  background: #e2e8f0;
  color: #334155;
  cursor: default;
}

.increment-button--indicator:disabled {
  opacity: 1;
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

  .bulk-toolbar {
    align-items: stretch;
  }

  .sheet-input.bulk-toolbar__status,
  .action-button--inline {
    width: 100%;
  }
}
</style>
