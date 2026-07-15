<template>
  <div class="confirm-page">
    <section class="confirm-hero">
      <div>
        <p class="eyebrow">Order extractor confirmation</p>
        <h1>Order Extract Confirm</h1>
        <p class="confirm-hero__copy">
          Paste raw marketplace text, extract only Amazon order IDs, and review matching confirmation rows in the same source order.
        </p>
      </div>
      <div class="confirm-hero__summary">
        <span class="summary-pill">{{ extractedOrderIds.length }} IDs extracted</span>
        <span class="summary-pill">{{ matchedOrderCount }} orders matched</span>
        <span class="summary-pill">{{ filteredRows.length }} product rows loaded</span>
        <span v-if="missingOrderIds.length" class="summary-pill summary-pill--warning">{{ missingOrderIds.length }} missing</span>
      </div>
    </section>

    <section class="extractor-card">
      <div class="extractor-card__header">
        <div>
          <h2>Paste Raw Text</h2>
          <p>Paste the copied seller page text here. The app extracts order IDs like <code>407-8940818-4569103</code> and loads only those orders.</p>
        </div>
        <div class="extractor-card__actions">
          <button type="button" class="action-button" :disabled="loadingRows || !rawText.trim()" @click="extractAndLoadOrders">
            {{ loadingRows ? 'Loading...' : 'Extract Orders' }}
          </button>
          <button type="button" class="toggle-button" :disabled="loadingRows || !rawText" @click="clearExtractor">
            Clear
          </button>
        </div>
      </div>

      <textarea
        v-model="rawText"
        class="extractor-textarea"
        rows="12"
        placeholder="Paste raw Amazon orders text here..."
      />

      <p v-if="extractorFeedback" :class="['extractor-message', extractorError ? 'extractor-message--error' : 'extractor-message--info']">
        {{ extractorFeedback }}
      </p>
      <p v-if="missingOrderIds.length" class="extractor-message extractor-message--warning">
        Missing order IDs in DB: {{ missingOrderIds.join(', ') }}
      </p>
    </section>

    <OrderSearchBar
      v-model:searchKey="searchKey"
      v-model:searchValue="searchValue"
      v-model:searchOperator="searchOperator"
      :loading="loadingRows"
      @search="applySearch"
      @clear="clearSearch"
    />

    <OrderListFilterBar
      v-model="advancedFilters"
      :loading="loadingRows"
      @apply="applySearch"
      @clear="clearSearch"
    />

    <section class="confirm-shell">
      <div v-if="loadingRows" class="empty-state">Extracting IDs and loading matching rows...</div>
      <div v-else-if="!extractedOrderIds.length" class="empty-state">Paste raw text to extract order IDs and build the confirmation queue.</div>
      <div v-else-if="filteredRows.length === 0" class="empty-state">No matching confirmation rows found in the currently loaded extracted orders.</div>

      <template v-else>
        <ListUtilityBar
          :total="filteredRows.length"
          :page="pagination.page"
          :total-pages="totalPages"
          item-label="product rows"
          editable
          helper-text="Search and filters on this screen work only on the currently extracted rows"
        />
        <div ref="sheetWrapRef" class="sheet-wrap">
          <table class="confirm-sheet">
            <thead>
              <tr>
                <th class="cell-order">Order ID</th>
                <th>
                  <SortableHeader label="Confirmed" :direction="sortState.key === 'confirmed_date' ? sortState.direction : null" @sort="setSort('confirmed_date', $event)" />
                </th>
                <th>
                  <SortableHeader label="Status" :direction="sortState.key === 'order_status' ? sortState.direction : null" @sort="setSort('order_status', $event)" />
                </th>
                <th>Customer</th>
                <th>Phone</th>
                <th>City / State</th>
                <th class="cell-product">Product</th>
                <th class="cell-quantity">
                  <SortableHeader label="Qty" :direction="sortState.key === 'quantity' ? sortState.direction : null" @sort="setSort('quantity', $event)" />
                </th>
                <th>
                  <SortableHeader label="Thickness" :direction="sortState.key === 'thickness' ? sortState.direction : null" @sort="setSort('thickness', $event)" />
                </th>
                <th>
                  <SortableHeader label="SKU" :direction="sortState.key === 'sku' ? sortState.direction : null" @sort="setSort('sku', $event)" />
                </th>
                <th>
                  <SortableHeader label="Priority" :direction="sortState.key === 'priority' ? sortState.direction : null" @sort="setSort('priority', $event)" />
                </th>
                <th>
                  <SortableHeader label="Review %" :direction="sortState.key === 'review_confidence' ? sortState.direction : null" @sort="setSort('review_confidence', $event)" />
                </th>
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
                <td class="cell-confidence">
                  <input
                    v-model.number="row.edit.review_confidence"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    class="confidence-slider"
                  />
                  <input
                    v-model.number="row.edit.review_confidence"
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    class="sheet-input confidence-number"
                  />
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
                  <button
                    type="button"
                    class="whatsapp-button"
                    :disabled="!canOpenWhatsApp(row.order.phone)"
                    @click.stop.prevent="openWhatsAppTemplate(row.order, 'additional')"
                  >
                    Ask Additional
                  </button>
                  <button
                    type="button"
                    class="whatsapp-button whatsapp-button--alt"
                    :disabled="!canOpenWhatsApp(row.order.phone)"
                    @click.stop.prevent="openWhatsAppTemplate(row.order, 'initial')"
                  >
                    Ask Initial
                  </button>
                  <router-link :to="`/orders/${row.order.amazon_order_id}`" class="view-link">View</router-link>
                  <p v-if="rowFeedback[row.rowKey]" class="product-feedback">{{ rowFeedback[row.rowKey] }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <StickyHorizontalScrollbar :target="sheetWrapRef" always-visible />

        <PaginationControls
          :page="pagination.page"
          :total-pages="totalPages"
          :total="filteredRows.length"
          :limit="pagination.limit"
          item-label="product rows"
          @change="changePage"
          @limit-change="changeLimit"
        />
      </template>
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
import { ordersApi } from '@/api/orders'
import { useAmazonRowHighlightRulesStore } from '@/stores/amazonRowHighlightRules'
import type { Order, OrderedAmazonOrderResult, OrderProduct, UpdateManualFieldsRequest, UpdateProductManualFieldsRequest } from '@/types'
import { createOrderListAdvancedFilters, type OrderListAdvancedFilters } from '@/utils/orderListFilters'
import { formatProductNameForDisplay, formatStandardDate } from '@/utils/orderData'
import { sortItems, type SortDirection } from '@/utils/tableSort'

type SheetRow = {
  rowKey: string
  order: Order
  product: OrderProduct
  extractedIndex: number
}

type VisibleRow = SheetRow & {
  edit: ConfirmationRowEdit
}

type ConfirmationRowEdit = {
  priority: string
  review_confidence: number
  customer_width_in_inches: string
  customer_length_in_inches: string
  corner_radius_and_notes: string
}

type SortKey = 'confirmed_date' | 'order_status' | 'quantity' | 'thickness' | 'sku' | 'priority' | 'review_confidence'
type WhatsAppTemplateKind = 'additional' | 'initial'

const ORDER_ID_PATTERN = /\b\d{3}-\d{7}-\d{7}\b/g
const SAVE_TIMEOUT_MS = 15000

const rowHighlightRulesStore = useAmazonRowHighlightRulesStore()

const rawText = ref('')
const loadingRows = ref(false)
const extractorFeedback = ref('')
const extractorError = ref(false)
const extractedOrderIds = ref<string[]>([])
const lookupResults = ref<OrderedAmazonOrderResult[]>([])
const missingOrderIds = ref<string[]>([])

const pagination = reactive({
  page: 1,
  limit: 200,
})
const advancedFilters = ref(createOrderListAdvancedFilters())
const appliedAdvancedFilters = ref(createOrderListAdvancedFilters())
const searchOperator = ref<'gt' | 'gte' | 'lt' | 'lte' | 'eq'>('gte')
const appliedSearchOperator = ref<'gt' | 'gte' | 'lt' | 'lte' | 'eq'>('gte')
const sortState = ref<{ key: SortKey | null; direction: SortDirection }>({
  key: null,
  direction: 'asc',
})
const searchKey = ref('order_id')
const searchValue = ref('')
const appliedSearchKey = ref('order_id')
const appliedSearchValue = ref('')

const rowEdits = reactive<Record<string, ConfirmationRowEdit>>({})
const savingRows = reactive<Record<string, boolean>>({})
const rowFeedback = reactive<Record<string, string>>({})
const sheetWrapRef = ref<HTMLElement | null>(null)

const matchedOrderCount = computed(() => lookupResults.value.filter((result) => result.found && result.order).length)

const sheetRows = computed<SheetRow[]>(() =>
  lookupResults.value.flatMap((result, extractedIndex) => {
    const order = result.order
    if (!result.found || !order) return []

    return (order.products || [])
      .filter((product) => !product.is_discount_line)
      .map((product) => ({
        rowKey: `${extractedIndex}:${order.amazon_order_id}:${product.order_product_id}`,
        order,
        product,
        extractedIndex,
      }))
  }),
)

const filteredRows = computed<VisibleRow[]>(() => {
  const rows = sheetRows.value
    .filter((row) =>
      matchesVisibleRowFilters(
        row,
        appliedAdvancedFilters.value,
        appliedSearchKey.value,
        appliedSearchValue.value,
        appliedSearchOperator.value,
      ),
    )
    .map((row) => ({
      ...row,
      edit: ensureRowEdit(row),
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
      case 'priority':
        return row.edit.priority || ''
      case 'review_confidence':
        return row.edit.review_confidence
      default:
        return ''
    }
  }, sortState.value.direction)
})

const totalPages = computed(() => {
  if (filteredRows.value.length === 0) return 0
  return Math.max(1, Math.ceil(filteredRows.value.length / pagination.limit))
})

const visibleRows = computed<VisibleRow[]>(() => {
  if (filteredRows.value.length === 0) return []
  const safePage = Math.min(Math.max(pagination.page, 1), totalPages.value)
  const start = (safePage - 1) * pagination.limit
  return filteredRows.value.slice(start, start + pagination.limit)
})

const formatDate = (dateString?: string | null) => formatStandardDate(dateString)
const formatText = (value?: string | null) => value?.trim() || 'Not available'
const formatNumber = (value?: number | null) => (value == null ? 'Not set' : String(value))
const numberToString = (value?: number | null) => (value == null ? '' : String(value))
const formatProductName = formatProductNameForDisplay
const normalizeIndianPhone = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length < 10) return null
  return digits.slice(-10)
}
const canOpenWhatsApp = (value?: string | null) => normalizeIndianPhone(value) !== null
const buildWhatsAppMessage = (orderId: string, kind: WhatsAppTemplateKind) => {
  if (kind === 'additional') {
    return `Hi! 👋

Thank you for taking the time to speak with us.

If you have any additional requirements or customization details beyond what we discussed during our phone conversation for your amazon order id ${orderId}, please feel free to reply to this message. You may also share a photo if it helps illustrate your requirements.

If there are no further details, we'll proceed with your order based on our discussion.

Thank you for choosing *MR.CLEAR*.`
  }

  return `Hi! 👋

Thank you for choosing *MR.CLEAR*.

If you have any additional customization requirements for your table cover order on amazon ${orderId}, please reply to this message or share a photo of your table. If there are no additional requirements, we'll proceed with your order as discussed.

Thank you! 😊`
}
const openWhatsAppTemplate = (order: Order, kind: WhatsAppTemplateKind) => {
  const normalizedPhone = normalizeIndianPhone(order.phone)
  if (!normalizedPhone) {
    return
  }

  const message = buildWhatsAppMessage(order.amazon_order_id, kind)
  const url = `https://web.whatsapp.com/send?phone=91${normalizedPhone}&text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

const buildRowEdit = (row: SheetRow): ConfirmationRowEdit => ({
  priority: row.order.priority || 'p3',
  review_confidence: clampReviewConfidence(row.order.review_confidence),
  customer_width_in_inches: numberToString(row.product.customer_width_in_inches),
  customer_length_in_inches: numberToString(row.product.customer_length_in_inches),
  corner_radius_and_notes: row.product.corner_radius_and_notes ?? '',
})

const clampReviewConfidence = (value?: number | null) => {
  const parsed = Number(value ?? 0)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(100, Math.max(0, Math.round(parsed)))
}

const ensureRowEdit = (row: SheetRow) => {
  if (!rowEdits[row.rowKey]) {
    rowEdits[row.rowKey] = buildRowEdit(row)
  }
  return rowEdits[row.rowKey] as ConfirmationRowEdit
}

const syncRowEdits = () => {
  const nextKeys = new Set(sheetRows.value.map((row) => row.rowKey))

  for (const row of sheetRows.value) {
    rowEdits[row.rowKey] = buildRowEdit(row)
    savingRows[row.rowKey] = false
    rowFeedback[row.rowKey] = rowFeedback[row.rowKey] || ''
  }

  for (const key of Object.keys(rowEdits)) {
    if (!nextKeys.has(key)) delete rowEdits[key]
  }
  for (const key of Object.keys(savingRows)) {
    if (!nextKeys.has(key)) delete savingRows[key]
  }
  for (const key of Object.keys(rowFeedback)) {
    if (!nextKeys.has(key)) delete rowFeedback[key]
  }
}

const extractOrderIdsFromText = (value: string) => value.match(ORDER_ID_PATTERN) || []

const clearExtractor = () => {
  rawText.value = ''
  extractedOrderIds.value = []
  lookupResults.value = []
  missingOrderIds.value = []
  extractorFeedback.value = ''
  extractorError.value = false
  pagination.page = 1
  clearSearch()
}

const extractAndLoadOrders = async () => {
  const nextIds = extractOrderIdsFromText(rawText.value)
  extractedOrderIds.value = nextIds
  pagination.page = 1

  if (nextIds.length === 0) {
    lookupResults.value = []
    missingOrderIds.value = []
    extractorFeedback.value = 'No Amazon order IDs were found in the pasted text.'
    extractorError.value = true
    syncRowEdits()
    return
  }

  loadingRows.value = true
  extractorError.value = false
  extractorFeedback.value = ''

  try {
    const response = await ordersApi.getByIDs(nextIds)
    lookupResults.value = response.results
    missingOrderIds.value = response.missing_amazon_order_ids
    extractorFeedback.value = `Extracted ${nextIds.length} order IDs and matched ${response.results.filter((result) => result.found && result.order).length} orders.`
    syncRowEdits()
  } catch (error: any) {
    lookupResults.value = []
    missingOrderIds.value = []
    extractorFeedback.value = error.response?.data?.error || error.message || 'Failed to load extracted orders.'
    extractorError.value = true
  } finally {
    loadingRows.value = false
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

const setSort = (key: SortKey, direction: SortDirection) => {
  sortState.value = { key, direction }
}

const applySearch = () => {
  appliedSearchKey.value = searchKey.value
  appliedSearchValue.value = searchValue.value.trim()
  appliedSearchOperator.value = searchOperator.value
  appliedAdvancedFilters.value = { ...advancedFilters.value }
  pagination.page = 1
}

const clearSearch = () => {
  searchKey.value = 'order_id'
  searchValue.value = ''
  searchOperator.value = 'gte'
  advancedFilters.value = createOrderListAdvancedFilters()
  appliedSearchKey.value = 'order_id'
  appliedSearchValue.value = ''
  appliedSearchOperator.value = 'gte'
  appliedAdvancedFilters.value = createOrderListAdvancedFilters()
  pagination.page = 1
}

const changePage = (page: number) => {
  if (page === pagination.page) return
  pagination.page = page
}

const changeLimit = (limit: number) => {
  if (limit === pagination.limit) return
  pagination.limit = limit
  pagination.page = 1
}

const syncLookupResultOrder = (amazonOrderId: string, nextOrder: Order) => {
  lookupResults.value = lookupResults.value.map((result) =>
    result.order?.amazon_order_id === amazonOrderId || result.requested_amazon_order_id === amazonOrderId
      ? {
          ...result,
          found: true,
          order: nextOrder,
        }
      : result,
  )
}

const mergeSavedProductIntoOrder = (order: Order, orderProductId: number, edit: ConfirmationRowEdit): Order => {
  const fallbackWidthInches = toOptionalNumber(edit.customer_width_in_inches) ?? null
  const fallbackLengthInches = toOptionalNumber(edit.customer_length_in_inches) ?? null
  const fallbackNotes = edit.corner_radius_and_notes.trim() ? edit.corner_radius_and_notes : null

  return {
    ...order,
    products: (order.products || []).map((product) =>
      product.order_product_id === orderProductId
        ? {
            ...product,
            customer_width_in_inches: product.customer_width_in_inches ?? fallbackWidthInches,
            customer_length_in_inches: product.customer_length_in_inches ?? fallbackLengthInches,
            corner_radius_and_notes: product.corner_radius_and_notes ?? fallbackNotes,
          }
        : product,
    ),
  }
}

const saveRow = async (row: SheetRow) => {
  const edit = rowEdits[row.rowKey]
  if (!edit) return

  savingRows[row.rowKey] = true
  rowFeedback[row.rowKey] = ''

  try {
    const orderPayload: UpdateManualFieldsRequest = {
      priority: edit.priority,
      review_confidence: clampReviewConfidence(edit.review_confidence),
    }

    const productPayload: UpdateProductManualFieldsRequest = {
      customer_width_in_inches: toOptionalNumber(edit.customer_width_in_inches),
      customer_length_in_inches: toOptionalNumber(edit.customer_length_in_inches),
      corner_radius_and_notes: edit.corner_radius_and_notes.trim() || undefined,
    }

    const updatedOrder = await withTimeout(
      ordersApi.updateManualFields(row.order.amazon_order_id, orderPayload),
      SAVE_TIMEOUT_MS,
    )
    syncLookupResultOrder(row.order.amazon_order_id, updatedOrder)

    const updated = await withTimeout(
      ordersApi.updateProductManualFields(row.order.amazon_order_id, row.product.order_product_id, productPayload),
      SAVE_TIMEOUT_MS,
    )
    const stabilizedUpdated = mergeSavedProductIntoOrder(updated, row.product.order_product_id, edit)
    syncLookupResultOrder(row.order.amazon_order_id, stabilizedUpdated)
    syncRowEdits()
    rowFeedback[row.rowKey] = 'Row saved'
  } catch (error: any) {
    rowFeedback[row.rowKey] = error.response?.data?.error || error.message || 'Save failed'
  } finally {
    savingRows[row.rowKey] = false
  }
}

onMounted(() => {
  void rowHighlightRulesStore.ensureLoaded()
})

function matchesAdvancedFilters(row: SheetRow, filters: OrderListAdvancedFilters) {
  const confirmedAt = row.order.date_confirmed || row.order.date_add
  if (filters.confirmed_date_from && !matchesDateTimeRangeStart(confirmedAt, filters.confirmed_date_from)) {
    return false
  }
  if (filters.confirmed_date_to && !matchesDateTimeRangeEnd(confirmedAt, filters.confirmed_date_to)) {
    return false
  }
  if (filters.priority && !matchesText(row.order.priority, filters.priority)) {
    return false
  }
  if (filters.order_status && !matchesText(row.order.order_status, filters.order_status)) {
    return false
  }
  if (filters.thickness && !includesText(row.product.thickness, filters.thickness)) {
    return false
  }
  if (filters.sku && !includesText(row.product.sku, filters.sku)) {
    return false
  }
  if (filters.is_round && !Boolean(row.product.is_round)) {
    return false
  }
  if (filters.customer_inputs_mode === 'has_customer_inputs' && !productHasCustomerInputs(row.product)) {
    return false
  }
  if (filters.customer_inputs_mode === 'no_custom_inputs' && productHasCustomerInputs(row.product)) {
    return false
  }
  if (filters.quantity && !compareNumber(row.product.quantity, filters.quantity, filters.quantity_operator)) {
    return false
  }
  if (
    filters.default_width_in_inches &&
    !compareNumber(row.product.default_width_in_inches, filters.default_width_in_inches, filters.default_width_in_inches_operator)
  ) {
    return false
  }
  if (
    filters.default_length_in_inches &&
    !compareNumber(row.product.default_length_in_inches, filters.default_length_in_inches, filters.default_length_in_inches_operator)
  ) {
    return false
  }
  return true
}

function matchesSearch(
  row: SheetRow,
  key: string,
  value: string,
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq',
) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return true

  switch (key) {
    case 'order_id':
      return includesText(row.order.amazon_order_id, trimmedValue)
    case 'customer':
      return includesText(row.order.delivery_fullname || row.order.user_login, trimmedValue)
    case 'phone':
      return includesText(row.order.phone, trimmedValue)
    case 'sku':
      return includesText(row.product.sku, trimmedValue)
    case 'thickness':
      return includesText(row.product.thickness, trimmedValue)
    case 'priority':
      return matchesText(row.order.priority, trimmedValue)
    case 'is_round':
      return String(Boolean(row.product.is_round)) === trimmedValue.toLowerCase()
    case 'confirmed_date':
      return matchesDateOnly(row.order.date_confirmed || row.order.date_add, trimmedValue)
    case 'order_status':
      return matchesText(row.order.order_status, trimmedValue)
    case 'default_width_in_inches':
      return compareNumber(row.product.default_width_in_inches, trimmedValue, operator)
    case 'default_length_in_inches':
      return compareNumber(row.product.default_length_in_inches, trimmedValue, operator)
    default:
      return true
  }
}

function matchesVisibleRowFilters(
  row: SheetRow,
  filters: OrderListAdvancedFilters,
  searchKey: string,
  searchValue: string,
  searchOperator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq',
) {
  if (!matchesAdvancedFilters(row, filters)) {
    return false
  }
  return matchesSearch(row, searchKey, searchValue, searchOperator)
}

function productHasCustomerInputs(product: OrderProduct) {
  return (
    product.customer_width_in_inches != null ||
    product.customer_length_in_inches != null ||
    product.customer_width_in_mm != null ||
    product.customer_length_in_mm != null ||
    Boolean(product.corner_radius_and_notes?.trim())
  )
}

function includesText(source?: string | null, target?: string | null) {
  return String(source || '').toLowerCase().includes(String(target || '').trim().toLowerCase())
}

function matchesText(source?: string | null, target?: string | null) {
  return String(source || '').trim().toLowerCase() === String(target || '').trim().toLowerCase()
}

function matchesDateOnly(source?: string | null, target?: string | null) {
  if (!source || !target) return false
  const parsed = new Date(source)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.toISOString().slice(0, 10) === target
}

function matchesDateTimeRangeStart(source?: string | null, target?: string | null) {
  if (!source || !target) return false
  const sourceTime = new Date(source).getTime()
  const targetTime = new Date(target).getTime()
  if (Number.isNaN(sourceTime) || Number.isNaN(targetTime)) return false
  return sourceTime >= targetTime
}

function matchesDateTimeRangeEnd(source?: string | null, target?: string | null) {
  if (!source || !target) return false
  const sourceTime = new Date(source).getTime()
  const targetTime = new Date(target).getTime()
  if (Number.isNaN(sourceTime) || Number.isNaN(targetTime)) return false
  return sourceTime <= targetTime
}

function compareNumber(
  source: number | null | undefined,
  target: string | null | undefined,
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq',
) {
  if (source == null || target == null || target === '') return false
  const parsedTarget = Number(target)
  if (!Number.isFinite(parsedTarget)) return false

  switch (operator) {
    case 'gt':
      return source > parsedTarget
    case 'gte':
      return source >= parsedTarget
    case 'lt':
      return source < parsedTarget
    case 'lte':
      return source <= parsedTarget
    case 'eq':
    default:
      return source === parsedTarget
  }
}
</script>

<style scoped>
.confirm-page {
  max-width: 1720px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.confirm-hero,
.confirm-shell,
.extractor-card {
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
    radial-gradient(circle at top right, rgba(125, 211, 252, 0.22), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(224, 242, 254, 0.82));
}

.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.74rem;
  font-weight: 800;
  color: #0f766e;
}

h1,
h2 {
  margin: 0;
  color: #0f172a;
}

h1 {
  font-size: clamp(2rem, 3.8vw, 3.2rem);
  line-height: 1;
  font-weight: 900;
}

h2 {
  font-size: 1.1rem;
  font-weight: 800;
}

.confirm-hero__copy,
.extractor-card__header p {
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
  background: #ecfeff;
  color: #155e75;
}

.summary-pill--warning {
  background: #fef3c7;
  color: #92400e;
}

.extractor-card {
  padding: 1rem;
  display: grid;
  gap: 0.9rem;
}

.extractor-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.extractor-card__actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.extractor-textarea,
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

.extractor-textarea {
  min-height: 15rem;
  resize: vertical;
}

.sheet-textarea {
  min-height: 4.5rem;
  resize: vertical;
}

.extractor-message {
  margin: 0;
  font-weight: 700;
}

.extractor-message--error {
  color: #b91c1c;
}

.extractor-message--warning {
  color: #92400e;
}

.extractor-message--info {
  color: #0f766e;
}

.action-button,
.save-button,
.toggle-button,
.whatsapp-button {
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
  padding: 0 1rem;
}

.toggle-button {
  min-height: 3rem;
  border-radius: 16px;
  background: #f8fafc;
  color: #334155;
  border: 1px solid rgba(148, 163, 184, 0.3);
  font-weight: 700;
  padding: 0 1rem;
}

.confirm-shell {
  padding: 0.8rem;
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #64748b;
  font-weight: 700;
}

.sheet-wrap {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pan-y;
}

.confirm-sheet {
  width: 100%;
  min-width: 1960px;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: auto;
}

.confirm-sheet th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f8fafc;
  color: #0f172a;
  text-align: left;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.85rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.confirm-sheet td {
  vertical-align: top;
  padding: 0.85rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  background: var(--row-highlight-background, transparent);
}

.confirm-sheet th:nth-child(14),
.confirm-sheet td:nth-child(14),
.confirm-sheet th:nth-child(15),
.confirm-sheet td:nth-child(15) {
  min-width: 112px;
}

.confirm-sheet th:nth-child(16),
.confirm-sheet td:nth-child(16) {
  min-width: 190px;
}

.cell-order {
  min-width: 158px;
}

.order-id-line,
.product-title,
.location-city {
  font-weight: 800;
  color: #0f172a;
}

.order-subline,
.location-state {
  margin-top: 0.2rem;
  color: #64748b;
  font-size: 0.85rem;
}

.cell-product {
  min-width: 290px;
}

.cell-quantity {
  text-align: center;
  min-width: 70px;
}

.cell-location {
  min-width: 150px;
}

.cell-actions {
  min-width: 190px;
}

.cell-confidence {
  min-width: 176px;
}

.confidence-slider {
  width: 100%;
  accent-color: #0f766e;
}

.confidence-number {
  margin-top: 0.45rem;
  max-width: 5.2rem;
}

.confirm-sheet td .sheet-input {
  min-width: 100%;
}

.confirm-sheet td:nth-child(14) .sheet-input,
.confirm-sheet td:nth-child(15) .sheet-input {
  min-width: 92px;
}

.confirm-sheet td:nth-child(16) .sheet-textarea {
  min-width: 170px;
  min-height: 7.5rem;
}

.save-button {
  min-height: 2.7rem;
  width: 100%;
  border-radius: 14px;
  background: linear-gradient(135deg, #0f766e, #115e59);
  color: #ffffff;
  font-weight: 800;
  margin-bottom: 0.55rem;
}

.save-button:disabled,
.action-button:disabled,
.toggle-button:disabled,
.whatsapp-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.whatsapp-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.4rem;
  width: 100%;
  border-radius: 12px;
  background: #dcfce7;
  color: #166534;
  font-weight: 800;
  margin-bottom: 0.55rem;
}

.whatsapp-button--alt {
  background: #dbeafe;
  color: #1d4ed8;
}

.view-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.4rem;
  width: 100%;
  border-radius: 12px;
  background: #e2e8f0;
  color: #0f172a;
  font-weight: 800;
  text-decoration: none;
}

.product-feedback {
  margin: 0.55rem 0 0;
  font-size: 0.84rem;
  font-weight: 700;
  color: #0f766e;
}

@media (max-width: 900px) {
  .confirm-hero,
  .extractor-card__header {
    flex-direction: column;
  }

  .extractor-card__actions {
    width: 100%;
  }

  .action-button,
  .toggle-button {
    flex: 1 1 180px;
  }
}
</style>
