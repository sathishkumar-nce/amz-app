<template>
  <div class="shipment-actions">
    <template v-if="!order.awb">
      <p class="notice">Booking {{ order.courier_status === 'booking_pending' ? 'is pending' : 'needs review' }}. Check DTDC using reference {{ order.order_id }} to recover its AWB. An unavailable tracking result keeps this booking locked to prevent duplicates.</p>
      <p v-if="order.courier_payload?.booking_error" class="error">Last booking result: {{ order.courier_payload.booking_error }}</p>
      <div class="actions"><button type="button" :disabled="!!busy || !trackingEnabled" @click="reconcile">{{ busy === 'reconciling' ? 'Checking DTDC…' : 'Check booking with DTDC' }}</button></div>
      <p v-if="!trackingEnabled" class="notice">Live booking recovery requires the seller's DTDC tracking credentials.</p>
    </template>
    <template v-else>
      <div class="actions">
        <button type="button" :disabled="!!busy || !trackingEnabled" @click="track">{{ busy === 'tracking' ? 'Refreshing…' : 'Refresh tracking' }}</button>
        <button type="button" :disabled="!!busy" @click="showHistory = !showHistory">{{ showHistory ? 'Hide' : 'View' }} tracking history</button>
        <label class="label-select">Label size<select v-model="labelCode" :disabled="!!busy"><option value="SHIP_LABEL_4X6">4 × 6</option><option value="SHIP_LABEL_A4">A4</option><option value="SHIP_LABEL_A6">A6</option></select></label>
        <button type="button" :disabled="!!busy || cancelled" @click="label">{{ busy === 'label' ? 'Downloading…' : 'Download label' }}</button>
        <button type="button" class="danger" :disabled="!!busy || cancelled" @click="cancel">{{ busy === 'cancelling' ? 'Cancelling…' : cancelled ? 'Cancelled' : 'Cancel shipment' }}</button>
      </div>
      <p v-if="!trackingEnabled" class="notice">Live tracking requires DTDC_TRACKING_TOKEN in the backend environment.</p>
      <p v-if="order.courier_payload?.tracking_updated_at" class="muted">Last checked {{ new Date(String(order.courier_payload.tracking_updated_at)).toLocaleString('en-IN') }}</p>
      <section v-if="showHistory" class="tracking" aria-label="Tracking history">
        <template v-if="tracking">
          <div class="summary"><strong>{{ tracking.trackHeader.strStatus }}</strong><span>{{ tracking.trackHeader.strOrigin }} → {{ tracking.trackHeader.strDestination }}</span><span v-if="tracking.trackHeader.strRevExpectedDeliveryDate || tracking.trackHeader.strExpectedDeliveryDate">Expected delivery: {{ dtdcDate(tracking.trackHeader.strRevExpectedDeliveryDate || tracking.trackHeader.strExpectedDeliveryDate) }}</span><span v-if="tracking.trackHeader.strRemarks">{{ tracking.trackHeader.strRemarks }}</span></div>
          <ol v-if="tracking.trackDetails.length" class="timeline">
            <li v-for="(event, index) in [...tracking.trackDetails].reverse()" :key="index"><strong>{{ event.strAction }}</strong><span>{{ dtdcDate(event.strActionDate, event.strActionTime) }}</span><span>{{ [event.strOrigin, event.strDestination].filter(Boolean).join(' → ') }}</span><span v-if="event.sTrRemarks || event.strRemarks">{{ event.sTrRemarks || event.strRemarks }}</span></li>
          </ol>
          <p v-else>No scan events are available yet.</p>
        </template>
        <p v-else>No tracking history saved yet. Refresh tracking to fetch DTDC's latest scans.</p>
      </section>
    </template>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="message" role="status">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { directOrdersApi } from '@/api/directOrders'
import { courierError, dtdcTracking, dtdcDate } from '@/utils/courier'
import type { DirectOrder } from '@/types'
const props = withDefaults(defineProps<{ order: DirectOrder; trackingEnabled?: boolean }>(), { trackingEnabled: true })
const emit = defineEmits<{ updated: [order: DirectOrder] }>()
const busy = ref('')
const error = ref('')
const message = ref('')
const showHistory = ref(false)
const labelCode = ref('SHIP_LABEL_4X6')
const tracking = computed(() => dtdcTracking(props.order))
const cancelled = computed(() => props.order.courier_status?.toLowerCase() === 'cancelled')
async function run(action: string, task: () => Promise<void>) {
  if (busy.value) return
  busy.value = action; error.value = ''; message.value = ''
  try { await task() } catch (err) { error.value = await courierError(err) } finally { busy.value = '' }
}
async function track() {
  await run('tracking', async () => {
    const response = await directOrdersApi.trackDTDC(props.order.order_id)
    emit('updated', response.order); showHistory.value = true; message.value = response.message
  })
}
async function reconcile() {
  await run('reconciling', async () => {
    const response = await directOrdersApi.reconcileDTDC(props.order.order_id)
    emit('updated', response.order); showHistory.value = true; message.value = response.message
  })
}
async function label() {
  await run('label', async () => {
    const blob = await directOrdersApi.labelDTDC(props.order.order_id, labelCode.value)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url; link.download = `dtdc-${props.order.awb}.pdf`
    document.body.appendChild(link); link.click(); link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  })
}
async function cancel() {
  if (!confirm(`Cancel DTDC shipment ${props.order.awb} for ${props.order.order_id}? This sends a cancellation request to DTDC.`)) return
  await run('cancelling', async () => {
    const response = await directOrdersApi.cancelDTDC(props.order.order_id)
    emit('updated', response.order); message.value = response.message
  })
}
</script>

<style scoped>
.shipment-actions { display: grid; gap: .7rem; padding: .4rem 0; }
.actions { display: flex; align-items: center; flex-wrap: wrap; gap: .6rem; }
button, select { padding: .55rem .7rem; border-radius: 8px; border: 1px solid #cbd5e1; background: white; color: #0f766e; font: inherit; font-size: .8rem; font-weight: 700; cursor: pointer; }
button:disabled { opacity: .5; cursor: default; } .danger { color: #b91c1c; }
.label-select { display: flex; align-items: center; gap: .4rem; font-size: .8rem; }
.notice { background: #fffbeb; padding: .8rem; border-radius: 10px; color: #92400e; }
p { margin: 0; font-size: .85rem; line-height: 1.5; } .error { color: #b91c1c; white-space: pre-line; } .muted { color: #64748b; }
.tracking { background: #f8fafc; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 12px; }
.summary, .timeline li { display: grid; gap: .35rem; font-size: .85rem; }
.summary { margin-bottom: 1rem; } .timeline { padding-left: 1.3rem; margin: 0; display: grid; gap: 1rem; }
.timeline li { display: list-item; } .timeline li span { display: block; color: #475569; margin-top: .2rem; }
</style>
