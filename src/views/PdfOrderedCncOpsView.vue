<template>
  <div class="cnc-page">
    <section class="cnc-hero">
      <div>
        <p class="eyebrow">PDF driven CNC queue</p>
        <h1>PDF Ordered CNC Ops</h1>
        <p class="cnc-hero__copy">
          Upload one or more PDFs, extract Amazon order IDs in page order, and render the CNC queue in that exact sequence.
        </p>
      </div>
      <div class="cnc-hero__summary">
        <span class="summary-pill">{{ extractedEntries.length }} IDs extracted</span>
        <span class="summary-pill">{{ visibleRows.length }} product rows</span>
        <span class="summary-pill">{{ missingOrderIds.length }} missing orders</span>
      </div>
    </section>

    <OrderSearchBar
      v-model:searchKey="searchKey"
      v-model:searchValue="searchValue"
      v-model:searchOperator="searchOperator"
      :loading="loadingPdf"
      @search="applySearch"
      @clear="clearSearch"
    />

    <OrderListFilterBar
      v-model="advancedFilters"
      :loading="loadingPdf"
      @apply="applySearch"
      @clear="clearSearch"
    />

    <section class="upload-card">
      <div class="upload-card__copy">
        <h2>Upload PDFs</h2>
        <p>Select one or more PDF files. The app keeps file order, then page order, then order ID order within each page.</p>
      </div>
      <div class="upload-card__actions">
        <label class="upload-button">
          <input
            :key="fileInputKey"
            type="file"
            accept="application/pdf"
            multiple
            class="upload-input"
            @change="handleFileSelection"
          />
          {{ loadingPdf ? 'Reading PDFs...' : 'Upload PDFs' }}
        </label>
        <button type="button" class="secondary-button" :disabled="loadingPdf" @click="clearUploadedPdfs">Clear</button>
      </div>
      <p v-if="uploadError" class="upload-message upload-message--error">{{ uploadError }}</p>
      <p v-else-if="missingOrderIds.length" class="upload-message upload-message--warning">
        Missing orders in system: {{ missingOrderIds.join(', ') }}
      </p>
    </section>

    <section v-if="showUploadSummary" class="result-card">
      <div class="result-card__header">
        <h2>Upload Result</h2>
        <p>Summary of order ID extraction and database matching for the latest upload.</p>
      </div>
      <div class="result-grid">
        <article class="result-stat result-stat--neutral">
          <span class="result-stat__label">Extracted from PDF</span>
          <strong class="result-stat__value">{{ extractedOrderIdCount }}</strong>
        </article>
        <article class="result-stat result-stat--success">
          <span class="result-stat__label">Available in DB</span>
          <strong class="result-stat__value">{{ successfulOrderIdCount }}</strong>
        </article>
        <article class="result-stat result-stat--warning">
          <span class="result-stat__label">Not available in DB</span>
          <strong class="result-stat__value">{{ unavailableOrderIdCount }}</strong>
        </article>
      </div>
    </section>

    <section v-if="uploadedFileNames.length" class="active-files-card">
      <div class="active-files-card__header">
        <h2>Active PDF Files</h2>
        <p>These uploaded PDFs are the source for the currently displayed CNC order list.</p>
      </div>
      <div class="active-files-list">
        <span v-for="fileName in uploadedFileNames" :key="fileName" class="active-file-pill">{{ fileName }}</span>
      </div>
    </section>

    <section v-if="missingOrderIds.length" class="missing-orders-card">
      <div class="missing-orders-card__header">
        <h2>Missing Order IDs</h2>
        <p>These order IDs were extracted from the uploaded PDFs but were not available in the database.</p>
      </div>
      <div class="missing-orders-list">
        <span v-for="orderId in missingOrderIds" :key="orderId" class="missing-order-pill">{{ orderId }}</span>
      </div>
    </section>

    <section v-if="fileSummaries.length" class="sequence-card">
      <div class="sequence-card__header">
        <h2>Extracted Sequence</h2>
        <p>Preview of the exact order ID flow from the uploaded PDFs.</p>
      </div>
      <div class="sequence-list">
        <article v-for="summary in fileSummaries" :key="summary.fileKey" class="sequence-item">
          <div class="sequence-item__head">
            <h3>{{ summary.fileName }}</h3>
            <p class="sequence-item__meta">{{ summary.totalIds }} IDs</p>
          </div>
          <div class="sequence-item__ids">
            <span v-for="orderId in summary.orderIds" :key="`${summary.fileKey}-${orderId}`" class="sequence-id-pill">
              {{ orderId }}
            </span>
          </div>
        </article>
      </div>
    </section>

    <section class="cnc-shell">
      <div v-if="loadingPdf" class="empty-state">Reading PDFs and loading matching Amazon orders...</div>
      <div v-else-if="!extractedEntries.length" class="empty-state">Upload PDFs to build a CNC queue from their order sequence.</div>
      <div v-else-if="visibleRows.length === 0" class="empty-state">No matching Amazon CNC rows found for the uploaded order IDs.</div>

      <template v-else>
        <ListUtilityBar
          :total="sequenceOrders.length"
          :page="1"
          :total-pages="1"
          item-label="orders"
          editable
          helper-text="This queue preserves the uploaded PDF order and does not auto-sort"
        />
        <div class="sheet-wrap">
          <table class="cnc-sheet">
            <thead>
              <tr>
                <th>PDF</th>
                <th>Page</th>
                <th>Order ID</th>
                <th>Confirmed Date</th>
                <th>Products</th>
                <th>Quantity</th>
                <th>Thickness</th>
                <th>Round Product</th>
                <th>SKU</th>
                <th>Default Width (in)</th>
                <th>Default Length (in)</th>
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
                <td class="cell-pdf">{{ row.source.fileName }}</td>
                <td class="cell-page">{{ row.source.pageNumber }}</td>
                <td class="cell-order">
                  <div class="order-id-line">{{ row.order.amazon_order_id }}</div>
                  <div class="order-subline">BL #{{ row.order.baselinker_order_id }}</div>
                </td>
                <td class="cell-date">{{ formatDate(row.order.date_confirmed || row.order.date_add) }}</td>
                <td class="cell-product">
                  <div class="product-title">{{ row.product.name || 'Unnamed product' }}</div>
                </td>
                <td class="cell-quantity">{{ formatNumber(row.product.quantity) }}</td>
                <td class="cell-thickness">{{ row.product.thickness || 'Not set' }}</td>
                <td class="cell-round"><span class="status-pill">{{ row.product.is_round ? 'Yes' : 'No' }}</span></td>
                <td class="cell-sku">{{ row.product.sku || 'Not set' }}</td>
                <td class="cell-metric">{{ formatNumber(row.product.default_width_in_inches) }}</td>
                <td class="cell-metric">{{ formatNumber(row.product.default_length_in_inches) }}</td>
                <td class="cell-metric">{{ formatNumber(row.product.default_width_in_mm) }}</td>
                <td class="cell-metric">{{ formatNumber(row.product.default_length_in_mm) }}</td>

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
                      :key="`${row.rowKey}-width-${step}`"
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
                      :key="`${row.rowKey}-length-${step}`"
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
                <td class="cell-customer">{{ formatText(row.order.delivery_fullname || row.order.user_login) }}</td>
                <td class="cell-city">{{ formatText(row.order.delivery_city) }}</td>
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
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import ListUtilityBar from '@/components/ListUtilityBar.vue'
import OrderListFilterBar from '@/components/OrderListFilterBar.vue'
import OrderSearchBar from '@/components/OrderSearchBar.vue'
import { ordersApi } from '@/api/orders'
import { useAmazonRowHighlightRulesStore } from '@/stores/amazonRowHighlightRules'
import { useOrdersStore } from '@/stores/orders'
import type { Order, OrderProduct, OrderedAmazonOrderResult, UpdateManualFieldsRequest, UpdateProductManualFieldsRequest } from '@/types'
import { formatStandardDate } from '@/utils/orderData'
import { extractAmazonOrderIdsFromPdf } from '@/utils/pdfOrderExtraction'
import { createOrderListAdvancedFilters, type OrderListAdvancedFilters } from '@/utils/orderListFilters'

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

type ExtractedEntry = {
  fileKey: string
  fileName: string
  pageNumber: number
  amazonOrderId: string
  sequenceIndex: number
}

type SheetRow = {
  rowKey: string
  order: Order
  product: OrderProduct
  source: ExtractedEntry
}

type VisibleRow = SheetRow & {
  productEdit: ProductEditRow
  orderEdit: OrderEditRow
}

const ordersStore = useOrdersStore()
const rowHighlightRulesStore = useAmazonRowHighlightRulesStore()
const incrementSteps = [0, 0.25, 0.5, 0.75, 1]
const SAVE_TIMEOUT_MS = 15000

const loadingPdf = ref(false)
const uploadError = ref('')
const fileInputKey = ref(0)
const advancedFilters = ref(createOrderListAdvancedFilters())
const appliedAdvancedFilters = ref(createOrderListAdvancedFilters())
const searchKey = ref('order_id')
const searchValue = ref('')
const searchOperator = ref<'gt' | 'gte' | 'lt' | 'lte' | 'eq'>('gte')
const appliedSearchKey = ref('order_id')
const appliedSearchValue = ref('')
const appliedSearchOperator = ref<'gt' | 'gte' | 'lt' | 'lte' | 'eq'>('gte')
const extractedEntries = ref<ExtractedEntry[]>([])
const lookupResults = ref<OrderedAmazonOrderResult[]>([])
const missingOrderIds = ref<string[]>([])
const productEdits = reactive<Record<string, ProductEditRow>>({})
const orderEdits = reactive<Record<string, OrderEditRow>>({})
const savingProducts = reactive<Record<string, boolean>>({})
const productFeedback = reactive<Record<string, string>>({})

const extractedOrderIdCount = computed(() => extractedEntries.value.length)
const successfulOrderIdCount = computed(() => lookupResults.value.filter((result) => result.found && result.order).length)
const unavailableOrderIdCount = computed(() => lookupResults.value.filter((result) => !result.found).length)
const showUploadSummary = computed(() =>
  extractedOrderIdCount.value > 0 || successfulOrderIdCount.value > 0 || unavailableOrderIdCount.value > 0,
)

const sequenceOrders = computed(() =>
  extractedEntries.value
    .map((entry, index) => {
      const result = lookupResults.value[index]
      const order = result?.order
      if (!result?.found || !order) return null
      return { entry, order }
    })
    .filter((item): item is { entry: ExtractedEntry; order: Order } => item != null),
)

const filteredSequenceOrders = computed(() =>
  sequenceOrders.value.filter(({ order }) =>
    matchesAdvancedFilters(order, appliedAdvancedFilters.value) &&
    matchesSearch(order, appliedSearchKey.value, appliedSearchValue.value, appliedSearchOperator.value),
  ),
)

const visibleRows = computed<VisibleRow[]>(() =>
  filteredSequenceOrders.value.flatMap(({ entry, order }) =>
    (order.products || [])
      .filter((product) => !product.is_discount_line)
      .map((product) => {
        const rowKey = `${entry.sequenceIndex}:${product.order_product_id}`
        return {
          rowKey,
          order,
          product,
          source: entry,
          productEdit: ensureProductEdit(rowKey, product),
          orderEdit: ensureOrderEdit(order),
        }
      }),
  ),
)

const fileSummaries = computed(() => {
  const summaries = new Map<string, { fileKey: string; fileName: string; totalIds: number; orderIds: string[] }>()

  for (const entry of extractedEntries.value) {
    const existing = summaries.get(entry.fileKey)
    if (existing) {
      existing.totalIds += 1
      existing.orderIds.push(entry.amazonOrderId)
      continue
    }
    summaries.set(entry.fileKey, {
      fileKey: entry.fileKey,
      fileName: entry.fileName,
      totalIds: 1,
      orderIds: [entry.amazonOrderId],
    })
  }

  return [...summaries.values()]
})

const uploadedFileNames = computed(() => fileSummaries.value.map((summary) => summary.fileName))

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

const ensureProductEdit = (rowKey: string, product: OrderProduct) => {
  if (!productEdits[rowKey]) {
    productEdits[rowKey] = buildProductEdit(product)
  }
  return productEdits[rowKey] as ProductEditRow
}

const ensureOrderEdit = (order: Order) => {
  if (!orderEdits[order.amazon_order_id]) {
    orderEdits[order.amazon_order_id] = buildOrderEdit(order)
  }
  return orderEdits[order.amazon_order_id] as OrderEditRow
}

const syncProductEdits = () => {
  for (const row of visibleRows.value) {
    productEdits[row.rowKey] = buildProductEdit(row.product)
    orderEdits[row.order.amazon_order_id] = buildOrderEdit(row.order)
    savingProducts[row.rowKey] = false
    productFeedback[row.rowKey] = ''
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

const applySearch = () => {
  appliedSearchKey.value = searchKey.value
  appliedSearchValue.value = searchValue.value.trim()
  appliedSearchOperator.value = searchOperator.value
  appliedAdvancedFilters.value = { ...advancedFilters.value }
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
}

const resetRowState = () => {
  for (const key of Object.keys(productEdits)) {
    delete productEdits[key]
  }
  for (const key of Object.keys(orderEdits)) {
    delete orderEdits[key]
  }
  for (const key of Object.keys(savingProducts)) {
    delete savingProducts[key]
  }
  for (const key of Object.keys(productFeedback)) {
    delete productFeedback[key]
  }
}

const clearUploadedPdfs = () => {
  extractedEntries.value = []
  lookupResults.value = []
  missingOrderIds.value = []
  uploadError.value = ''
  ordersStore.orders = []
  clearSearch()
  resetRowState()
  fileInputKey.value += 1
}

const handleFileSelection = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = [...(input.files || [])].filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))

  if (!files.length) {
    uploadError.value = 'Please upload at least one PDF file.'
    return
  }

  loadingPdf.value = true
  uploadError.value = ''
  missingOrderIds.value = []

  try {
    resetRowState()
    const nextEntries: ExtractedEntry[] = []

    for (const [fileIndex, file] of files.entries()) {
      const extracted = await extractAmazonOrderIdsFromPdf(file)
      for (const item of extracted) {
        nextEntries.push({
          fileKey: `${fileIndex}:${file.name}`,
          fileName: file.name,
          pageNumber: item.pageNumber,
          amazonOrderId: item.amazonOrderId,
          sequenceIndex: nextEntries.length,
        })
      }
    }

    if (!nextEntries.length) {
      clearUploadedPdfs()
      uploadError.value = 'No Amazon order IDs were found in the uploaded PDFs.'
      return
    }

    const response = await ordersApi.getByIDs(nextEntries.map((entry) => entry.amazonOrderId))
    extractedEntries.value = nextEntries
    lookupResults.value = response.results
    missingOrderIds.value = response.missing_amazon_order_ids
    ordersStore.orders = response.results
      .map((result) => result.order)
      .filter((order): order is Order => Boolean(order))
    syncProductEdits()

    if (!response.results.some((result) => result.found && result.order)) {
      uploadError.value = 'The PDFs contained order IDs, but none of them matched Amazon orders in the app.'
    }
  } catch (error: any) {
    clearUploadedPdfs()
    uploadError.value = error?.message || 'Failed to read the uploaded PDFs.'
  } finally {
    loadingPdf.value = false
    input.value = ''
  }
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

    await withTimeout(
      ordersStore.updateProductManualFields(row.order.amazon_order_id, row.product.order_product_id, payload),
      SAVE_TIMEOUT_MS,
    )

    syncProductEdits()
    productFeedback[key] = 'Saved'
  } catch (error: any) {
    productFeedback[key] = error.response?.data?.error || error.message || 'Save failed'
  } finally {
    savingProducts[key] = false
  }
}

onMounted(() => {
  void rowHighlightRulesStore.ensureLoaded()
})

function matchesAdvancedFilters(order: Order, filters: OrderListAdvancedFilters) {
  const confirmedAt = order.date_confirmed || order.date_add
  if (filters.confirmed_date_from && !matchesDateTimeRangeStart(confirmedAt, filters.confirmed_date_from)) {
    return false
  }
  if (filters.confirmed_date_to && !matchesDateTimeRangeEnd(confirmedAt, filters.confirmed_date_to)) {
    return false
  }
  if (filters.priority && !matchesText(order.priority, filters.priority)) {
    return false
  }
  if (filters.order_status && !matchesText(order.order_status, filters.order_status)) {
    return false
  }
  if (filters.thickness && !orderHasProduct(order, (product) => includesText(product.thickness, filters.thickness))) {
    return false
  }
  if (filters.sku && !orderHasProduct(order, (product) => includesText(product.sku, filters.sku))) {
    return false
  }
  if (filters.is_round && !orderHasProduct(order, (product) => Boolean(product.is_round))) {
    return false
  }
  if (filters.customer_inputs_mode === 'has_customer_inputs' && !orderHasCustomerInputs(order)) {
    return false
  }
  if (filters.customer_inputs_mode === 'no_custom_inputs' && orderHasCustomerInputs(order)) {
    return false
  }
  if (filters.quantity && !orderHasProduct(order, (product) => compareNumber(product.quantity, filters.quantity, filters.quantity_operator))) {
    return false
  }
  if (
    filters.default_width_in_inches &&
    !orderHasProduct(order, (product) =>
      compareNumber(product.default_width_in_inches, filters.default_width_in_inches, filters.default_width_in_inches_operator),
    )
  ) {
    return false
  }
  if (
    filters.default_length_in_inches &&
    !orderHasProduct(order, (product) =>
      compareNumber(product.default_length_in_inches, filters.default_length_in_inches, filters.default_length_in_inches_operator),
    )
  ) {
    return false
  }
  return true
}

function matchesSearch(
  order: Order,
  key: string,
  value: string,
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq',
) {
  const trimmedValue = value.trim()
  if (!trimmedValue) return true

  switch (key) {
    case 'order_id':
      return includesText(order.amazon_order_id, trimmedValue)
    case 'customer':
      return includesText(order.delivery_fullname || order.user_login, trimmedValue)
    case 'phone':
      return includesText(order.phone, trimmedValue)
    case 'sku':
      return orderHasProduct(order, (product) => includesText(product.sku, trimmedValue))
    case 'thickness':
      return orderHasProduct(order, (product) => includesText(product.thickness, trimmedValue))
    case 'priority':
      return matchesText(order.priority, trimmedValue)
    case 'is_round':
      return orderHasProduct(order, (product) => String(Boolean(product.is_round)) === trimmedValue.toLowerCase())
    case 'confirmed_date':
      return matchesDateOnly(order.date_confirmed || order.date_add, trimmedValue)
    case 'order_status':
      return matchesText(order.order_status, trimmedValue)
    case 'default_width_in_inches':
      return orderHasProduct(order, (product) => compareNumber(product.default_width_in_inches, trimmedValue, operator))
    case 'default_length_in_inches':
      return orderHasProduct(order, (product) => compareNumber(product.default_length_in_inches, trimmedValue, operator))
    default:
      return true
  }
}

function orderHasProduct(order: Order, predicate: (product: OrderProduct) => boolean) {
  return (order.products || []).some((product) => !product.is_discount_line && predicate(product))
}

function orderHasCustomerInputs(order: Order) {
  return orderHasProduct(
    order,
    (product) =>
      product.customer_width_in_inches != null ||
      product.customer_length_in_inches != null ||
      product.customer_width_in_mm != null ||
      product.customer_length_in_mm != null ||
      Boolean(product.corner_radius_and_notes?.trim()),
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
.cnc-page {
  max-width: 1820px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.cnc-hero,
.upload-card,
.result-card,
.active-files-card,
.missing-orders-card,
.sequence-card,
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

h1,
h2,
h3 {
  margin: 0;
  color: #0f172a;
}

h1 {
  font-size: clamp(2rem, 3.8vw, 3.2rem);
  line-height: 1;
  font-weight: 900;
}

.cnc-hero__copy,
.upload-card__copy p,
.sequence-card__header p {
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

.upload-card,
.result-card,
.active-files-card,
.missing-orders-card,
.sequence-card,
.cnc-shell {
  padding: 1.2rem;
}

.upload-card {
  display: grid;
  gap: 1rem;
}

.result-card {
  display: grid;
  gap: 1rem;
}

.active-files-card {
  display: grid;
  gap: 1rem;
}

.active-files-card__header p {
  margin: 0.45rem 0 0;
  color: #475569;
}

.active-files-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.active-file-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.6rem 0.9rem;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 800;
  border: 1px solid rgba(59, 130, 246, 0.18);
}

.missing-orders-card {
  display: grid;
  gap: 1rem;
}

.missing-orders-card__header p {
  margin: 0.45rem 0 0;
  color: #475569;
}

.missing-orders-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
}

.missing-order-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.6rem 0.9rem;
  background: #fff7ed;
  color: #c2410c;
  font-weight: 800;
  border: 1px solid rgba(249, 115, 22, 0.2);
}

.result-card__header p {
  margin: 0.45rem 0 0;
  color: #475569;
}

.result-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.result-stat {
  border-radius: 20px;
  padding: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.28);
  display: grid;
  gap: 0.35rem;
}

.result-stat--neutral {
  background: #f8fafc;
}

.result-stat--success {
  background: #ecfdf5;
}

.result-stat--warning {
  background: #fff7ed;
}

.result-stat__label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.result-stat__value {
  font-size: 2rem;
  line-height: 1;
  color: #0f172a;
}

.upload-card__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.upload-button,
.secondary-button,
.save-button,
.view-link {
  border: 0;
  border-radius: 999px;
  padding: 0.75rem 1.2rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
}

.upload-button,
.save-button {
  background: linear-gradient(135deg, #0284c7, #0f766e);
  color: #fff;
  box-shadow: 0 18px 36px rgba(2, 132, 199, 0.24);
}

.secondary-button,
.view-link {
  background: #e2e8f0;
  color: #0f172a;
  text-decoration: none;
}

.upload-button:hover,
.secondary-button:hover,
.save-button:hover,
.view-link:hover {
  transform: translateY(-1px);
}

.upload-button:disabled,
.secondary-button:disabled,
.save-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

.upload-input {
  display: none;
}

.upload-message {
  margin: 0;
  font-weight: 700;
}

.upload-message--error {
  color: #b91c1c;
}

.upload-message--warning {
  color: #92400e;
}

.sequence-card {
  display: grid;
  gap: 1rem;
}

.sequence-list {
  display: grid;
  gap: 0.85rem;
}

.sequence-item {
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #f8fafc;
  padding: 0.95rem 1rem;
  display: grid;
  gap: 0.8rem;
}

.sequence-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.sequence-item__meta {
  margin: 0;
  color: #475569;
  font-weight: 700;
}

.sequence-item__ids {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sequence-id-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.42rem 0.68rem;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.28);
  color: #334155;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.78rem;
  font-weight: 700;
}

.empty-state {
  padding: 3rem 1rem;
  text-align: center;
  color: #475569;
  font-weight: 700;
}

.sheet-wrap {
  overflow-x: auto;
}

.cnc-sheet {
  width: 100%;
  min-width: 2320px;
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

.cnc-sheet td {
  padding: 0.85rem 0.7rem;
  vertical-align: top;
  border-bottom: 1px solid rgba(226, 232, 240, 0.85);
  color: #0f172a;
  background: var(--row-highlight-background, rgba(255, 255, 255, 0.9));
}

.order-id-line,
.product-title {
  font-weight: 800;
  color: #0f172a;
}

.order-subline,
.cell-pdf,
.product-feedback {
  color: #64748b;
  font-size: 0.85rem;
}

.cell-pdf {
  min-width: 11rem;
}

.cell-page,
.cell-quantity,
.cell-round,
.cell-metric {
  text-align: center;
}

.cell-page {
  width: 4.5rem;
}

.cell-date {
  min-width: 9rem;
}

.cell-order {
  min-width: 16rem;
}

.cell-product {
  min-width: 18rem;
}

.product-title {
  font-weight: 700;
  line-height: 1.45;
}

.cell-thickness {
  min-width: 5.5rem;
  white-space: nowrap;
}

.cell-sku {
  min-width: 6.5rem;
}

.cell-metric {
  min-width: 4.9rem;
}

.cell-input-group,
.cell-mm,
.cell-notes,
.cell-actions {
  min-width: 160px;
}

.cell-input-group {
  min-width: 14rem;
}

.cell-mm {
  min-width: 10rem;
}

.cell-notes {
  min-width: 18rem;
}

.cell-status-edit {
  min-width: 170px;
}

.cell-customer {
  min-width: 10rem;
}

.cell-city {
  min-width: 8rem;
}

.sheet-input,
.sheet-textarea {
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.45);
  background: rgba(255, 255, 255, 0.96);
  padding: 0.65rem 0.75rem;
  font: inherit;
  color: #0f172a;
}

.sheet-textarea {
  min-height: 88px;
  resize: vertical;
}

.sheet-input--mm {
  min-width: 8.75rem;
}

.increment-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.45rem;
}

.increment-button {
  border: 0;
  border-radius: 999px;
  padding: 0.28rem 0.55rem;
  font-size: 0.73rem;
  font-weight: 800;
  background: #dbeafe;
  color: #1d4ed8;
  cursor: pointer;
}

.cell-actions {
  display: grid;
  gap: 0.45rem;
  min-width: 9rem;
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

@media (max-width: 900px) {
  .cnc-hero {
    flex-direction: column;
  }

  .upload-card__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .upload-button,
  .secondary-button {
    text-align: center;
  }

  .result-grid {
    grid-template-columns: 1fr;
  }

  .sequence-item__head {
    align-items: flex-start;
  }
}
</style>
