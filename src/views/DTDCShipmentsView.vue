<template>
  <div class="dtdc-page">
    <header class="hero">
      <div><p class="eyebrow">Courier operations</p><h1>DTDC Shipments</h1><p>All DTDC forward orders, saved status, and shipment tracking in one place.</p></div>
      <div class="hero-actions"><router-link to="/direct-orders">Direct Orders</router-link><button :disabled="loading || refreshing" @click="load">Reload list</button><button class="primary" :disabled="loading || refreshing || !settings?.tracking_enabled || !trackable.length" @click="refreshPage">{{ refreshing ? 'Refreshing tracking…' : 'Refresh page tracking' }}</button></div>
    </header>
    <p v-if="settings?.missing_config.length" class="notice">DTDC booking setup is incomplete. Missing backend environment variables: {{ settings.missing_config.join(', ') }}.</p>
    <p v-if="settings && !settings.tracking_enabled" class="notice">Set DTDC_TRACKING_TOKEN in the backend environment to enable live tracking.</p>
    <form class="filters" @submit.prevent="apply">
      <label>Search orders, customers, mobile or AWB<input v-model.trim="filters.search" placeholder="Order ID, name, phone, AWB…" /></label>
      <label>Courier status<input v-model.trim="filters.courier_status" placeholder="e.g. Booked, Delivered" list="dtdc-statuses" /><datalist id="dtdc-statuses"><option v-for="status in statuses" :key="status" :value="status" /></datalist></label>
      <label>Created from<input v-model="filters.date_from" type="date" /></label>
      <label>Created to<input v-model="filters.date_to" type="date" /></label>
      <button type="submit" :disabled="loading || refreshing">Apply filters</button><button type="button" :disabled="loading || refreshing" @click="clear">Clear</button>
    </form>
    <p v-if="error" class="error notice" role="alert">{{ error }}</p>
    <p v-if="refreshSummary" class="notice" role="status">{{ refreshSummary }}</p>
    <section class="shipments" :aria-busy="loading || refreshing">
      <div class="section-heading"><h2>{{ total }} shipment(s)</h2><span>Tracking is refreshed on demand. All dates and scans below are saved results.</span></div>
      <p v-if="loading" class="empty" role="status">Loading DTDC shipments…</p>
      <p v-else-if="!orders.length" class="empty">No DTDC shipments match these filters. Schedule a direct order via DTDC to see it here.</p>
      <article v-for="order in orders" v-else :key="order.order_id" class="shipment">
        <div class="shipment-heading"><div><router-link :to="`/direct-orders/${order.order_id}`" class="order-id">{{ order.order_id }}</router-link><p>{{ order.customer_name || 'Customer' }} · {{ order.mobile || 'No phone' }}</p></div><span :class="['status', { review: !order.awb }]">{{ courierStatusLabel(order.courier_status) }}</span></div>
        <dl class="shipment-facts"><div><dt>AWB</dt><dd>{{ order.awb || 'Awaiting reconciliation' }}</dd></div><div><dt>Destination</dt><dd>{{ [order.city, order.state, order.pincode].filter(Boolean).join(', ') }}</dd></div><div><dt>Service / weight</dt><dd>{{ order.service_type || settings?.service_type || 'Not recorded' }} · {{ order.total_weight || 0 }} g</dd></div><div><dt>Booked</dt><dd>{{ order.manifested_at ? new Date(order.manifested_at).toLocaleString('en-IN') : 'Not confirmed' }}</dd></div><div><dt>Payment</dt><dd>{{ order.cod_amount ? `COD ₹${order.cod_amount}` : 'Prepaid' }}</dd></div></dl>
        <DTDCShipmentActions :inert="refreshing" :order="order" :tracking-enabled="Boolean(settings?.tracking_enabled)" @updated="updateOrder" />
      </article>
      <div :inert="loading || refreshing"><PaginationControls :page="page" :limit="limit" :total="total" :total-pages="totalPages" item-label="shipments" @change="changePage" @limit-change="changeLimit" /></div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { directOrdersApi } from '@/api/directOrders'
import DTDCShipmentActions from '@/components/DTDCShipmentActions.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import { courierError, courierStatusLabel } from '@/utils/courier'
import type { DirectOrder, DTDCSettings } from '@/types'
const orders = ref<DirectOrder[]>([])
const settings = ref<DTDCSettings | null>(null)
const loading = ref(false)
const refreshing = ref(false)
const error = ref('')
const refreshSummary = ref('')
const total = ref(0)
const totalPages = ref(0)
const page = ref(1)
const limit = ref(25)
const filters = ref({ search: '', courier_status: '', date_from: '', date_to: '' })
const activeFilters = ref({ ...filters.value })
const statuses = ['Booked', 'Delivered', 'Out For Delivery', 'In Transit', 'Cancelled', 'booking_pending', 'booking_review']
const trackable = computed(() => orders.value.filter(order => order.awb))
function updateOrder(order: DirectOrder) { orders.value = orders.value.map(row => row.order_id === order.order_id ? order : row) }
async function load() {
  if (loading.value || refreshing.value) return
  loading.value = true; error.value = ''; refreshSummary.value = ''
  try {
    const response = await directOrdersApi.listDTDCShipments({ ...activeFilters.value, page: page.value, limit: limit.value })
    orders.value = response.data; total.value = response.total; totalPages.value = response.total_pages
    page.value = response.page; limit.value = response.limit
  } catch (err) { error.value = await courierError(err) }
  finally { loading.value = false }
}
async function apply() {
  if (filters.value.date_from && filters.value.date_to && filters.value.date_from > filters.value.date_to) { error.value = 'Created from must be before Created to.'; return }
  activeFilters.value = { ...filters.value }; page.value = 1; await load()
}
async function clear() { filters.value = { search: '', courier_status: '', date_from: '', date_to: '' }; await apply() }
async function changePage(value: number) { page.value = value; await load() }
async function changeLimit(value: number) { limit.value = value; page.value = 1; await load() }
async function refreshPage() {
  if (refreshing.value || loading.value) return
  refreshing.value = true; error.value = ''; refreshSummary.value = ''
  const targets = [...trackable.value]
  let success = 0
  const failures: string[] = []
  try {
    for (const order of targets) {
      try { updateOrder((await directOrdersApi.trackDTDC(order.order_id)).order); success++ }
      catch (err) { failures.push(`${order.order_id}: ${await courierError(err)}`) }
      refreshSummary.value = `Checked ${success + failures.length} of ${targets.length} shipments…`
    }
    refreshSummary.value = `Refreshed ${success} shipment(s).${failures.length ? ` ${failures.length} failed; saved statuses retained.` : ''}`
    error.value = failures.join('\n')
  } finally { refreshing.value = false }
}
onMounted(async () => {
  await Promise.all([
    load(),
    directOrdersApi.dtdcSettings().then(value => { settings.value = value }).catch(async err => { error.value = await courierError(err) }),
  ])
})
</script>

<style scoped>
.dtdc-page { max-width: 1400px; margin: auto; display: grid; gap: 1rem; color: #0f172a; }
.hero, .filters, .shipments { padding: 1.5rem; border-radius: 20px; background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px #0f172a06; }
.hero, .hero-actions, .section-heading, .shipment-heading { display: flex; gap: 1rem; justify-content: space-between; align-items: center; flex-wrap: wrap; }
h1 { margin: .3rem 0 .6rem; font-size: 2rem; } h2 { margin: 0; font-size: 1.1rem; } p { margin: 0; line-height: 1.6; color: #475569; }
.eyebrow { color: #0f766e; font-size: .75rem; font-weight: 800; text-transform: uppercase; letter-spacing: .13em; }
.hero-actions { justify-content: flex-start; gap: .6rem; }
button, .hero-actions a { padding: .65rem .9rem; border: 1px solid #cbd5e1; border-radius: 9px; font: inherit; font-size: .85rem; font-weight: 700; background: white; color: #0f766e; cursor: pointer; text-decoration: none; }
button:disabled { opacity: .5; cursor: default; } .primary { background: #0f766e; color: white; border-color: #0f766e; }
.filters { display: flex; align-items: end; gap: .8rem; flex-wrap: wrap; }
label { display: grid; gap: .4rem; font-size: .8rem; font-weight: 700; } .filters label:first-child { flex: 1; min-width: 230px; }
input { padding: .65rem; border: 1px solid #cbd5e1; border-radius: 8px; font: inherit; min-width: 0; }
.notice { background: #fffbeb; padding: 1rem; border-radius: 12px; color: #92400e; font-size: .85rem; overflow-wrap: anywhere; }
.error { color: #b91c1c; background: #fef2f2; white-space: pre-line; }
.section-heading { margin-bottom: 1rem; } .section-heading span { font-size: .8rem; color: #64748b; }
.empty { padding: 3rem 1rem; text-align: center; }
.shipment { border-top: 1px solid #e2e8f0; padding: 1.2rem 0; }
.order-id { font-weight: 800; color: #0f766e; text-decoration: none; } .shipment-heading p { font-size: .85rem; margin-top: .3rem; }
.status { border-radius: 30px; background: #ccfbf1; color: #115e59; padding: .4rem .8rem; font-size: .8rem; font-weight: 700; } .status.review { background: #fef3c7; color: #92400e; }
.shipment-facts { display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); gap: 1rem; margin: 1rem 0; }
dt { font-size: .7rem; color: #64748b; font-weight: 700; text-transform: uppercase; } dd { margin: .3rem 0 0; font-size: .85rem; overflow-wrap: anywhere; }
@media(max-width: 700px) { .shipment-facts { grid-template-columns: repeat(2,minmax(0,1fr)); } .hero, .filters, .shipments { padding: 1rem; } }
</style>
