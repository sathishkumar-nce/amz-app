<template>
  <div class="extract-return-page">
    <section class="extract-hero">
      <div>
        <p class="eyebrow">Return extractor</p>
        <h1>Extract Return Initiated</h1>
        <p class="extract-hero__copy">
          Paste raw Seller Central return text, save matching orders as return initiated, then review only saved rows.
        </p>
      </div>
      <div class="extract-hero__summary">
        <span class="summary-pill">{{ parsedEntries.length }} parsed</span>
        <span class="summary-pill">{{ savedRows.length }} saved rows</span>
        <span v-if="problemRows.length" class="summary-pill summary-pill--warning">{{ problemRows.length }} issues</span>
      </div>
    </section>

    <section class="extract-card">
      <div class="extract-card__header">
        <div>
          <h2>Paste Raw Return Text</h2>
          <p>Order ID, Merchant SKU, Return Reason, and Buyer Comment are extracted from the pasted text.</p>
        </div>
        <div class="extract-card__actions">
          <button type="button" class="action-button" :disabled="processing || !rawText.trim()" @click="extractSaveAndLoad">
            {{ processing ? 'Saving...' : 'Extract & Save' }}
          </button>
          <button type="button" class="secondary-button" :disabled="processing || !rawText" @click="clearAll">Clear</button>
        </div>
      </div>

      <textarea
        v-model="rawText"
        class="extract-textarea"
        rows="14"
        placeholder="Paste Manage Returns text here..."
      />

      <p v-if="feedback" :class="['extract-message', feedbackToneClass]">{{ feedback }}</p>
    </section>

    <section v-if="problemRows.length" class="extract-card extract-card--warning">
      <header class="section-header">
        <h2>Rows Not Saved</h2>
      </header>
      <div class="problem-list">
        <p v-for="problem in problemRows" :key="`${problem.orderId}-${problem.sku || problem.message}`">
          <strong>{{ problem.orderId }}</strong>
          <span v-if="problem.sku"> / {{ problem.sku }}</span>
          <span> - {{ problem.message }}</span>
        </p>
      </div>
    </section>

    <section class="extract-shell">
      <div v-if="processing" class="empty-state">Saving return initiated rows...</div>
      <div v-else-if="!savedRows.length" class="empty-state">Saved rows will appear here after extraction completes.</div>

      <template v-else>
        <ListUtilityBar
          :total="savedRows.length"
          :page="1"
          :total-pages="1"
          item-label="saved product rows"
          editable
          helper-text="Rows shown here have already been saved as return initiated."
        />

        <div class="sheet-wrap">
          <table class="extract-sheet">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Return Initiated</th>
                <th>Return Initiated Reason</th>
                <th>Saved</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in savedRows" :key="row.rowKey" :style="getRowStyle(row)">
                <td class="cell-order">
                  <div class="order-id-line">{{ row.order.amazon_order_id }}</div>
                  <div class="order-subline">BL #{{ row.order.baselinker_order_id }}</div>
                </td>
                <td class="cell-product">
                  <div class="product-title">{{ formatProductName(row.product.name) }}</div>
                </td>
                <td>{{ row.product.sku || 'Not set' }}</td>
                <td>
                  <label class="toggle">
                    <input v-model="row.returnInitiated" type="checkbox" />
                    <span class="toggle__track"><span class="toggle__thumb" /></span>
                    <span>{{ row.returnInitiated ? 'True' : 'False' }}</span>
                  </label>
                </td>
                <td class="cell-reason">
                  <textarea v-model="row.returnReason" class="sheet-textarea" rows="4" />
                </td>
                <td>
                  <span :class="['status-pill', row.status === 'saved' ? 'status-pill--ok' : 'status-pill--pending']">
                    {{ row.status === 'saving' ? 'Saving...' : 'Saved' }}
                  </span>
                  <p v-if="row.feedback" class="row-feedback">{{ row.feedback }}</p>
                </td>
                <td class="cell-actions">
                  <button type="button" class="save-button" :disabled="row.status === 'saving'" @click="saveDisplayedRow(row)">
                    {{ row.status === 'saving' ? 'Saving...' : 'Save Row' }}
                  </button>
                  <router-link :to="`/orders/${row.order.amazon_order_id}`" class="view-link">View</router-link>
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
import { computed, reactive, ref } from 'vue'
import ListUtilityBar from '@/components/ListUtilityBar.vue'
import { ordersApi } from '@/api/orders'
import { useAmazonRowHighlightRulesStore } from '@/stores/amazonRowHighlightRules'
import type { Order, OrderProduct, UpdateProductManualFieldsRequest } from '@/types'
import { formatProductNameForDisplay } from '@/utils/orderData'

type ParsedReturnEntry = {
  orderId: string
  sku: string
  returnReason: string
  buyerComment: string
  combinedReason: string
}

type SavedReturnRow = {
  rowKey: string
  order: Order
  product: OrderProduct
  returnInitiated: boolean
  returnReason: string
  status: 'saved' | 'saving'
  feedback: string
}

type ProblemRow = {
  orderId: string
  sku?: string
  message: string
}

const ORDER_ID_PATTERN = /\b\d{3}-\d{7}-\d{7}\b/
const ORDER_BLOCK_PATTERN = /Order ID:\s*(\d{3}-\d{7}-\d{7})([\s\S]*?)(?=Order ID:\s*\d{3}-\d{7}-\d{7}|$)/g

const rawText = ref('')
const processing = ref(false)
const feedback = ref('')
const feedbackKind = ref<'info' | 'error'>('info')
const parsedEntries = ref<ParsedReturnEntry[]>([])
const problemRows = ref<ProblemRow[]>([])
const savedRows = reactive<SavedReturnRow[]>([])
const rowHighlightRulesStore = useAmazonRowHighlightRulesStore()

const feedbackToneClass = computed(() => feedbackKind.value === 'error' ? 'extract-message--error' : 'extract-message--info')
const formatProductName = formatProductNameForDisplay

const clearAll = () => {
  rawText.value = ''
  parsedEntries.value = []
  problemRows.value = []
  savedRows.splice(0)
  feedback.value = ''
  feedbackKind.value = 'info'
}

const extractSaveAndLoad = async () => {
  const entries = parseReturnEntries(rawText.value)
  parsedEntries.value = entries
  problemRows.value = []
  savedRows.splice(0)
  feedback.value = ''
  feedbackKind.value = 'info'

  if (!entries.length) {
    feedback.value = 'No return entries were found. Make sure the pasted text contains Order ID, Return Reason, and Buyer Comment fields.'
    feedbackKind.value = 'error'
    return
  }

  processing.value = true

  try {
    const uniqueOrderIds = [...new Set(entries.map((entry) => entry.orderId))]
    const response = await ordersApi.getByIDs(uniqueOrderIds)
    const orderById = new Map(
      response.results
        .filter((result) => result.found && result.order)
        .map((result) => [result.requested_amazon_order_id, result.order as Order]),
    )

    for (const missingOrderId of response.missing_amazon_order_ids) {
      problemRows.value.push({ orderId: missingOrderId, message: 'Order ID not found in DB' })
    }

    for (const entry of entries) {
      const order = orderById.get(entry.orderId)
      if (!order) continue

      const product = findMatchingProduct(order, entry)
      if (!product) {
        problemRows.value.push({
          orderId: entry.orderId,
          sku: entry.sku,
          message: entry.sku ? 'Merchant SKU was not found on this order' : 'No unique product match found',
        })
        continue
      }

      try {
        const updatedOrder = await saveProductReturnInitiated(order.amazon_order_id, product.order_product_id, entry.combinedReason)
        const updatedProduct = updatedOrder.products?.find((candidate) => candidate.order_product_id === product.order_product_id) || {
          ...product,
          return_initiated: true,
          return_initiated_reason: entry.combinedReason,
        }
        savedRows.push({
          rowKey: `${order.amazon_order_id}:${product.order_product_id}`,
          order: updatedOrder,
          product: updatedProduct,
          returnInitiated: updatedProduct.return_initiated === true,
          returnReason: updatedProduct.return_initiated_reason || entry.combinedReason,
          status: 'saved',
          feedback: 'Saved',
        })
      } catch (error: any) {
        problemRows.value.push({
          orderId: entry.orderId,
          sku: entry.sku,
          message: error?.response?.data?.error || error?.message || 'Failed to save return initiated fields',
        })
      }
    }

    feedback.value = `Parsed ${entries.length} entries and saved ${savedRows.length} product rows.`
    if (problemRows.value.length) {
      feedback.value += ` ${problemRows.value.length} entries need attention.`
    }
  } catch (error: any) {
    feedback.value = error?.response?.data?.error || error?.message || 'Failed to extract and save return initiated rows.'
    feedbackKind.value = 'error'
  } finally {
    processing.value = false
  }
}

const saveDisplayedRow = async (row: SavedReturnRow) => {
  row.status = 'saving'
  row.feedback = ''

  try {
    const updatedOrder = await saveProductReturnInitiated(row.order.amazon_order_id, row.product.order_product_id, row.returnReason, row.returnInitiated)
    const updatedProduct = updatedOrder.products?.find((product) => product.order_product_id === row.product.order_product_id)
    row.order = updatedOrder
    if (updatedProduct) {
      row.product = updatedProduct
      row.returnInitiated = updatedProduct.return_initiated === true
      row.returnReason = updatedProduct.return_initiated_reason || row.returnReason
    }
    row.feedback = 'Saved'
  } catch (error: any) {
    row.feedback = error?.response?.data?.error || error?.message || 'Save failed'
  } finally {
    row.status = 'saved'
  }
}

const saveProductReturnInitiated = (
  amazonOrderId: string,
  orderProductId: number,
  returnReason: string,
  returnInitiated = true,
) => {
  const payload: UpdateProductManualFieldsRequest = {
    return_initiated: returnInitiated,
    return_initiated_reason: returnReason.trim(),
  }
  return ordersApi.updateProductManualFields(amazonOrderId, orderProductId, payload)
}

const findMatchingProduct = (order: Order, entry: ParsedReturnEntry) => {
  const products = (order.products || []).filter((product) => !product.is_discount_line)
  if (!entry.sku) return products.length === 1 ? products[0] : null

  const normalizedSku = normalizeSku(entry.sku)
  return products.find((product) => normalizeSku(product.sku) === normalizedSku) || null
}

const getRowStyle = (row: SavedReturnRow) => rowHighlightRulesStore.getRowHighlightStyle(row.order, [row.product])

function parseReturnEntries(value: string): ParsedReturnEntry[] {
  const entries: ParsedReturnEntry[] = []
  const seenKeys = new Set<string>()

  for (const match of value.matchAll(ORDER_BLOCK_PATTERN)) {
    const orderId = match[1] || ''
    const block = match[2] || ''
    if (!ORDER_ID_PATTERN.test(orderId)) continue

    const sku = extractField(block, 'Merchant SKU', ['Return Reason', 'Request Date', 'Order Date'])
    const returnReason = extractField(block, 'Return Reason', ['Buyer Comment', 'Request Date', 'Order Date'])
    const buyerComment = extractField(block, 'Buyer Comment', ['Request Date', 'Order Date', 'Approval Date'])
    const combinedReason = buildCombinedReason(returnReason, buyerComment)
    const key = `${orderId}:${normalizeSku(sku) || 'no-sku'}`

    if (seenKeys.has(key)) continue
    seenKeys.add(key)

    entries.push({
      orderId,
      sku,
      returnReason,
      buyerComment,
      combinedReason,
    })
  }

  return entries
}

function extractField(block: string, label: string, nextLabels: string[]) {
  const nextPattern = nextLabels.map(escapeRegExp).join('|')
  const pattern = new RegExp(`${escapeRegExp(label)}:\\s*([\\s\\S]*?)(?=\\n\\s*(?:${nextPattern}):|$)`, 'i')
  const match = block.match(pattern)
  return normalizeFieldValue(match?.[1] || '')
}

function normalizeFieldValue(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
}

function buildCombinedReason(returnReason: string, buyerComment: string) {
  return [
    returnReason ? `Return Reason: ${returnReason}` : '',
    buyerComment ? `Buyer Comment: ${buyerComment}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function normalizeSku(value?: string | null) {
  return String(value || '').trim().toLowerCase()
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
</script>

<style scoped>
.extract-return-page {
  max-width: 1720px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.extract-hero,
.extract-card,
.extract-shell {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.extract-hero {
  padding: 1.5rem 1.65rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  background:
    radial-gradient(circle at top right, rgba(251, 146, 60, 0.18), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 247, 237, 0.88));
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

.extract-hero__copy,
.extract-card__header p {
  margin: 0.8rem 0 0;
  max-width: 64ch;
  color: #475569;
}

.extract-hero__summary,
.extract-card__actions {
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

.summary-pill--warning,
.status-pill--pending {
  background: #fef3c7;
  color: #92400e;
}

.status-pill--ok {
  background: #dcfce7;
  color: #166534;
}

.extract-card,
.extract-shell {
  padding: 1rem;
}

.extract-card {
  display: grid;
  gap: 0.9rem;
}

.extract-card--warning {
  border-color: rgba(245, 158, 11, 0.28);
}

.extract-card__header,
.section-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.extract-textarea,
.sheet-textarea {
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #ffffff;
  color: #0f172a;
  padding: 0.75rem 0.85rem;
  font: inherit;
}

.extract-textarea {
  min-height: 16rem;
  resize: vertical;
}

.sheet-textarea {
  min-height: 6rem;
  resize: vertical;
}

.action-button,
.secondary-button,
.save-button {
  min-height: 2.8rem;
  border-radius: 14px;
  border: 0;
  font: inherit;
  font-weight: 800;
  padding: 0 1rem;
  cursor: pointer;
}

.action-button,
.save-button {
  background: #0f766e;
  color: #ffffff;
}

.secondary-button {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #f8fafc;
  color: #334155;
}

.action-button:disabled,
.secondary-button:disabled,
.save-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

.extract-message,
.problem-list p,
.row-feedback {
  margin: 0;
  font-weight: 700;
}

.extract-message--info,
.row-feedback {
  color: #0f766e;
}

.extract-message--error,
.problem-list p {
  color: #b91c1c;
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #64748b;
  font-weight: 700;
}

.sheet-wrap {
  overflow-x: auto;
}

.extract-sheet {
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.extract-sheet th,
.extract-sheet td {
  padding: 0.85rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: top;
}

.extract-sheet th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f8fafc;
  color: #0f172a;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.78rem;
}

.cell-order {
  min-width: 170px;
}

.cell-product {
  min-width: 220px;
}

.cell-reason {
  min-width: 420px;
}

.cell-actions {
  min-width: 150px;
}

.order-id-line,
.product-title {
  font-weight: 800;
  color: #0f172a;
}

.order-subline {
  margin-top: 0.2rem;
  color: #64748b;
  font-size: 0.85rem;
}

.toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  font-weight: 800;
}

.toggle input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  pointer-events: none;
}

.toggle__track {
  width: 3.1rem;
  height: 1.75rem;
  border-radius: 999px;
  background: #cbd5e1;
  padding: 0.18rem;
}

.toggle__thumb {
  display: block;
  width: 1.38rem;
  height: 1.38rem;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.18);
  transition: transform 160ms ease;
}

.toggle input:checked + .toggle__track {
  background: #0f766e;
}

.toggle input:checked + .toggle__track .toggle__thumb {
  transform: translateX(1.35rem);
}

.view-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.8rem;
  min-width: 100%;
  margin-top: 0.55rem;
  border-radius: 14px;
  background: #e2e8f0;
  color: #0f172a;
  font-weight: 800;
}

@media (max-width: 900px) {
  .extract-hero,
  .extract-card__header {
    flex-direction: column;
  }
}
</style>
