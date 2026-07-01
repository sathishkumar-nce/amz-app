<template>
  <div class="direct-form-page">
    <section class="form-card">
      <div class="form-header">
        <div>
          <p class="eyebrow">Direct order</p>
          <h1>{{ isEdit ? 'Edit' : 'Create' }} Direct Order</h1>
          <p class="intro-copy">Capture the order first. Defaults are prefilled for the common Tekgien direct-order flow, and you can override any of them.</p>
        </div>
        <router-link to="/direct-orders" class="back-link">Back to Direct Orders</router-link>
      </div>

      <form class="direct-order-form" @submit.prevent="handleSubmit">
        <section class="form-section">
          <div class="section-heading">
            <div>
              <h2>Order Basics</h2>
              <p>Start with the important order-level controls.</p>
            </div>
            <span class="section-badge">Mandatory first</span>
          </div>

          <div class="section-grid section-grid--compact">
            <label>
              <span>Order ID</span>
              <div class="inline-field">
                <input v-model.trim="form.order_id" :disabled="isEdit" required placeholder="DO-000123" />
                <button v-if="!isEdit" type="button" class="mini-button" @click="regenerateOrderId">Refresh</button>
              </div>
            </label>
            <label>
              <span>Invoice Date</span>
              <input v-model="form.invoice_date" type="date" class="input-compact" />
            </label>
            <label>
              <span>Source</span>
              <select v-model="form.source" class="input-compact">
                <option v-for="source in sourceOptions" :key="source" :value="source">{{ source }}</option>
              </select>
            </label>
              <label>
                <span>Order Status</span>
                <select v-model="form.order_status" class="input-compact">
                <option v-for="status in orderStatusOptions" :key="status" :value="status">{{ status }}</option>
              </select>
            </label>
            <label>
              <span>Payment Status</span>
              <select v-model="form.payment_status" class="input-compact">
                <option v-for="status in paymentStatusOptions" :key="status" :value="status">{{ status }}</option>
              </select>
            </label>
            <label>
              <span>Priority</span>
              <select v-model="form.priority" class="input-compact">
                <option v-for="priority in priorityOptions" :key="priority" :value="priority">{{ priority }}</option>
              </select>
            </label>
          </div>
        </section>

        <section class="form-section">
          <div class="section-heading">
            <div>
              <h2>Customer Details</h2>
              <p>Recipient details for the order and shipment.</p>
            </div>
          </div>

          <div class="section-grid">
            <label>
              <span>Customer Name</span>
              <input v-model.trim="form.customer_name" placeholder="Ravi Kumar" />
            </label>
            <label>
              <span>Mobile</span>
              <input v-model.trim="form.mobile" placeholder="9876543210" />
            </label>
            <label>
              <span>Alternate Mobile</span>
              <input v-model.trim="form.alternate_mobile" placeholder="9988776655" />
            </label>
            <label>
              <span>Email</span>
              <input v-model.trim="form.email" type="email" placeholder="customer@example.com" />
            </label>
            <label class="label-span-2">
              <span>Address</span>
              <textarea v-model.trim="form.address" rows="3" placeholder="12 MG Road, Near Metro Station" />
            </label>
            <label>
              <span>City</span>
              <input v-model.trim="form.city" placeholder="Bengaluru" />
            </label>
            <label>
              <span>State</span>
              <input v-model.trim="form.state" placeholder="Karnataka" />
            </label>
            <label>
              <span>Pincode</span>
              <input v-model.trim="form.pincode" placeholder="560001" class="input-compact" maxlength="6" inputmode="numeric" />
              <small v-if="pincodeLookupMessage" :class="pincodeLookupClass">{{ pincodeLookupMessage }}</small>
            </label>
            <label>
              <span>Country</span>
              <input v-model.trim="form.country" placeholder="India" class="input-compact" />
            </label>
            <label class="label-span-2">
              <span>Landmark</span>
              <input v-model.trim="form.landmark" placeholder="Near metro pillar 14" />
            </label>
          </div>

          <div v-if="pincodeLookupResult" class="lookup-card">
            <div class="lookup-card__header">
              <strong>Delhivery Address Suggestion</strong>
              <span :class="['lookup-chip', pincodeLookupResult.serviceable ? 'lookup-chip--ok' : 'lookup-chip--warn']">
                {{ pincodeLookupResult.serviceable ? 'Serviceable' : 'Check manually' }}
              </span>
            </div>
            <p class="lookup-card__copy">
              Auto-filled from pincode. You can keep these values or edit them before saving.
            </p>
            <div class="lookup-card__grid">
              <div><span>District</span><strong>{{ pincodeLookupResult.district || 'Not returned' }}</strong></div>
              <div><span>State</span><strong>{{ pincodeLookupResult.state || 'Not returned' }}</strong></div>
              <div><span>Country</span><strong>{{ pincodeLookupResult.country || 'India' }}</strong></div>
              <div><span>COD</span><strong>{{ pincodeLookupResult.cod ? 'Available' : 'Unavailable' }}</strong></div>
            </div>
          </div>
        </section>

        <section class="form-section">
          <div class="section-heading">
            <div>
              <h2>Shipment And Courier</h2>
              <p>Courier, pickup, package, and invoice details.</p>
            </div>
          </div>

          <div class="section-grid section-grid--compact">
            <label>
              <span>Courier Type</span>
              <select v-model="courierTypeSelection" class="input-compact">
                <option v-for="option in courierTypeOptions" :key="option" :value="option">{{ option }}</option>
                <option value="custom">custom</option>
              </select>
            </label>
            <label v-if="courierTypeSelection === 'custom'">
              <span>Custom Courier Type</span>
              <input v-model.trim="form.courier_type" placeholder="Enter courier type" class="input-compact" />
            </label>
            <label>
              <span>Pickup Location</span>
              <input v-model.trim="form.pickup_location" placeholder="Tekgien Softwares" />
            </label>
            <label>
              <span>Service Type</span>
              <select v-model="form.service_type">
                <option value="surface">surface</option>
                <option value="express">express</option>
              </select>
            </label>
            <label>
              <span>Package Count</span>
              <input v-model.number="form.package_count" type="number" min="1" step="1" placeholder="1" class="input-compact" />
            </label>
            <label>
              <span>AWB</span>
              <input v-model.trim="form.awb" placeholder="Leave empty for Delhivery auto-allocation" class="input-compact" />
            </label>
            <label>
              <span>Shipment Weight (g)</span>
              <input v-model.number="form.total_weight" type="number" min="0" step="1" placeholder="650" class="input-compact" />
            </label>
            <label>
              <span>Total Amount</span>
              <input v-model.number="form.amount" type="number" min="0" step="0.01" placeholder="1499" class="input-compact" />
            </label>
            <label>
              <span>COD Amount</span>
              <input v-model.number="form.cod_amount" type="number" min="0" step="0.01" placeholder="1499 for COD, 0 for prepaid" class="input-compact" />
            </label>
            <label>
              <span>Advance Amount</span>
              <input v-model.number="form.advance_amount" type="number" min="0" step="0.01" placeholder="500" class="input-compact" />
            </label>
            <label>
              <span>Length (cm)</span>
              <input v-model.number="form.length_cm" type="number" min="0" step="0.01" placeholder="32" class="input-compact" />
            </label>
            <label>
              <span>Width (cm)</span>
              <input v-model.number="form.width_cm" type="number" min="0" step="0.01" placeholder="24" class="input-compact" />
            </label>
            <label>
              <span>Height (cm)</span>
              <input v-model.number="form.height_cm" type="number" min="0" step="0.01" placeholder="3" class="input-compact" />
            </label>
          </div>
        </section>

        <section class="form-section">
          <div class="section-heading">
            <div>
              <h2>Item Details</h2>
              <p>Items are optional while saving the order. Add them before creating a Delhivery forward order.</p>
            </div>
            <button type="button" class="btn-secondary" @click="addItem">Add Item</button>
          </div>

          <div v-if="form.items.length === 0" class="empty-items-note">
            Save can work without items. Add at least one item with HSN, weight, and dimensions before forwarding to Delhivery.
          </div>

          <div class="item-card" v-for="(item, index) in form.items" :key="index">
            <div class="item-card-header">
              <strong>Item {{ index + 1 }}</strong>
              <button type="button" class="danger-link" @click="removeItem(index)">Remove</button>
            </div>
            <div class="section-grid">
              <label class="label-span-2">
                <span>Item Name</span>
                <input v-model.trim="item.item" placeholder="Mr.Clear Table covers custom size" />
              </label>
              <label>
                <span>Quantity</span>
                <input v-model.number="item.quantity" type="number" min="1" step="1" class="input-compact" />
              </label>
              <label>
                <span>Customer Width (in)</span>
                <input v-model.number="item.customer_width_in_inches" type="number" min="0" step="0.01" class="input-compact" />
              </label>
              <label>
                <span>Customer Length (in)</span>
                <input v-model.number="item.customer_length_in_inches" type="number" min="0" step="0.01" class="input-compact" />
              </label>
              <label>
                <span>Customer Width (mm)</span>
                <input v-model.number="item.customer_width_in_mm" type="number" min="0" step="0.01" class="input-compact" />
              </label>
              <label>
                <span>Customer Length (mm)</span>
                <input v-model.number="item.customer_length_in_mm" type="number" min="0" step="0.01" class="input-compact" />
              </label>
              <label>
                <span>HSN Code</span>
                <input v-model.trim="item.hsn" placeholder="39219091" class="input-compact" />
              </label>
              <label>
                <span>SKU</span>
                <input v-model.trim="item.sku" placeholder="MRC-DIRECT-001" class="input-compact" />
              </label>
              <label>
                <span>Weight (g)</span>
                <input v-model.number="item.weight" type="number" min="0" step="1" placeholder="650" class="input-compact" />
              </label>
              <label>
                <span>Amount</span>
                <input v-model.number="item.amount" type="number" min="0" step="0.01" placeholder="1499" class="input-compact" />
              </label>
              <label>
                <span>Unit Price</span>
                <input v-model.number="item.unit_price" type="number" min="0" step="0.01" placeholder="1499" class="input-compact" />
              </label>
              <label>
                <span>Tax Rate</span>
                <input v-model.number="item.tax_rate" type="number" min="0" step="0.01" placeholder="18" class="input-compact" />
              </label>
              <label>
                <span>Thickness</span>
                <input v-model.trim="item.thickness" placeholder="1.5mm" />
              </label>
              <label class="label-span-2">
                <span>Corner Radius and Notes</span>
                <input v-model.trim="item.corner_radius_and_notes" placeholder="Rounded corners, cut notes, special handling" />
              </label>
              <label class="label-span-2">
                <span>Remark</span>
                <input v-model.trim="item.remark" placeholder="" />
              </label>
            </div>
          </div>
        </section>

        <details class="advanced-section">
          <summary>Optional Fields</summary>
          <div class="advanced-grid">
            <label>
              <span>Shipment Type</span>
              <select v-model="form.shipment_type">
                <option value="forward">forward</option>
                <option value="reverse">reverse</option>
              </select>
            </label>
            <label>
              <span>Alternate Email</span>
              <input v-model.trim="form.alternate_email" type="email" placeholder="alt@example.com" />
            </label>
            <label class="label-span-2">
              <span>Remarks</span>
              <textarea v-model.trim="form.remarks" rows="3" placeholder="Internal remarks for packing or customer coordination" />
            </label>
            <label class="label-span-2">
              <span>Issues</span>
              <textarea v-model.trim="form.issues" rows="3" placeholder="Optional issue notes" />
            </label>
          </div>
        </details>

        <div class="form-actions">
          <button type="submit" class="btn-primary" :disabled="submitting">
            {{ submitting ? 'Saving...' : isEdit ? 'Update Order' : 'Save Direct Order' }}
          </button>
          <router-link to="/direct-orders" class="btn-secondary btn-link">Cancel</router-link>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDirectOrdersStore } from '@/stores/directOrders'
import stateCodes from '@/data/stateCodes.json'
import type { CreateDirectOrderRequest, DirectOrder, DirectOrderItem, DirectOrderPincodeLookupResponse, UpdateDirectOrderRequest } from '@/types'

const route = useRoute()
const router = useRouter()
const store = useDirectOrdersStore()

const isEdit = computed(() => typeof route.params.id === 'string' && route.params.id.length > 0)
const submitting = ref(false)
const pincodeLookupState = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const pincodeLookupMessage = ref('')
const pincodeLookupResult = ref<DirectOrderPincodeLookupResponse | null>(null)
let pincodeLookupTimer: ReturnType<typeof setTimeout> | null = null
let latestLookupRequest = 0

const sourceOptions = ['website', 'phone', 'whatsapp', 'email', 'meta', 'amz-replacement', 'issue-replacement', 'other']
const orderStatusOptions = ['confirmed', 'manufactured', 'on-hold', 'forwarded', 'cancelled', 'returned', 'other-issues']
const paymentStatusOptions = ['pending', 'paid-full', 'paid-advance', 'refunded']
const priorityOptions = ['P1', 'P2', 'P3', 'P4']
const courierTypeOptions = ['manual', 'delhivery', 'bluedart', 'dtdc', 'xpressbees', 'professional', 'st', 'franch xpress', 'other']
const issueRequiredStatuses = new Set(['cancelled', 'on-hold', 'other-issues', 'returned'])

type EditableItem = Omit<DirectOrderItem, 'id' | 'order_id' | 'updated_by'> & { order_id?: string }
const blankItem = (): EditableItem => ({
  item: 'Mr.Clear Table covers custom size',
  quantity: 1,
  dimension: '',
  thickness: '',
  weight: null,
  amount: null,
  remark: '',
  sku: 'MRC-DIRECT-001',
  hsn: '39219091',
  unit_price: null,
  tax_rate: null,
  customer_width_in_inches: null,
  customer_length_in_inches: null,
  customer_width_in_mm: null,
  customer_length_in_mm: null,
  corner_radius_and_notes: '',
})

const today = () => new Date().toISOString().slice(0, 10)

const form = reactive({
  source: 'other',
  order_id: '',
  order_status: 'confirmed',
  courier_type: 'manual',
  awb: '',
  payment_status: 'pending',
  amount: null as number | null,
  advance_amount: null as number | null,
  cod_amount: null as number | null,
  customer_name: '',
  address: '',
  pincode: '',
  mobile: '',
  alternate_mobile: '',
  email: '',
  alternate_email: '',
  remarks: '',
  priority: 'P4',
  issues: '',
  city: '',
  state: '',
  country: 'India',
  landmark: '',
  shipment_type: 'forward',
  service_type: 'surface',
  pickup_location: 'Tekgien Softwares',
  package_count: 1,
  total_weight: null as number | null,
  length_cm: null as number | null,
  width_cm: null as number | null,
  height_cm: null as number | null,
  invoice_date: today(),
  items: [] as EditableItem[],
})

const courierTypeSelection = ref('manual')

const syncCourierTypeSelection = (value?: string | null) => {
  const normalized = (value || '').trim().toLowerCase()
  if (courierTypeOptions.includes(normalized)) {
    courierTypeSelection.value = normalized
    form.courier_type = normalized
    return
  }
  courierTypeSelection.value = 'custom'
}

const regenerateOrderId = () => {
  loadNextOrderId()
}

const hydrateForm = (order: DirectOrder) => {
  form.source = order.source || 'other'
  form.order_id = order.order_id
  form.order_status = order.order_status || 'confirmed'
  form.courier_type = order.courier_type || 'manual'
  form.awb = order.awb || ''
  form.payment_status = order.payment_status || 'pending'
  form.amount = order.amount ?? null
  form.advance_amount = order.advance_amount ?? null
  form.cod_amount = order.cod_amount ?? null
  form.customer_name = order.customer_name || ''
  form.address = order.address || ''
  form.pincode = order.pincode || ''
  form.mobile = order.mobile || ''
  form.alternate_mobile = order.alternate_mobile || ''
  form.email = order.email || ''
  form.alternate_email = order.alternate_email || ''
  form.remarks = order.remarks || ''
  form.priority = order.priority || 'P4'
  form.issues = order.issues || ''
  form.city = order.city || ''
  form.state = order.state || ''
  form.country = order.country || 'India'
  form.landmark = order.landmark || ''
  form.shipment_type = order.shipment_type || 'forward'
  form.service_type = order.service_type || 'surface'
  form.pickup_location = order.pickup_location || ''
  form.package_count = order.package_count || 1
  form.total_weight = order.total_weight ?? null
  form.length_cm = order.length_cm ?? null
  form.width_cm = order.width_cm ?? null
  form.height_cm = order.height_cm ?? null
  form.invoice_date = order.invoice_date ? order.invoice_date.slice(0, 10) : today()
  form.items = order.items.length > 0 ? order.items.map((item) => ({
    item: item.item || '',
    quantity: item.quantity || 1,
    dimension: item.dimension || '',
    thickness: item.thickness || '',
    weight: item.weight ?? null,
    amount: item.amount ?? null,
    remark: item.remark || '',
    sku: item.sku || '',
    hsn: item.hsn || '',
    unit_price: item.unit_price ?? null,
    tax_rate: item.tax_rate ?? null,
    customer_width_in_inches: item.customer_width_in_inches ?? null,
    customer_length_in_inches: item.customer_length_in_inches ?? null,
    customer_width_in_mm: item.customer_width_in_mm ?? null,
    customer_length_in_mm: item.customer_length_in_mm ?? null,
    corner_radius_and_notes: item.corner_radius_and_notes || '',
  })) : []
  syncCourierTypeSelection(form.courier_type)
  pincodeLookupResult.value = null
  pincodeLookupMessage.value = ''
  pincodeLookupState.value = 'idle'
}

const cleanString = (value?: string | null) => {
  const next = value?.trim()
  return next ? next : undefined
}

const cleanNumber = (value?: number | null) => (typeof value === 'number' && !Number.isNaN(value) ? value : undefined)
const onlyDigits = (value?: string | null) => (value || '').replace(/\D/g, '')
const pincodeLookupClass = computed(() =>
  pincodeLookupState.value === 'error' ? 'field-note field-note--error' : 'field-note',
)

const resolveStateName = (state?: string, stateCode?: string) => {
  const explicitState = cleanString(state)
  if (explicitState) {
    return explicitState
  }

  const normalizedCode = cleanString(stateCode)?.toUpperCase()
  if (!normalizedCode) {
    return undefined
  }

  return stateCodes[normalizedCode as keyof typeof stateCodes]
}

const normalizePincodeLookupResult = (result: DirectOrderPincodeLookupResponse): DirectOrderPincodeLookupResponse => ({
  ...result,
  state: resolveStateName(result.state, result.state_code),
  raw: result.raw?.map((candidate) => ({
    ...candidate,
    state: resolveStateName(candidate.state, candidate.state_code),
  })),
})

const applyPincodeLookupResult = (result: DirectOrderPincodeLookupResponse) => {
  form.city = result.city || form.city
  form.state = result.state || form.state
  form.country = result.country || form.country || 'India'
}

const resetPincodeLookupState = () => {
  pincodeLookupState.value = 'idle'
  pincodeLookupMessage.value = ''
  pincodeLookupResult.value = null
}

const runPincodeLookup = async (pincode: string) => {
  const requestId = ++latestLookupRequest
  pincodeLookupState.value = 'loading'
  pincodeLookupMessage.value = 'Looking up address from Delhivery...'

  try {
    const response = await store.lookupPincode(pincode)
    if (requestId !== latestLookupRequest) {
      return
    }
    const result = normalizePincodeLookupResult(response)
    pincodeLookupResult.value = result
    applyPincodeLookupResult(result)
    pincodeLookupState.value = 'success'
    pincodeLookupMessage.value = result.district
      ? `Auto-filled city/state and found district ${result.district}.`
      : 'Auto-filled city/state from Delhivery.'
  } catch (error: any) {
    if (requestId !== latestLookupRequest) {
      return
    }
    pincodeLookupResult.value = null
    pincodeLookupState.value = 'error'
    pincodeLookupMessage.value = error.response?.data?.error || 'Unable to fetch address for this pincode.'
  }
}

const resolveCourierType = () => {
  if (courierTypeSelection.value === 'custom') {
    return cleanString(form.courier_type)
  }
  return courierTypeSelection.value
}

const hasMeaningfulItemData = (item: EditableItem) => {
  return Boolean(
    cleanString(item.item) ||
      cleanString(item.hsn) ||
      cleanString(item.sku) ||
      cleanString(item.dimension) ||
      cleanString(item.thickness) ||
      cleanString(item.corner_radius_and_notes) ||
      cleanString(item.remark) ||
      cleanNumber(item.weight) !== undefined ||
      cleanNumber(item.amount) !== undefined ||
      cleanNumber(item.unit_price) !== undefined ||
      cleanNumber(item.tax_rate) !== undefined ||
      cleanNumber(item.customer_width_in_inches) !== undefined ||
      cleanNumber(item.customer_length_in_inches) !== undefined ||
      cleanNumber(item.customer_width_in_mm) !== undefined ||
      cleanNumber(item.customer_length_in_mm) !== undefined,
  )
}

const buildPayload = (): CreateDirectOrderRequest => ({
  source: form.source,
  order_id: form.order_id.trim(),
  order_status: form.order_status,
  courier_type: resolveCourierType(),
  awb: cleanString(form.awb),
  payment_status: form.payment_status,
  amount: cleanNumber(form.amount),
  advance_amount: cleanNumber(form.advance_amount),
  cod_amount: cleanNumber(form.cod_amount),
  customer_name: cleanString(form.customer_name),
  address: cleanString(form.address),
  pincode: cleanString(form.pincode),
  mobile: cleanString(form.mobile),
  alternate_mobile: cleanString(form.alternate_mobile),
  email: cleanString(form.email),
  alternate_email: cleanString(form.alternate_email),
  remarks: cleanString(form.remarks),
  priority: form.priority,
  issues: cleanString(form.issues),
  city: cleanString(form.city),
  state: cleanString(form.state),
  country: cleanString(form.country),
  landmark: cleanString(form.landmark),
  shipment_type: cleanString(form.shipment_type),
  service_type: cleanString(form.service_type),
  pickup_location: cleanString(form.pickup_location),
  package_count: cleanNumber(form.package_count),
  total_weight: cleanNumber(form.total_weight),
  length_cm: cleanNumber(form.length_cm),
  width_cm: cleanNumber(form.width_cm),
  height_cm: cleanNumber(form.height_cm),
  invoice_date: cleanString(form.invoice_date),
  items: form.items
    .filter(hasMeaningfulItemData)
    .map((item) => ({
      order_id: form.order_id.trim(),
      item: cleanString(item.item) ?? '',
      quantity: item.quantity || 1,
      dimension: cleanString(item.dimension),
      thickness: cleanString(item.thickness),
      weight: cleanNumber(item.weight),
      amount: cleanNumber(item.amount),
      remark: cleanString(item.remark),
      sku: cleanString(item.sku),
      hsn: cleanString(item.hsn),
      unit_price: cleanNumber(item.unit_price),
      tax_rate: cleanNumber(item.tax_rate),
      customer_width_in_inches: cleanNumber(item.customer_width_in_inches),
      customer_length_in_inches: cleanNumber(item.customer_length_in_inches),
      customer_width_in_mm: cleanNumber(item.customer_width_in_mm),
      customer_length_in_mm: cleanNumber(item.customer_length_in_mm),
      corner_radius_and_notes: cleanString(item.corner_radius_and_notes),
    })),
})

const ensureIssuesForStatus = (payload: CreateDirectOrderRequest) => {
  if (!payload.order_status || !issueRequiredStatuses.has(payload.order_status)) {
    return payload
  }

  if (cleanString(payload.issues)) {
    return payload
  }

  const entered = window.prompt(`Issues is required when order status is "${payload.order_status}". Enter the reason before saving:`)?.trim()
  if (entered) {
    form.issues = entered
    return {
      ...payload,
      issues: entered,
    }
  }

  throw new Error('Issues field is required for the selected order status.')
}

const validateBeforeSubmit = (payload: CreateDirectOrderRequest) => {
  const errors: string[] = []
  const codAmount = payload.cod_amount ?? 0
  const advanceAmount = payload.advance_amount ?? 0
  const totalAmount = payload.amount ?? 0

  if (payload.payment_status === 'paid-full' && codAmount !== 0) {
    errors.push('COD amount must be 0 when payment status is paid-full.')
  }
  if (payload.payment_status === 'paid-advance' && codAmount <= 0) {
    errors.push('COD amount must be greater than 0 when payment status is paid-advance.')
  }
  if (advanceAmount > totalAmount && payload.amount != null) {
    errors.push('Advance amount cannot be greater than total amount.')
  }
  if (codAmount > totalAmount && payload.amount != null) {
    errors.push('COD amount cannot be greater than total amount.')
  }

  const mobile = onlyDigits(payload.mobile)
  if (mobile && mobile.length !== 10) {
    errors.push('Mobile number must be exactly 10 digits.')
  }
  const alternateMobile = onlyDigits(payload.alternate_mobile)
  if (alternateMobile && alternateMobile.length !== 10) {
    errors.push('Alternate mobile number must be exactly 10 digits.')
  }
  const pincode = onlyDigits(payload.pincode)
  if (pincode && pincode.length !== 6) {
    errors.push('Pincode must be exactly 6 digits.')
  }

  if (payload.order_status && issueRequiredStatuses.has(payload.order_status) && !cleanString(payload.issues)) {
    errors.push('Issues field is required when order status is cancelled, on-hold, other-issues, or returned.')
  }

  if ((payload.total_weight ?? 0) < 0) {
    errors.push('Shipment weight cannot be negative.')
  }
  if ((payload.length_cm ?? 0) < 0 || (payload.width_cm ?? 0) < 0 || (payload.height_cm ?? 0) < 0) {
    errors.push('Dimensions cannot be negative.')
  }

  payload.items.forEach((item, index) => {
    const itemNumber = index + 1
    if ((item.weight ?? 0) < 0) {
      errors.push(`Item ${itemNumber} weight cannot be negative.`)
    }
    if ((item.amount ?? 0) < 0) {
      errors.push(`Item ${itemNumber} amount cannot be negative.`)
    }
    if ((item.unit_price ?? 0) < 0) {
      errors.push(`Item ${itemNumber} unit price cannot be negative.`)
    }
    if ((item.tax_rate ?? 0) < 0) {
      errors.push(`Item ${itemNumber} tax rate cannot be negative.`)
    }
    if ((item.customer_width_in_inches ?? 0) < 0) {
      errors.push(`Item ${itemNumber} customer width in inches cannot be negative.`)
    }
    if ((item.customer_length_in_inches ?? 0) < 0) {
      errors.push(`Item ${itemNumber} customer length in inches cannot be negative.`)
    }
    if ((item.customer_width_in_mm ?? 0) < 0) {
      errors.push(`Item ${itemNumber} customer width in mm cannot be negative.`)
    }
    if ((item.customer_length_in_mm ?? 0) < 0) {
      errors.push(`Item ${itemNumber} customer length in mm cannot be negative.`)
    }
  })

  return errors
}

const addItem = () => {
  form.items.push(blankItem())
}

const removeItem = (index: number) => {
  form.items.splice(index, 1)
}

const loadNextOrderId = async () => {
  if (isEdit.value) return
  try {
    form.order_id = await store.fetchNextOrderId()
  } catch (error: any) {
    alert(error.response?.data?.error || 'Failed to load next order ID')
  }
}

const handleSubmit = async () => {
  submitting.value = true
  try {
    const payload = ensureIssuesForStatus(buildPayload())
    const validationErrors = validateBeforeSubmit(payload)
    if (validationErrors.length > 0) {
      alert(validationErrors.join('\n'))
      return
    }
    const orderId = payload.order_id

    if (isEdit.value) {
      await store.updateOrder(route.params.id as string, payload as UpdateDirectOrderRequest)
    } else {
      await store.createOrder(payload)
    }

    alert(isEdit.value ? 'Direct order updated successfully.' : 'Direct order created successfully.')

    await router.push(`/direct-orders/${orderId}`)
  } catch (error: any) {
    alert(error.response?.data?.error || 'Failed to save direct order')
  } finally {
    submitting.value = false
  }
}

watch(
  () => form.pincode,
  (value) => {
    const normalized = onlyDigits(value)
    if (value !== normalized) {
      form.pincode = normalized
      return
    }

    if (pincodeLookupTimer) {
      clearTimeout(pincodeLookupTimer)
      pincodeLookupTimer = null
    }

    if (normalized.length === 0) {
      latestLookupRequest++
      resetPincodeLookupState()
      return
    }

    if (normalized.length < 6) {
      latestLookupRequest++
      pincodeLookupResult.value = null
      pincodeLookupState.value = 'idle'
      pincodeLookupMessage.value = 'Enter all 6 digits to auto-fill location fields.'
      return
    }

    pincodeLookupTimer = setTimeout(() => {
      void runPincodeLookup(normalized)
    }, 350)
  },
)

onBeforeUnmount(() => {
  if (pincodeLookupTimer) {
    clearTimeout(pincodeLookupTimer)
  }
})

onMounted(async () => {
  if (!isEdit.value) {
    await loadNextOrderId()
    syncCourierTypeSelection(form.courier_type)
    return
  }
  try {
    const order = await store.fetchOrderById(route.params.id as string)
    if (order) {
      hydrateForm(order)
    }
  } catch (error: any) {
    alert(error.response?.data?.error || 'Failed to load direct order')
    router.push('/direct-orders')
  }
})
</script>

<style scoped>
.direct-form-page {
  max-width: 1180px;
  margin: 0 auto;
}

.form-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  padding: 1.5rem;
}

.form-header,
.section-heading,
.item-card-header,
.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.direct-order-form,
.form-section,
.advanced-grid {
  display: grid;
  gap: 0.9rem;
}

.form-section {
  margin-top: 1rem;
}

.section-heading {
  align-items: flex-start;
}

.section-heading h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.05rem;
}

.section-heading p,
.intro-copy {
  margin: 0.45rem 0 0;
  color: #64748b;
}

.section-badge {
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  background: rgba(15, 118, 110, 0.1);
  color: #0f766e;
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  font-weight: 800;
  color: #0f766e;
}

h1 {
  margin: 0;
  color: #0f172a;
  font-size: clamp(1.8rem, 4vw, 2.7rem);
  font-weight: 900;
}

.back-link,
.btn-link {
  text-decoration: none;
}

.back-link {
  color: #0f766e;
  font-weight: 800;
}

.section-grid,
.advanced-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
}

.section-grid--compact {
  align-items: end;
}

label {
  display: grid;
  gap: 0.28rem;
}

label span {
  color: #0f172a;
  font-size: 0.84rem;
  font-weight: 800;
}

.field-note {
  color: #0f766e;
  font-size: 0.76rem;
  font-weight: 700;
}

.field-note--error {
  color: #b91c1c;
}

input,
select,
textarea {
  width: 100%;
  box-sizing: border-box;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.32);
  background: #f8fafc;
  color: #0f172a;
  font: inherit;
  padding: 0.85rem 0.9rem;
}

.input-compact {
  max-width: 180px;
}

input::placeholder,
textarea::placeholder {
  color: #94a3b8;
}

textarea {
  resize: vertical;
}

.inline-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.6rem;
}

.mini-button,
.btn-primary,
.btn-secondary,
.danger-link {
  border-radius: 14px;
  font: inherit;
  font-weight: 800;
}

.mini-button {
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.96);
  color: #0f172a;
  padding: 0 0.9rem;
  cursor: pointer;
}

.label-span-2 {
  grid-column: span 2;
}

.lookup-card {
  margin-top: 0.3rem;
  border-radius: 18px;
  border: 1px solid rgba(15, 118, 110, 0.16);
  background: linear-gradient(135deg, rgba(236, 253, 245, 0.9), rgba(239, 246, 255, 0.95));
  padding: 0.9rem 1rem;
}

.lookup-card__header,
.lookup-card__grid {
  display: grid;
  gap: 0.75rem;
}

.lookup-card__header {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.lookup-card__copy {
  margin: 0.45rem 0 0.8rem;
  color: #475569;
  font-size: 0.84rem;
}

.lookup-card__grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.lookup-card__grid span {
  display: block;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.lookup-card__grid strong {
  display: block;
  margin-top: 0.2rem;
  color: #0f172a;
  font-size: 0.92rem;
}

.lookup-chip {
  border-radius: 999px;
  padding: 0.32rem 0.7rem;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.lookup-chip--ok {
  background: rgba(15, 118, 110, 0.12);
  color: #0f766e;
}

.lookup-chip--warn {
  background: rgba(180, 83, 9, 0.12);
  color: #b45309;
}

.item-card,
.advanced-section {
  border-radius: 20px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(240, 249, 255, 0.92));
  padding: 1rem;
}

.advanced-section summary {
  cursor: pointer;
  font-weight: 800;
  color: #0f172a;
}

.advanced-grid {
  margin-top: 1rem;
}

.btn-primary,
.btn-secondary {
  min-height: 2.9rem;
  padding: 0 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  text-decoration: none;
}

.btn-primary {
  border: 0;
  color: #ffffff;
  background: linear-gradient(135deg, #0f766e, #115e59);
}

.btn-secondary {
  border: 1px solid rgba(15, 23, 42, 0.12);
  color: #0f172a;
  background: rgba(255, 255, 255, 0.96);
}

.danger-link {
  border: 0;
  background: transparent;
  color: #b91c1c;
  cursor: pointer;
  padding: 0;
}

@media (max-width: 860px) {
  .form-header,
  .section-heading,
  .item-card-header,
  .form-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .section-grid,
  .advanced-grid,
  .inline-field,
  .lookup-card__header,
  .lookup-card__grid {
    grid-template-columns: 1fr;
  }

  .label-span-2 {
    grid-column: span 1;
  }
}
</style>
