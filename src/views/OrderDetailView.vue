<template>
  <div class="order-detail-page">
    <div v-if="loading" class="detail-empty">
      <p>Loading order details...</p>
    </div>

    <div v-else-if="!order" class="detail-empty">
      <p>Order not found.</p>
    </div>

    <div v-else class="detail-layout">
      <section class="detail-hero">
        <div>
          <router-link to="/orders" class="back-link">← Back to Orders</router-link>
          <p class="eyebrow">Amazon order workspace</p>
          <h1>{{ order.amazon_order_id }}</h1>
          <p class="hero-copy">
            Order-level information stays here. Every product below carries its own dimensions and workflow state.
          </p>
        </div>

        <div class="hero-meta">
          <div class="meta-card">
            <span class="meta-card__label">Customer</span>
            <strong>{{ order.delivery_fullname || order.user_login || 'Unknown customer' }}</strong>
            <small>{{ order.phone || order.email || 'No contact info' }}</small>
          </div>
          <div class="meta-card">
            <span class="meta-card__label">Order Status</span>
            <strong>Status #{{ order.order_status_id }}</strong>
            <small>{{ formatDate(order.date_confirmed || order.date_add) }}</small>
          </div>
        </div>
      </section>

      <section class="info-card">
        <div class="section-header">
          <div>
            <p class="eyebrow">Order-level fields</p>
            <h2>General Order Notes</h2>
          </div>
          <button type="button" @click.stop.prevent="saveOrderMeta" :disabled="savingOrderMeta" class="save-button">
            {{ savingOrderMeta ? 'Saving...' : 'Save Order Meta' }}
          </button>
        </div>

        <div v-if="orderMetaMessage" class="save-message save-message--success">{{ orderMetaMessage }}</div>
        <div v-if="orderMetaError" class="save-message save-message--error">{{ orderMetaError }}</div>

        <dl class="info-grid">
          <div><dt>Amazon Order ID</dt><dd>{{ order.amazon_order_id }}</dd></div>
          <div><dt>BaseLinker Order ID</dt><dd>{{ order.baselinker_order_id }}</dd></div>
          <div><dt>Confirmed Date</dt><dd>{{ formatDate(order.date_confirmed || order.date_add) }}</dd></div>
          <div><dt>Location</dt><dd>{{ formatLocation(order.delivery_city, order.delivery_state) }}</dd></div>
          <div><dt>Last Updated By</dt><dd>{{ order.updated_by || 'system' }}</dd></div>
        </dl>

        <div class="meta-form">
          <label class="field">
            <span>Priority</span>
            <select v-model="orderMeta.priority">
              <option value="p1">P1</option>
              <option value="p2">P2</option>
              <option value="p3">P3</option>
              <option value="p4">P4</option>
            </select>
          </label>

          <label class="field">
            <span>Order Status</span>
            <select v-model="orderMeta.order_status">
              <option value="received">received</option>
              <option value="manufactured">manufactured</option>
              <option value="cancelled">cancelled</option>
              <option value="returned">returned</option>
            </select>
          </label>

          <label class="field field--wide">
            <span>Internal Notes</span>
            <textarea v-model="orderMeta.internal_notes" rows="4" />
          </label>
        </div>
      </section>

      <section class="products-section">
        <div class="section-header">
          <div>
            <p class="eyebrow">Product-level workflow</p>
            <h2>Products</h2>
          </div>
        </div>

        <div v-if="!order.products?.length" class="detail-empty">
          <p>No products available for this order.</p>
        </div>

        <div v-else class="product-grid">
          <article v-for="product in order.products" :key="product.order_product_id" class="product-card">
            <div class="product-card__title">
              <strong>{{ product.sku || 'No SKU' }}</strong>
              <span>{{ product.name || 'Unnamed product' }}</span>
              <small>Qty {{ product.quantity ?? 0 }} · Thickness {{ product.thickness || 'Not set' }} · Updated by {{ product.updated_by || 'system' }}</small>
            </div>

            <div class="product-metrics">
              <div><label>Default Width (in)</label><span>{{ formatNumber(product.default_width_in_inches) }}</span></div>
              <div><label>Default Length (in)</label><span>{{ formatNumber(product.default_length_in_inches) }}</span></div>
              <div><label>Default Width (mm)</label><span>{{ formatNumber(product.default_width_in_mm) }}</span></div>
              <div><label>Default Length (mm)</label><span>{{ formatNumber(product.default_length_in_mm) }}</span></div>
            </div>

            <div class="product-form">
              <label class="field">
                <span>Default Width (in)</span>
                <input v-model="getProductEdit(product).default_width_in_inches" type="number" step="0.01" />
              </label>
              <label class="field">
                <span>Default Length (in)</span>
                <input v-model="getProductEdit(product).default_length_in_inches" type="number" step="0.01" />
              </label>
              <label class="field">
                <span>Default Width (mm)</span>
                <input v-model="getProductEdit(product).default_width_in_mm" type="number" step="0.01" />
              </label>
              <label class="field">
                <span>Default Length (mm)</span>
                <input v-model="getProductEdit(product).default_length_in_mm" type="number" step="0.01" />
              </label>
              <label class="field">
                <span>Customer Width (in)</span>
                <input v-model="getProductEdit(product).customer_width_in_inches" type="number" step="0.01" />
              </label>
              <label class="field">
                <span>Customer Length (in)</span>
                <input v-model="getProductEdit(product).customer_length_in_inches" type="number" step="0.01" />
              </label>
              <label class="field">
                <span>Customer Width (mm)</span>
                <input v-model="getProductEdit(product).customer_width_in_mm" type="number" step="0.01" />
              </label>
              <label class="field">
                <span>Customer Length (mm)</span>
                <input v-model="getProductEdit(product).customer_length_in_mm" type="number" step="0.01" />
              </label>
              <label class="field">
                <span>Issue Status</span>
                <select v-model="getProductEdit(product).issue_status">
                  <option value="none">none</option>
                  <option value="has_issues">has_issues</option>
                  <option value="replacement_placed">replacement_placed</option>
                  <option value="converted_direct">converted_direct</option>
                  <option value="refunded">refunded</option>
                </select>
              </label>
              <label class="field">
                <span>Return Status</span>
                <select v-model="getProductEdit(product).return_status">
                  <option value="none">none</option>
                  <option value="returned">returned</option>
                  <option value="replacement_placed">replacement_placed</option>
                  <option value="converted_direct">converted_direct</option>
                  <option value="refunded">refunded</option>
                </select>
              </label>
              <label class="field">
                <span>Safety Claim</span>
                <select v-model="getProductEdit(product).safety_claim">
                  <option value="none">none</option>
                  <option value="pending">pending</option>
                  <option value="done">done</option>
                  <option value="not_needed">not_needed</option>
                  <option value="issues">issues</option>
                </select>
              </label>
              <label class="field field--checkbox">
                <input v-model="getProductEdit(product).is_round" type="checkbox" />
                <span>Round product</span>
              </label>
              <label class="field field--wide">
                <span>Issue Reason</span>
                <textarea v-model="getProductEdit(product).issue_reason" rows="3" />
              </label>
              <label class="field field--wide">
                <span>Issue Follow-up Actions</span>
                <textarea v-model="getProductEdit(product).issue_follow_up_actions" rows="3" />
              </label>
              <label class="field field--wide">
                <span>Return Reason</span>
                <textarea v-model="getProductEdit(product).return_reason" rows="3" />
              </label>
              <label class="field field--wide">
                <span>Return Follow-up Actions</span>
                <textarea v-model="getProductEdit(product).return_follow_up_actions" rows="3" />
              </label>
              <label class="field field--wide">
                <span>Return Notes</span>
                <textarea v-model="getProductEdit(product).return_notes" rows="3" />
              </label>
              <label class="field field--wide">
                <span>Safety Claim Notes</span>
                <textarea v-model="getProductEdit(product).safety_claim_notes" rows="3" />
              </label>
              <label class="field field--wide">
                <span>Corner Radius and Notes</span>
                <textarea v-model="getProductEdit(product).corner_radius_and_notes" rows="3" />
              </label>

              <button type="button" @click.stop.prevent="saveProduct(product.order_product_id)" :disabled="savingProducts[product.order_product_id]" class="save-button">
                {{ savingProducts[product.order_product_id] ? 'Saving...' : 'Save Product' }}
              </button>
              <div v-if="productMessages[product.order_product_id]" class="save-message save-message--success">{{ productMessages[product.order_product_id] }}</div>
              <div v-if="productErrors[product.order_product_id]" class="save-message save-message--error">{{ productErrors[product.order_product_id] }}</div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useOrdersStore } from '@/stores/orders'
import type { Order, OrderProduct, UpdateManualFieldsRequest, UpdateProductManualFieldsRequest } from '@/types'
import { formatStandardDate } from '@/utils/orderData'

type ProductEditRow = {
  default_width_in_inches: string
  default_length_in_inches: string
  default_width_in_mm: string
  default_length_in_mm: string
  customer_width_in_inches: string
  customer_length_in_inches: string
  customer_width_in_mm: string
  customer_length_in_mm: string
  corner_radius_and_notes: string
  return_status: string
  return_reason: string
  return_follow_up_actions: string
  return_notes: string
  issue_status: string
  issue_reason: string
  issue_follow_up_actions: string
  safety_claim: string
  safety_claim_notes: string
  is_round: boolean
}

const route = useRoute()
const store = useOrdersStore()
const loading = ref(true)
const savingOrderMeta = ref(false)
const orderMetaMessage = ref('')
const orderMetaError = ref('')
const order = ref<Order | null>(null)
const SAVE_TIMEOUT_MS = 15000

const orderMeta = ref({
  priority: 'p3',
  order_status: 'received',
  internal_notes: '',
})

const productEdits = reactive<Record<number, ProductEditRow>>({})
const savingProducts = reactive<Record<number, boolean>>({})
const productMessages = reactive<Record<number, string>>({})
const productErrors = reactive<Record<number, string>>({})

const formatDate = (dateString?: string | null) => formatStandardDate(dateString)
const formatLocation = (city?: string | null, state?: string | null) => [city, state].filter(Boolean).join(' / ') || 'Not available'
const formatNumber = (value?: number | null) => (value == null ? 'Not set' : String(value))
const nullishToString = (value?: string | null) => value ?? ''
const nullishNumberToString = (value?: number | null) => (value == null ? '' : String(value))

const applyOrderMeta = (currentOrder: Order) => {
  orderMeta.value = {
    priority: currentOrder.priority || 'p3',
    order_status: currentOrder.order_status || 'received',
    internal_notes: nullishToString(currentOrder.internal_notes),
  }
}

const buildProductEdit = (product: OrderProduct): ProductEditRow => ({
  default_width_in_inches: nullishNumberToString(product.default_width_in_inches),
  default_length_in_inches: nullishNumberToString(product.default_length_in_inches),
  default_width_in_mm: nullishNumberToString(product.default_width_in_mm),
  default_length_in_mm: nullishNumberToString(product.default_length_in_mm),
  customer_width_in_inches: nullishNumberToString(product.customer_width_in_inches),
  customer_length_in_inches: nullishNumberToString(product.customer_length_in_inches),
  customer_width_in_mm: nullishNumberToString(product.customer_width_in_mm),
  customer_length_in_mm: nullishNumberToString(product.customer_length_in_mm),
  corner_radius_and_notes: nullishToString(product.corner_radius_and_notes),
  return_status: product.return_status || 'none',
  return_reason: nullishToString(product.return_reason),
  return_follow_up_actions: nullishToString(product.return_follow_up_actions),
  return_notes: nullishToString(product.return_notes),
  issue_status: product.issue_status || 'none',
  issue_reason: nullishToString(product.issue_reason),
  issue_follow_up_actions: nullishToString(product.issue_follow_up_actions),
  safety_claim: product.safety_claim || 'none',
  safety_claim_notes: nullishToString(product.safety_claim_notes),
  is_round: !!product.is_round,
})

const syncProductEdits = (currentOrder: Order) => {
  for (const product of currentOrder.products || []) {
    productEdits[product.order_product_id] = buildProductEdit(product)
  }
}

const getProductEdit = (product: OrderProduct) => {
  if (!productEdits[product.order_product_id]) {
    productEdits[product.order_product_id] = buildProductEdit(product)
  }
  return productEdits[product.order_product_id] as ProductEditRow
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

const loadOrder = async () => {
  loading.value = true
  try {
    const loaded = await store.fetchOrderById(route.params.id as string)
    order.value = loaded
    if (loaded) {
      applyOrderMeta(loaded)
      syncProductEdits(loaded)
    }
  } finally {
    loading.value = false
  }
}

const saveOrderMeta = async () => {
  if (!order.value) return
  savingOrderMeta.value = true
  orderMetaMessage.value = ''
  orderMetaError.value = ''

  try {
    const payload: UpdateManualFieldsRequest = {
      priority: orderMeta.value.priority,
      order_status: orderMeta.value.order_status,
      internal_notes: orderMeta.value.internal_notes || undefined,
    }

    const updated = await withTimeout(
      store.updateOrderManualFields(order.value.amazon_order_id, payload),
      SAVE_TIMEOUT_MS,
    )
    if (updated) {
      order.value = updated
      applyOrderMeta(updated)
      syncProductEdits(updated)
    }
    orderMetaMessage.value = 'Order meta saved.'
  } catch (error: any) {
    orderMetaError.value = error.response?.data?.error || error.message || 'Failed to save order meta.'
  } finally {
    savingOrderMeta.value = false
  }
}

const saveProduct = async (orderProductId: number) => {
  if (!order.value) return
  const edit = productEdits[orderProductId]
  if (!edit) return
  savingProducts[orderProductId] = true
  productMessages[orderProductId] = ''
  productErrors[orderProductId] = ''

  try {
    const payload: UpdateProductManualFieldsRequest = {
      default_width_in_inches: toOptionalNumber(edit.default_width_in_inches),
      default_length_in_inches: toOptionalNumber(edit.default_length_in_inches),
      default_width_in_mm: toOptionalNumber(edit.default_width_in_mm),
      default_length_in_mm: toOptionalNumber(edit.default_length_in_mm),
      customer_width_in_inches: toOptionalNumber(edit.customer_width_in_inches),
      customer_length_in_inches: toOptionalNumber(edit.customer_length_in_inches),
      customer_width_in_mm: toOptionalNumber(edit.customer_width_in_mm),
      customer_length_in_mm: toOptionalNumber(edit.customer_length_in_mm),
      corner_radius_and_notes: edit.corner_radius_and_notes || undefined,
      return_status: edit.return_status,
      return_reason: edit.return_reason || undefined,
      return_follow_up_actions: edit.return_follow_up_actions || undefined,
      return_notes: edit.return_notes || undefined,
      issue_status: edit.issue_status,
      issue_reason: edit.issue_reason || undefined,
      issue_follow_up_actions: edit.issue_follow_up_actions || undefined,
      safety_claim: edit.safety_claim,
      safety_claim_notes: edit.safety_claim_notes || undefined,
      is_round: edit.is_round,
    }

    const updated = await withTimeout(
      store.updateProductManualFields(order.value.amazon_order_id, orderProductId, payload),
      SAVE_TIMEOUT_MS,
    )
    if (updated) {
      order.value = updated
      applyOrderMeta(updated)
      syncProductEdits(updated)
    }
    productMessages[orderProductId] = 'Product saved.'
  } catch (error: any) {
    productErrors[orderProductId] = error.response?.data?.error || error.message || 'Failed to save product.'
  } finally {
    savingProducts[orderProductId] = false
  }
}

onMounted(() => {
  loadOrder()
})
</script>

<style scoped>
.order-detail-page { max-width: 1320px; margin: 0 auto; }
.detail-empty { background: rgba(255,255,255,.9); border:1px solid rgba(15,23,42,.08); border-radius:24px; padding:3rem; text-align:center; color:#64748b; }
.detail-layout { display:grid; gap:1.25rem; }
.detail-hero,.info-card,.products-section { background: rgba(255,255,255,.9); border:1px solid rgba(15,23,42,.08); border-radius:28px; box-shadow:0 20px 45px rgba(15,23,42,.08); }
.detail-hero { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(280px,.75fr); gap:1rem; padding:1.75rem; }
.back-link { display:inline-block; margin-bottom:.85rem; color:#0f766e; font-weight:700; }
.eyebrow { margin:0 0 .35rem; text-transform:uppercase; letter-spacing:.12em; font-size:.72rem; font-weight:800; color:#0f766e; }
h1,h2 { margin:0; color:#0f172a; }
h1 { font-size:2.2rem; font-weight:900; }
.hero-copy { margin:.8rem 0 0; color:#64748b; max-width:58ch; }
.hero-meta { display:grid; gap:.9rem; }
.meta-card { border-radius:22px; padding:1rem; background:linear-gradient(180deg,#fff,#f8fafc); border:1px solid rgba(148,163,184,.2); }
.meta-card__label { display:block; margin-bottom:.35rem; color:#0f766e; font-size:.78rem; text-transform:uppercase; letter-spacing:.08em; font-weight:800; }
.meta-card strong { display:block; color:#0f172a; }
.meta-card small { display:block; margin-top:.3rem; color:#64748b; }
.info-card,.products-section { padding:1.5rem; }
.section-header { display:flex; justify-content:space-between; gap:1rem; align-items:flex-start; }
.save-button { border:0; border-radius:16px; min-height:3rem; padding:0 1rem; background:linear-gradient(135deg,#0f766e,#115e59); color:#fff; font-weight:800; cursor:pointer; }
.save-button:disabled { opacity:.6; cursor:wait; }
.save-message { margin-top:1rem; border-radius:16px; padding:.85rem 1rem; font-weight:700; }
.save-message--success { background:#dcfce7; color:#166534; }
.save-message--error { background:#fee2e2; color:#b91c1c; }
.info-grid { margin-top:1rem; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; }
.info-grid dt { font-size:.82rem; color:#64748b; }
.info-grid dd { margin:.35rem 0 0; color:#0f172a; font-weight:700; }
.meta-form,.product-form { margin-top:1.2rem; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:1rem; }
.field { display:grid; gap:.4rem; }
.field--wide { grid-column:1 / -1; }
.field span { color:#334155; font-size:.88rem; font-weight:700; }
.field input,.field select,.field textarea { width:100%; border-radius:16px; border:1px solid rgba(148,163,184,.35); background:#fff; padding:.8rem .95rem; color:#0f172a; font:inherit; }
.field textarea { resize:vertical; }
.field--checkbox { display:flex; align-items:center; gap:.75rem; min-height:3rem; }
.field--checkbox input { width:auto; }
.product-grid { margin-top:1rem; display:grid; grid-template-columns:repeat(auto-fit,minmax(380px,1fr)); gap:1rem; }
.product-card { border:1px solid rgba(148,163,184,.2); border-radius:18px; padding:1rem; display:grid; gap:.8rem; background:linear-gradient(180deg,#fff,#f8fbff); }
.product-card__title { display:grid; gap:.18rem; }
.product-card__title strong { color:#0f172a; }
.product-card__title span,.product-card__title small { color:#64748b; }
.product-metrics { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.55rem; }
.product-metrics div { border:1px solid rgba(226,232,240,.95); border-radius:14px; padding:.55rem .7rem; background:#fff; }
.product-metrics label { display:block; margin-bottom:.15rem; font-size:.72rem; color:#64748b; text-transform:uppercase; letter-spacing:.08em; }
.product-metrics span { font-weight:700; color:#0f172a; }
@media (max-width: 900px) { .detail-hero,.info-grid,.meta-form,.product-form { grid-template-columns:1fr; } .section-header { flex-direction:column; } }
</style>
