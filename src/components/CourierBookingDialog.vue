<template>
  <dialog ref="dialog" class="booking-dialog" aria-labelledby="booking-title" @cancel.prevent="close">
    <form @submit.prevent="book">
      <header class="heading">
        <div><p class="eyebrow">Forward shipment</p><h2 id="booking-title">Schedule {{ orders.length === 1 ? orders[0]?.order_id : `${orders.length} orders` }}</h2></div>
        <button type="button" :disabled="busy" aria-label="Close booking" @click="close">Close</button>
      </header>
      <label>Courier
        <select v-model="courier" aria-label="Courier" :disabled="busy || attempted">
          <option value="delhivery">Delhivery</option><option value="dtdc">DTDC</option>
        </select>
      </label>
      <p>Creates a forward shipment with the selected courier using each saved customer's address and package details.</p>
      <div v-if="courier === 'dtdc'" class="dtdc-options">
        <p v-if="settingsLoading" role="status">Checking DTDC configuration…</p>
        <p v-if="settingsError" class="notice error" role="alert">{{ settingsError }}</p>
        <p v-if="bookingMissingConfig.length" class="notice error" role="alert">DTDC is not configured. Set these backend environment variables and restart the service: {{ bookingMissingConfig.join(', ') }}</p>
        <label>DTDC service type
          <select v-model="serviceSelection" aria-label="DTDC service type" :disabled="busy || attempted || settingsLoading" required @change="changeService">
            <option disabled value="">Choose your approved service</option>
            <option v-for="option in serviceOptions" :key="option" :value="option">{{ option }}</option>

          </select>
        </label>
        <div class="heading"><router-link to="/courier-settings" target="_blank">Manage DTDC service modes</router-link><button type="button" :disabled="busy || settingsLoading || attempted" @click="loadSettings">Refresh service list</button></div>
        <p class="hint">The configured service is selected by default. Other services must be enabled on your DTDC account. Pickup details come from the seller's configuration.</p>
        <label>DTDC commodity/category
          <select v-model="commoditySelection" aria-label="DTDC commodity/category" :disabled="busy || attempted || settingsLoading" required @change="changeCommodity">
            <option disabled value="">Choose a commodity</option>
            <option v-for="option in settings?.commodity_options || []" :key="option.id" :value="option.id">{{ option.name }} ({{ option.id }})</option>
            <option value="__custom__">Other commodity ID or name</option>
          </select>
        </label>
        <label v-if="commoditySelection === '__custom__'">Custom DTDC commodity
          <input v-model.trim="commodity" :disabled="busy || attempted" placeholder="Commodity ID or name accepted by DTDC" required />
        </label>
        <p class="hint">Defaults come from the seller's DTDC settings. Choose the category that matches these parcels.</p>
        <label class="check"><input v-model="autoDownloadLabels" type="checkbox" :disabled="busy || attempted" /> Download labels automatically after booking</label>
        <label>Label format<select v-model="labelCode" :disabled="busy"><option value="SHIP_LABEL_4X6">4 × 6</option><option value="SHIP_LABEL_A4">A4</option><option value="SHIP_LABEL_A6">A6</option></select></label>
        <p v-if="autoDownloadLabels && orders.length > 1" class="hint">Your browser may ask to allow multiple downloads. You can also download each label from the results below.</p>
        <label class="check"><input v-model="riskSurcharge" type="checkbox" :disabled="busy || attempted" /> Apply risk surcharge</label>
        <fieldset v-for="order in orders" :key="order.order_id" :disabled="busy || attempted || shipmentLocked(order)">
          <legend>{{ order.order_id }} · {{ order.package_count || 1 }} parcel(s)</legend>
          <label>E-way bill (if applicable)<input v-model.trim="ewayBills[order.order_id]" inputmode="numeric" pattern="[0-9]{12}" maxlength="12" placeholder="12 digits" /></label>
          <p v-if="(order.package_count || 1) > 1" class="hint">Enter each parcel's dimensions, weight in kg, and declared value.</p>
          <div v-for="(piece, index) in pieces[order.order_id]" :key="index" class="piece-grid">
            <strong>Parcel {{ index + 1 }}</strong>
            <label>Description<input v-model.trim="piece.description" required /></label>
            <label>Value (₹)<input v-model="piece.declared_value" type="number" min="0.01" step="any" required /></label>
            <label>Weight (kg)<input v-model="piece.weight" type="number" min="0.001" step="any" required /></label>
            <label>Length (cm)<input v-model="piece.length" type="number" min="0.01" step="any" required /></label>
            <label>Width (cm)<input v-model="piece.width" type="number" min="0.01" step="any" required /></label>
            <label>Height (cm)<input v-model="piece.height" type="number" min="0.01" step="any" required /></label>
          </div>
        </fieldset>
      </div>
      <p v-if="blockedCount" class="notice">{{ blockedCount }} order(s) already have a shipment, a pending booking, or are cancelled. They will be skipped.</p>
      <p v-if="busy" role="status">Scheduling {{ currentBooking }} of {{ eligible.length }}… Keep this window open.</p>
      <ul v-if="results.length" class="results" aria-live="polite">
        <li v-for="result in results" :key="result.id" :class="{ error: !result.success }">
          <div><strong>{{ result.id }}</strong>: {{ result.message }}</div>
          <template v-if="result.success && result.awb && courier === 'dtdc'">
            <p v-if="result.labelBusy" class="hint" role="status">Downloading label…</p>
            <p v-if="result.labelDownloaded" class="hint">Label download started.</p>
            <p v-if="result.labelError" class="error hint" role="alert">Shipment booked successfully. Label download failed: {{ result.labelError }}</p>
            <button type="button" :disabled="busy || result.labelBusy" @click="downloadLabel(result)">{{ result.labelError ? 'Retry label download' : result.labelDownloaded ? 'Download label again' : 'Download label' }}</button>
          </template>
        </li>
      </ul>
      <p v-if="attempted && !busy" class="notice">{{ successCount }} scheduled, {{ results.length - successCount }} failed. Close to refresh orders before another booking attempt.</p>
      <footer>
        <button type="button" :disabled="busy" @click="close">{{ attempted ? 'Done' : 'Cancel' }}</button>
        <button v-if="!attempted" type="submit" class="primary" :disabled="!canBook">Schedule via {{ courier === 'dtdc' ? 'DTDC' : 'Delhivery' }}</button>
        <router-link v-if="attempted && courier === 'dtdc' && !busy" to="/dtdc-shipments" @click="close">DTDC shipments</router-link>
      </footer>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { directOrdersApi } from '@/api/directOrders'
import { courierError, shipmentLocked, saveCourierPDF } from '@/utils/courier'
import type { DirectOrder, DTDCSettings, DTDCPiece, IntegratedCourier } from '@/types'

const props = defineProps<{ orders: DirectOrder[] }>()
const emit = defineEmits<{ close: []; updated: [order: DirectOrder] }>()
const dialog = ref<HTMLDialogElement | null>(null)
const courier = ref<IntegratedCourier>(props.orders[0]?.courier_type === 'dtdc' ? 'dtdc' : 'delhivery')
const busy = ref(false)
const attempted = ref(false)
const currentBooking = ref(0)
const settingsLoading = ref(true)
const settings = ref<DTDCSettings | null>(null)
const settingsError = ref('')
const serviceType = ref('')
const serviceSelection = ref('')
const commodity = ref('')
const commoditySelection = ref('')
const serviceOptions = computed(() => [...new Set([settings.value?.service_type || '', ...(settings.value?.service_type_options || ['B2C PREMIUM', 'B2C PRIORITY'])].filter(Boolean))])
const bookingMissingConfig = computed(() => (settings.value?.missing_config || []).filter(key => !(key === 'DTDC_SERVICE_TYPE' && serviceType.value) && !(key === 'DTDC_COMMODITY' && commodity.value)))
function changeService() { serviceType.value = serviceSelection.value === '__custom__' ? '' : serviceSelection.value }
function changeCommodity() { commodity.value = commoditySelection.value === '__custom__' ? '' : commoditySelection.value }
const autoDownloadLabels = ref(true)
const labelCode = ref('SHIP_LABEL_4X6')
const riskSurcharge = ref(false)
const ewayBills = ref<Record<string, string>>({})
const pieces = ref<Record<string, DTDCPiece[]>>(Object.fromEntries(props.orders.map(order => [order.order_id,
  (order.package_count || 1) > 1 ? Array.from({ length: order.package_count || 1 }, () => ({ description: '', declared_value: '', weight: '', length: '', width: '', height: '' })) : [],
])))
type BookingResult = { id: string; success: boolean; message: string; awb?: string; labelBusy?: boolean; labelError?: string; labelDownloaded?: boolean }
const results = ref<BookingResult[]>([])
const eligible = ref(props.orders.filter(order => !shipmentLocked(order) && order.order_status !== 'cancelled'))
const blockedCount = computed(() => props.orders.length - eligible.value.length)
const successCount = computed(() => results.value.filter(result => result.success).length)
const canBook = computed(() => !busy.value && !attempted.value && eligible.value.length > 0 && (courier.value !== 'dtdc' || (!settingsLoading.value && settings.value && !bookingMissingConfig.value.length && serviceType.value && commodity.value)))
function close() { if (!busy.value) emit('close') }
async function downloadLabel(result: BookingResult) {
  if (!result.awb || result.labelBusy) return
  result.labelBusy = true; result.labelError = ''
  try { saveCourierPDF(await directOrdersApi.labelDTDC(result.id, labelCode.value), result.awb); result.labelDownloaded = true }
  catch (error) { result.labelError = await courierError(error) }
  finally { result.labelBusy = false }
}
async function book() {
  if (!canBook.value) return
  busy.value = true
  attempted.value = true
  try {
    for (const [index, order] of eligible.value.entries()) {
      currentBooking.value = index + 1
      try {
        const response = courier.value === 'dtdc'
          ? await directOrdersApi.bookDTDC(order.order_id, {
            service_type_id: serviceType.value, commodity_id: commodity.value, is_risk_surcharge_applicable: riskSurcharge.value,
            eway_bill: ewayBills.value[order.order_id] || undefined,
            pieces_detail: pieces.value[order.order_id]?.length ? pieces.value[order.order_id] : undefined,
          })
          : await directOrdersApi.createDelhiveryForwardOrder(order.order_id)
        results.value.push({ id: order.order_id, success: true, message: response.order.awb ? `AWB ${response.order.awb}` : response.message, awb: response.order.awb || undefined })
        emit('updated', response.order)
        if (courier.value === 'dtdc' && autoDownloadLabels.value) await downloadLabel(results.value[results.value.length - 1]!)
      } catch (error) {
        results.value.push({ id: order.order_id, success: false, message: await courierError(error) })
      }
    }
  } finally { busy.value = false }
}
async function loadSettings() {
  settingsLoading.value = true; settingsError.value = ''
  const previousService = serviceType.value
  const previousCommodity = commodity.value
  try {
    settings.value = await directOrdersApi.dtdcSettings()
    serviceType.value = settings.value.service_type_options?.includes(previousService) ? previousService : settings.value.service_type
    serviceSelection.value = serviceType.value
    autoDownloadLabels.value = settings.value.auto_download_labels !== false
    labelCode.value = settings.value.label_code || 'SHIP_LABEL_4X6'
    commodity.value = previousCommodity || settings.value.commodity || ''
    const matchedCommodity = settings.value.commodity_options?.find(option => option.id === commodity.value || option.name === commodity.value.toUpperCase())
    commoditySelection.value = matchedCommodity?.id || (commodity.value ? '__custom__' : '')
    if (matchedCommodity) commodity.value = matchedCommodity.id
  }
  catch (error) { settingsError.value = await courierError(error) }
  finally { settingsLoading.value = false }
}
onMounted(async () => { dialog.value?.showModal(); await loadSettings() })
</script>

<style scoped>
.booking-dialog { border: 0; border-radius: 22px; padding: 1.5rem; width: min(720px, calc(100vw - 2rem)); max-height: 90vh; color: #0f172a; box-shadow: 0 24px 80px #0f172a40; }
.booking-dialog::backdrop { background: #0f172a80; }
form, .dtdc-options { display: grid; gap: 1rem; }
.heading, footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
h2, p { margin: 0; } p { line-height: 1.6; color: #475569; }
.eyebrow { color: #0f766e; font-size: .75rem; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; }
label { display: grid; gap: .4rem; font-weight: 700; font-size: .85rem; }
input, select, button { font: inherit; border: 1px solid #cbd5e1; border-radius: 9px; padding: .65rem .8rem; background: white; min-width: 0; }
button { cursor: pointer; font-weight: 700; } button:disabled { opacity: .5; cursor: default; }
.primary { background: #0f766e; color: white; border-color: #0f766e; }
.notice { padding: .9rem; border-radius: 10px; background: #f1f5f9; overflow-wrap: anywhere; }
.error { color: #b91c1c; } .notice.error { background: #fef2f2; }
.hint { font-size: .8rem; } .check { display: flex; align-items: center; }
fieldset { border: 1px solid #e2e8f0; border-radius: 12px; padding: 1rem; display: grid; gap: .8rem; min-width: 0; }
legend { font-weight: 800; padding: 0 .4rem; }
.piece-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .6rem; padding-top: .8rem; border-top: 1px solid #e2e8f0; }
.piece-grid strong { grid-column: 1 / -1; } .results { display: grid; gap: .8rem; padding-left: 1.2rem; overflow-wrap: anywhere; }
@media(max-width: 540px) { .piece-grid { grid-template-columns: repeat(2, minmax(0,1fr)); } }
</style>
