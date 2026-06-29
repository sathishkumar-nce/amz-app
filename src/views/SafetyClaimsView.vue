<template>
  <div class="safety-page">
    <section class="safety-hero">
      <div>
        <p class="eyebrow">Safety claims workflow</p>
        <h1>Safety Claims</h1>
        <p class="safety-hero__copy">
          Product-first board for marking safety claims, updating order status, and tracking claim issues inline.
        </p>
      </div>
      <div class="safety-hero__summary">
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

    <section class="safety-filter-shell">
      <select v-model="safetyClaimedFilter" class="filter-input" :disabled="ordersStore.loading">
        <option value="">All safety claimed states</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
      <button type="button" class="filter-button" :disabled="ordersStore.loading" @click="applySearch">
        Apply Filter
      </button>
    </section>

    <section class="safety-shell">
      <div v-if="ordersStore.loading" class="empty-state">Loading safety claims...</div>
      <div v-else-if="visibleRows.length === 0" class="empty-state">No safety-claim rows found.</div>

      <template v-else>
        <ListUtilityBar
          :total="ordersStore.pagination.total"
          :page="ordersStore.pagination.page"
          :total-pages="ordersStore.pagination.totalPages"
          item-label="orders"
          editable
          helper-text="Update safety claim details inline, then save each row."
        />

        <div class="sheet-wrap">
          <table class="safety-sheet">
            <thead>
              <tr>
                <th class="cell-order">Order ID</th>
                <th class="cell-date">Date Confirmed</th>
                <th class="cell-product">Products</th>
                <th class="cell-customer">Customer</th>
                <th class="cell-size">Customer Width (in)</th>
                <th class="cell-size">Customer Length (in)</th>
                <th class="cell-notes">Corner Style and Notes</th>
                <th class="cell-status-edit">Order Status</th>
                <th class="cell-toggle">Safety Claimed</th>
                <th class="cell-issues">Safety Claim Issues</th>
                <th class="cell-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in visibleRows" :key="row.rowKey" :style="getRowStyle(row)">
                <td class="cell-order">
                  <div class="order-id-line">{{ row.order.amazon_order_id }}</div>
                  <div class="order-subline">BL #{{ row.order.baselinker_order_id }}</div>
                </td>
                <td class="cell-date">{{ formatDate(row.order.date_confirmed || row.order.date_add) }}</td>
                <td class="cell-product">
                  <div class="product-title">{{ formatProductName(row.product.name) }}</div>
                </td>
                <td class="cell-customer">{{ formatText(row.order.delivery_fullname || row.order.user_login) }}</td>
                <td class="cell-size">{{ formatNumber(row.product.customer_width_in_inches) }}</td>
                <td class="cell-size">{{ formatNumber(row.product.customer_length_in_inches) }}</td>
                <td class="cell-notes">{{ formatLongText(row.product.corner_radius_and_notes) }}</td>
                <td class="cell-status-edit">
                  <select v-model="row.orderEdit.order_status" class="sheet-input">
                    <option value="received">received</option>
                    <option value="manufactured">manufactured</option>
                    <option value="cancelled">cancelled</option>
                    <option value="returned">returned</option>
                  </select>
                </td>
                <td class="cell-toggle">
                  <label class="toggle" :class="{ 'toggle--saving': savingRows[row.rowKey] }">
                    <input
                      :checked="row.productEdit.safety_claimed"
                      type="checkbox"
                      @change="setSafetyClaimed(row, ($event.target as HTMLInputElement).checked)"
                    />
                    <span class="toggle__track">
                      <span class="toggle__thumb" />
                    </span>
                    <span class="toggle__label">{{ row.productEdit.safety_claimed ? 'True' : 'False' }}</span>
                  </label>
                </td>
                <td class="cell-issues">
                  <textarea
                    v-model="row.productEdit.safety_claim_issues"
                    rows="3"
                    class="sheet-textarea"
                    maxlength="500"
                    placeholder="Safety claim issues"
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

type ProductEditRow = {
  safety_claimed: boolean
  safety_claim_issues: string
}

type OrderEditRow = {
  order_status: string
}

type VisibleRow = SheetRow & {
  productEdit: ProductEditRow
  orderEdit: OrderEditRow
}

const ordersStore = useOrdersStore()
const rowHighlightRulesStore = useAmazonRowHighlightRulesStore()
const filters = ref({
  page: 1,
  limit: 100,
})
const searchKey = ref('order_id')
const searchValue = ref('')
const safetyClaimedFilter = ref('')
const SAVE_TIMEOUT_MS = 15000

const productEdits = reactive<Record<string, ProductEditRow>>({})
const orderEdits = reactive<Record<string, OrderEditRow>>({})
const savingRows = reactive<Record<string, boolean>>({})
const rowFeedback = reactive<Record<string, string>>({})

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

const buildProductEdit = (product: OrderProduct): ProductEditRow => ({
  safety_claimed: product.safety_claimed === true,
  safety_claim_issues: product.safety_claim_issues ?? '',
})

const buildOrderEdit = (order: Order): OrderEditRow => ({
  order_status: order.order_status || 'received',
})

const ensureProductEdit = (row: SheetRow) => {
  if (!productEdits[row.rowKey]) {
    productEdits[row.rowKey] = buildProductEdit(row.product)
  }
  return productEdits[row.rowKey] as ProductEditRow
}

const ensureOrderEdit = (order: Order) => {
  if (!orderEdits[order.amazon_order_id]) {
    orderEdits[order.amazon_order_id] = buildOrderEdit(order)
  }
  return orderEdits[order.amazon_order_id] as OrderEditRow
}

const syncEdits = () => {
  for (const row of sheetRows.value) {
    productEdits[row.rowKey] = buildProductEdit(row.product)
    orderEdits[row.order.amazon_order_id] = buildOrderEdit(row.order)
  }
}

const visibleRows = computed<VisibleRow[]>(() =>
  sheetRows.value.map((row) => ({
    ...row,
    productEdit: ensureProductEdit(row),
    orderEdit: ensureOrderEdit(row.order),
  })),
)

const getRowStyle = (row: SheetRow) => rowHighlightRulesStore.getRowHighlightStyle(row.order, [row.product])

const formatDate = (value?: string | null) => formatStandardDate(value)
const formatText = (value?: string | null) => value?.trim() || 'Not available'
const formatNumber = (value?: number | null) => (value == null ? 'Not set' : String(value))
const formatLongText = (value?: string | null) => value?.trim() || 'Not available'
const formatProductName = (value?: string | null) => {
  const trimmed = value?.trim()
  if (!trimmed) return 'Unnamed product'
  return trimmed.length > 110 ? `${trimmed.slice(0, 110)}...` : trimmed
}

const setSafetyClaimed = (row: SheetRow, checked: boolean) => {
  productEdits[row.rowKey] = {
    ...ensureProductEdit(row),
    safety_claimed: checked,
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

const saveRow = async (row: VisibleRow) => {
  const productEdit = row.productEdit
  const orderEdit = row.orderEdit

  savingRows[row.rowKey] = true
  rowFeedback[row.rowKey] = ''

  try {
    const orderPayload: UpdateManualFieldsRequest = {
      order_status: orderEdit.order_status || 'received',
    }
    const productPayload: UpdateProductManualFieldsRequest = {
      safety_claimed: productEdit.safety_claimed,
      safety_claim_issues: productEdit.safety_claim_issues.trim() || '',
    }

    await withTimeout(
      ordersStore.updateOrderManualFields(row.order.amazon_order_id, orderPayload),
      SAVE_TIMEOUT_MS,
    )
    await withTimeout(
      ordersStore.updateProductManualFields(row.order.amazon_order_id, row.product.order_product_id, productPayload),
      SAVE_TIMEOUT_MS,
    )

    rowFeedback[row.rowKey] = 'Safety claim details saved'
    syncEdits()
  } catch (error: any) {
    rowFeedback[row.rowKey] = error?.response?.data?.error || error?.message || 'Failed to save row'
  } finally {
    savingRows[row.rowKey] = false
    window.setTimeout(() => {
      if (rowFeedback[row.rowKey] === 'Safety claim details saved') {
        rowFeedback[row.rowKey] = ''
      }
    }, 2500)
  }
}

const applyFilters = async () => {
  const safetyClaimedValue =
    safetyClaimedFilter.value === ''
      ? undefined
      : safetyClaimedFilter.value === 'true'

  await ordersStore.fetchOrders({
    page: filters.value.page,
    limit: filters.value.limit,
    search_key: searchKey.value,
    search_value: searchValue.value.trim() || undefined,
    safety_claimed: safetyClaimedValue,
    ...buildSearchFilters(),
  })
  syncEdits()
}

const applySearch = async () => {
  filters.value.page = 1
  await applyFilters()
}

const clearSearch = async () => {
  searchKey.value = 'order_id'
  searchValue.value = ''
  safetyClaimedFilter.value = ''
  filters.value.page = 1
  await applyFilters()
}

const changePage = async (page: number) => {
  if (page === filters.value.page) return
  filters.value.page = page
  await applyFilters()
}

onMounted(() => {
  void rowHighlightRulesStore.ensureLoaded()
  void applyFilters()
})
</script>

<style scoped>
.safety-page {
  max-width: 1880px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.safety-hero,
.safety-shell {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.safety-hero {
  padding: 1.5rem 1.65rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  background:
    radial-gradient(circle at top right, rgba(251, 146, 60, 0.16), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 237, 0.92));
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

.safety-hero__copy {
  margin: 0.8rem 0 0;
  max-width: 64ch;
  color: #475569;
}

.safety-hero__summary {
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

.safety-shell {
  padding: 1rem;
  display: grid;
  gap: 1rem;
}

.safety-filter-shell {
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

.safety-sheet {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.safety-sheet th,
.safety-sheet td {
  padding: 1rem 0.75rem;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid #e2e8f0;
}

.safety-sheet th {
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

.cell-product {
  min-width: 300px;
}

.cell-customer {
  min-width: 180px;
}

.cell-size {
  min-width: 120px;
}

.cell-notes {
  min-width: 300px;
  max-width: 300px;
  white-space: normal;
  word-break: break-word;
}

.cell-status-edit {
  min-width: 170px;
}

.cell-toggle {
  min-width: 180px;
}

.cell-issues {
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

.product-title {
  color: #0f172a;
  font-weight: 700;
  line-height: 1.45;
  white-space: normal;
  word-break: break-word;
}

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
  min-height: 5.5rem;
  resize: vertical;
}

.sheet-input:focus,
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
  .safety-hero {
    flex-direction: column;
  }

  .safety-hero__summary {
    justify-content: flex-start;
  }

  .safety-filter-shell {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
