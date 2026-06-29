<template>
  <div class="orders-page">
    <section class="orders-toolbar">
      <div>
        <p class="eyebrow">Amazon pipeline</p>
        <h1>Amazon Orders</h1>
        <p class="orders-toolbar__copy">
          Spreadsheet view for scanning and updating product rows quickly.
        </p>
      </div>
      <button @click="handleImport" :disabled="loading" class="action-button">
        {{ loading ? 'Importing...' : 'Import from BaseLinker' }}
      </button>
    </section>

    <section class="orders-shell">
      <div v-if="ordersStore.loading" class="empty-state">Loading orders...</div>
      <div v-else-if="visibleRows.length === 0" class="empty-state">No orders found.</div>

      <template v-else>
        <ListUtilityBar
          :total="ordersStore.pagination.total"
          :page="ordersStore.pagination.page"
          :total-pages="ordersStore.pagination.totalPages"
          item-label="orders"
          editable
          helper-text="Use * in search fields for wildcard matching"
        />
        <div class="sheet-wrap">
          <table class="orders-sheet">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Product ID</th>
              <th>Confirmed Date</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>City / State</th>
              <th>Products</th>
              <th>SKU</th>
              <th>Thickness</th>
              <th>Priority</th>
              <th>Order Status</th>
              <th>Default Width (in)</th>
              <th>Default Length (in)</th>
              <th>Customer Width (in)</th>
              <th>Customer Length (in)</th>
              <th>Default Width (mm)</th>
              <th>Default Length (mm)</th>
              <th>Customer Width (mm)</th>
              <th>Customer Length (mm)</th>
              <th>Safety Claim</th>
              <th>Return Status</th>
              <th>Issue Status</th>
              <th>Round Product</th>
              <th>Corner Radius and Notes</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="row in visibleRows"
              :key="row.rowKey"
              :style="row.rowStyle"
            >
              <td class="cell-order">
                <div class="order-id-line">{{ row.order.amazon_order_id }}</div>
                <div class="order-subline">BL #{{ row.order.baselinker_order_id }}</div>
              </td>

              <td class="cell-product-id">
                <div class="product-id-line">#{{ row.product.order_product_id }}</div>
                <div :class="['order-subline', 'quantity-line', { 'quantity-line--highlight': isMultiQuantity(row.product) }]">
                  {{ row.product.quantity ?? 0 }} qty
                </div>
              </td>

              <td class="cell-date">{{ formatDate(row.order.date_confirmed || row.order.date_add) }}</td>
              <td>{{ formatText(row.order.delivery_fullname || row.order.user_login) }}</td>
              <td>{{ formatText(row.order.phone) }}</td>
              <td>{{ formatLocation(row.order.delivery_city, row.order.delivery_state) }}</td>

              <td class="cell-product">
                <div class="product-sku">{{ row.product.sku || 'No SKU' }}</div>
                <div class="product-title">{{ row.product.name || 'Unnamed product' }}</div>
              </td>

              <td>{{ row.product.sku || 'Not set' }}</td>
              <td>{{ row.product.thickness || 'Not set' }}</td>
              <td><span class="chip chip--priority">{{ row.order.priority.toUpperCase() }}</span></td>
              <td>
                <select
                  v-model="row.orderEdit.order_status"
                  class="sheet-input"
                >
                  <option value="received">received</option>
                  <option value="manufactured">manufactured</option>
                  <option value="cancelled">cancelled</option>
                  <option value="returned">returned</option>
                </select>
              </td>
              <td>{{ formatNumber(row.product.default_width_in_inches) }}</td>
              <td>{{ formatNumber(row.product.default_length_in_inches) }}</td>
              <td>
                <input
                  v-model="row.productEdit.customer_width_in_inches"
                  type="number"
                  step="0.01"
                  class="sheet-input"
                  placeholder="Width in"
                />
              </td>
              <td>
                <input
                  v-model="row.productEdit.customer_length_in_inches"
                  type="number"
                  step="0.01"
                  class="sheet-input"
                  placeholder="Length in"
                />
              </td>
              <td>{{ formatNumber(row.product.default_width_in_mm) }}</td>
              <td>{{ formatNumber(row.product.default_length_in_mm) }}</td>

              <td>
                <input
                  v-model="row.productEdit.customer_width_in_mm"
                  type="number"
                  step="0.01"
                  class="sheet-input"
                  placeholder="Width mm"
                />
              </td>

              <td>
                <input
                  v-model="row.productEdit.customer_length_in_mm"
                  type="number"
                  step="0.01"
                  class="sheet-input"
                  placeholder="Length mm"
                />
              </td>

              <td>
                <select
                  v-model="row.productEdit.safety_claim"
                  class="sheet-input"
                >
                  <option value="none">none</option>
                  <option value="pending">pending</option>
                  <option value="done">done</option>
                  <option value="not_needed">not_needed</option>
                  <option value="issues">issues</option>
                </select>
              </td>

              <td>
                <select
                  v-model="row.productEdit.return_status"
                  class="sheet-input"
                >
                  <option value="none">none</option>
                  <option value="returned">returned</option>
                  <option value="replacement_placed">replacement_placed</option>
                  <option value="converted_direct">converted_direct</option>
                  <option value="refunded">refunded</option>
                </select>
              </td>

              <td>
                <select
                  v-model="row.productEdit.issue_status"
                  class="sheet-input"
                >
                  <option value="none">none</option>
                  <option value="has_issues">has_issues</option>
                  <option value="replacement_placed">replacement_placed</option>
                  <option value="converted_direct">converted_direct</option>
                  <option value="refunded">refunded</option>
                </select>
              </td>

              <td class="cell-checkbox">
                <span class="readonly-badge">{{ row.product.is_round ? 'Yes' : 'No' }}</span>
              </td>

              <td>
                <textarea
                  v-model="row.productEdit.corner_radius_and_notes"
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
                  {{ savingRows[row.rowKey] ? 'Saving row...' : 'Save Row' }}
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
import PaginationControls from '@/components/PaginationControls.vue'
import { useAmazonRowHighlightRulesStore } from '@/stores/amazonRowHighlightRules'
import { useOrdersStore } from '@/stores/orders'
import type { Order, OrderProduct, UpdateProductManualFieldsRequest } from '@/types'
import { formatStandardDate } from '@/utils/orderData'

type ProductEditRow = {
  customer_width_in_inches: string
  customer_length_in_inches: string
  customer_width_in_mm: string
  customer_length_in_mm: string
  corner_radius_and_notes: string
  return_status: string
  issue_status: string
  safety_claim: string
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
  rowStyle: Record<string, string>
}

const ordersStore = useOrdersStore()
const rowHighlightRulesStore = useAmazonRowHighlightRulesStore()
const loading = ref(false)
const filters = ref({
  page: 1,
  limit: 100,
})
const SAVE_TIMEOUT_MS = 15000

const productEdits = reactive<Record<string, ProductEditRow>>({})
const orderEdits = reactive<Record<string, OrderEditRow>>({})
const savingRows = reactive<Record<string, boolean>>({})
const rowFeedback = reactive<Record<string, string>>({})

const sheetRows = computed<SheetRow[]>(() =>
  ordersStore.orders.flatMap((order) =>
    (order.products || []).map((product) => ({
      rowKey: productKey(order.amazon_order_id, product.order_product_id),
      order,
      product,
    })),
  ),
)

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

const toRowStyleRecord = (style: { '--row-highlight-background'?: string }): Record<string, string> => {
  if (style['--row-highlight-background']) {
    return { '--row-highlight-background': style['--row-highlight-background'] }
  }
  return {}
}

const visibleRows = computed<VisibleRow[]>(() => {
  return sheetRows.value.map((row) => {
    const productEdit = ensureProductEdit(row.order.amazon_order_id, row.product.order_product_id, row.product)
    const orderEdit = ensureOrderEdit(row.order)

    return {
      ...row,
      productEdit,
      orderEdit,
      rowStyle: toRowStyleRecord(rowHighlightRulesStore.getRowHighlightStyle(row.order, [row.product])),
    }
  })
})

const formatDate = (dateString?: string | null) => formatStandardDate(dateString)
const formatText = (value?: string | null) => value?.trim() || 'Not available'
const formatLocation = (city?: string | null, state?: string | null) => [city, state].filter(Boolean).join(' / ') || 'Not available'
const formatNumber = (value?: number | null) => (value == null ? 'Not set' : String(value))
const numberToString = (value?: number | null) => (value == null ? '' : String(value))

const productKey = (amazonOrderId: string, orderProductId: number) => `${amazonOrderId}:${orderProductId}`

const buildOrderEdit = (order: Order): OrderEditRow => ({
  order_status: order.order_status || 'received',
})

const buildProductEdit = (product: OrderProduct): ProductEditRow => ({
  customer_width_in_mm: numberToString(product.customer_width_in_mm),
  customer_length_in_mm: numberToString(product.customer_length_in_mm),
  customer_width_in_inches: numberToString(product.customer_width_in_inches),
  customer_length_in_inches: numberToString(product.customer_length_in_inches),
  corner_radius_and_notes: product.corner_radius_and_notes ?? '',
  return_status: product.return_status || 'none',
  issue_status: product.issue_status || 'none',
  safety_claim: product.safety_claim || 'none',
})

const syncProductEdits = () => {
  for (const order of ordersStore.orders) {
    orderEdits[order.amazon_order_id] = buildOrderEdit(order)
    for (const product of order.products || []) {
      productEdits[productKey(order.amazon_order_id, product.order_product_id)] = buildProductEdit(product)
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

const isMultiQuantity = (product: OrderProduct) => Number(product.quantity ?? 0) > 1

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

const applyFilters = async () => {
  await ordersStore.fetchOrders({
    page: filters.value.page,
    limit: filters.value.limit,
  })
  syncProductEdits()
}

const changePage = async (page: number) => {
  if (page === filters.value.page) return
  filters.value.page = page
  await applyFilters()
}

const handleImport = async () => {
  loading.value = true
  try {
    await ordersStore.importFromBaseLinker()
    await applyFilters()
  } catch (error: any) {
    alert(error.response?.data?.error || error.message || 'Failed to import orders')
  } finally {
    loading.value = false
  }
}

const saveRow = async (row: SheetRow) => {
  const key = row.rowKey
  const productEdit = productEdits[key]
  const orderEdit = orderEdits[row.order.amazon_order_id]
  if (!productEdit || !orderEdit) return

  savingRows[key] = true
  rowFeedback[key] = ''

  try {
    const payload: UpdateProductManualFieldsRequest = {
      customer_width_in_inches: toOptionalNumber(productEdit.customer_width_in_inches),
      customer_length_in_inches: toOptionalNumber(productEdit.customer_length_in_inches),
      customer_width_in_mm: toOptionalNumber(productEdit.customer_width_in_mm),
      customer_length_in_mm: toOptionalNumber(productEdit.customer_length_in_mm),
      corner_radius_and_notes: productEdit.corner_radius_and_notes || undefined,
      return_status: productEdit.return_status,
      issue_status: productEdit.issue_status,
      safety_claim: productEdit.safety_claim,
    }

    await withTimeout(
      ordersStore.updateOrderManualFields(row.order.amazon_order_id, {
        order_status: orderEdit.order_status,
      }),
      SAVE_TIMEOUT_MS,
    )
    const updated = await withTimeout(
      ordersStore.updateProductManualFields(
        row.order.amazon_order_id,
        row.product.order_product_id,
        payload,
      ),
      SAVE_TIMEOUT_MS,
    )
    if (updated) {
      orderEdits[row.order.amazon_order_id] = buildOrderEdit(updated)
      const updatedProduct = updated.products?.find((product) => product.order_product_id === row.product.order_product_id)
      if (updatedProduct) {
        productEdits[key] = buildProductEdit(updatedProduct)
      }
    }
    rowFeedback[key] = 'Row saved'
  } catch (error: any) {
    rowFeedback[key] = error.response?.data?.error || error.message || 'Save failed'
  } finally {
    savingRows[key] = false
  }
}

onMounted(() => {
  void rowHighlightRulesStore.ensureLoaded()
  applyFilters()
})
</script>

<style scoped>
.orders-page {
  max-width: 1680px;
  margin: 0 auto;
  display: grid;
  gap: 0.85rem;
}

.orders-toolbar,
.filter-bar,
.orders-shell {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 22px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.orders-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.2rem;
}

.eyebrow {
  margin: 0 0 0.2rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.68rem;
  font-weight: 800;
  color: #0f766e;
}

h1 {
  margin: 0;
  font-size: 1.8rem;
  line-height: 1.05;
  font-weight: 900;
  color: #0f172a;
}

.orders-toolbar__copy {
  margin: 0.32rem 0 0;
  color: #64748b;
}

.filter-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  grid-auto-rows: minmax(2.9rem, auto);
  align-items: stretch;
  gap: 0.65rem;
  padding: 0.8rem;
}

.filter-input,
.sheet-input,
.sheet-textarea {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 10px;
  background: #fff;
  color: #0f172a;
  font: inherit;
}

.filter-input {
  min-height: 2.75rem;
  padding: 0 0.85rem;
}

.action-button,
.order-save-button,
.save-button,
.view-link {
  border: 0;
  border-radius: 12px;
  font-weight: 800;
  cursor: pointer;
  min-height: 2.7rem;
  padding: 0 1rem;
  background: linear-gradient(135deg, #0f766e, #115e59);
  color: #fff;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.orders-toolbar > .action-button {
  min-width: 220px;
}

.filter-bar > .action-button,
.filter-bar > .toggle-button,
.cell-actions > .order-save-button,
.cell-actions > .save-button,
.cell-actions > .view-link {
  width: 100%;
}

.action-button--small {
  min-height: 2.75rem;
}

.toggle-button {
  border: 1px solid rgba(15, 118, 110, 0.2);
  border-radius: 12px;
  min-height: 2.75rem;
  padding: 0 1rem;
  background: #ecfeff;
  color: #0f766e;
  font-weight: 800;
  cursor: pointer;
  width: 100%;
}

.toggle-button--active {
  background: linear-gradient(135deg, #0f766e, #115e59);
  color: #fff;
}

.orders-shell {
  padding: 0.9rem;
  content-visibility: auto;
  contain-intrinsic-size: 900px;
}

.empty-state {
  padding: 2rem 1rem;
  color: #64748b;
  text-align: center;
}

.sheet-wrap {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pan-y;
  border-radius: 18px;
  border: 1px solid rgba(191, 219, 254, 0.9);
  background: linear-gradient(180deg, rgba(241, 248, 255, 0.72), rgba(255, 255, 255, 0.96));
}

.orders-sheet {
  width: 100%;
  min-width: 2400px;
  border-collapse: separate;
  border-spacing: 0;
}

.orders-sheet th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: linear-gradient(180deg, #f7fdfd, #eef8f7);
  color: #0f766e;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.68rem;
  font-weight: 800;
  padding: 0.9rem 0.8rem;
  text-align: left;
  border-bottom: 1px solid rgba(191, 219, 254, 0.8);
  white-space: nowrap;
}

.orders-sheet td {
  padding: 0.75rem;
  vertical-align: top;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  color: #0f172a;
  font-size: 0.92rem;
  background: var(--row-highlight-background, rgba(255, 255, 255, 0.82));
}

.cell-order {
  min-width: 210px;
}

.order-id-line {
  font-size: 1rem;
  font-weight: 900;
  color: #0f172a;
  white-space: nowrap;
}

.order-subline {
  margin-top: 0.28rem;
  color: #64748b;
  white-space: nowrap;
}

.cell-date {
  min-width: 160px;
}

.cell-product-id {
  min-width: 120px;
}

.product-id-line {
  font-size: 0.96rem;
  font-weight: 900;
  color: #0f172a;
  white-space: nowrap;
}

.quantity-line {
  font-weight: 700;
}

.quantity-line--highlight {
  font-size: 1rem;
  font-weight: 900;
  color: #15803d;
}

.cell-product {
  min-width: 420px;
}

.product-sku {
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 0.2rem;
}

.product-title {
  color: #475569;
  line-height: 1.45;
  white-space: normal;
  word-break: break-word;
}

.product-subline {
  margin-top: 0.35rem;
  color: #64748b;
  font-size: 0.8rem;
}

.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3rem;
  border-radius: 999px;
  padding: 0.36rem 0.72rem;
  font-size: 0.82rem;
  font-weight: 800;
}

.chip--priority {
  background: #dcfce7;
  color: #166534;
}

.sheet-input {
  width: 100%;
  min-width: 140px;
  min-height: 2.3rem;
  padding: 0 0.65rem;
}

.sheet-textarea {
  width: 100%;
  min-width: 210px;
  min-height: 6rem;
  padding: 0.6rem 0.7rem;
  resize: vertical;
}

.cell-checkbox {
  min-width: 120px;
}

.readonly-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3.5rem;
  border-radius: 999px;
  padding: 0.36rem 0.72rem;
  background: #e2e8f0;
  color: #334155;
  font-weight: 800;
}

.cell-actions {
  min-width: 150px;
}

.cell-actions {
  display: grid;
  gap: 0.45rem;
}

.save-button,
.order-save-button,
.view-link {
  min-height: 2.35rem;
}

.view-link {
  background: #e2e8f0;
  color: #0f172a;
}

.order-feedback,
.product-feedback {
  margin: 0;
  font-size: 0.78rem;
  color: #0f766e;
  font-weight: 700;
}

@media (max-width: 900px) {
  .orders-toolbar {
    display: grid;
  }

  .filter-bar {
    grid-template-columns: 1fr;
  }

  .orders-shell {
    padding: 0.55rem;
  }
}
</style>
