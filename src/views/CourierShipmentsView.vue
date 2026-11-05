<template>
  <div class="courier-workspace">
    <header class="cw-card cw-hero"><div><p class="cw-eyebrow">Direct order dispatch</p><h1>Courier Shipments</h1><p class="cw-muted">DTDC and Delhivery orders, shipment details, labels and current status.</p></div><div class="cw-actions"><router-link to="/order-tracking" class="cw-button cw-primary">Tracking & WhatsApp</router-link><router-link to="/courier-settings" class="cw-button">Courier Settings</router-link></div></header>
    <form class="cw-card cw-filters" @submit.prevent="apply">
      <label class="cw-search">Customer, mobile, order or tracking ID<input v-model.trim="filters.search" placeholder="Search shipments…" /></label>
      <label>Courier<select v-model="filters.courier" aria-label="Courier filter"><option value="all">All couriers</option><option value="dtdc">DTDC</option><option value="delhivery">Delhivery</option></select></label>
      <label>Shipment status<input v-model.trim="filters.courier_status" placeholder="e.g. Delivered" /></label>
      <label>Created from<input v-model="filters.date_from" type="date" /></label><label>Created to<input v-model="filters.date_to" type="date" /></label>
      <button class="cw-primary" :disabled="loading || !!busyId">Apply filters</button><button type="button" :disabled="loading || !!busyId" @click="clear">Clear</button>
    </form>
    <p v-if="error" class="cw-notice cw-error" role="alert">{{ error }}</p>
    <section class="cw-card" :aria-busy="loading">
      <div class="cw-actions shipment-heading"><h2>{{ total }} shipment(s)</h2><button :disabled="loading || !!busyId" @click="load">Reload list</button></div>
      <p v-if="loading" class="cw-empty">Loading courier shipments…</p><p v-else-if="!orders.length" class="cw-empty">No courier shipments match these filters.</p>
      <article v-for="order in orders" v-else :key="order.order_id" class="shipment-row">
        <div class="cw-actions shipment-heading"><div><router-link :to="`/direct-orders/${encodeURIComponent(order.order_id)}`" class="cw-order-link">{{ order.order_id }}</router-link><p class="cw-muted">{{ order.customer_name }} · {{ order.mobile }}</p></div><div class="cw-actions"><span class="cw-badge">{{ (order.courier_type || '').toUpperCase() }}</span><span class="cw-badge">{{ courierStatusLabel(order.courier_status) }}</span></div></div>
        <dl class="cw-facts"><div><dt>Tracking ID</dt><dd><button v-if="order.awb" class="awb-link" :disabled="!!busyId" @click="track(order)">{{ order.awb }}</button><span v-else>Awaiting booking recovery</span></dd></div><div><dt>Order status</dt><dd>{{ order.order_status }}</dd></div><div><dt>Destination</dt><dd>{{ [order.city,order.state,order.pincode].filter(Boolean).join(', ') }}</dd></div><div><dt>Service / weight</dt><dd>{{ order.service_type || 'Not recorded' }} · {{ order.total_weight || 0 }} g</dd></div></dl>
        <div class="cw-actions"><router-link :to="{ path: '/order-tracking', query: { order_id: order.order_id } }" class="cw-button">Track & prepare WhatsApp</router-link><button v-if="order.awb" :disabled="!!busyId" @click="track(order)">{{ busyId === order.order_id ? 'Fetching courier…' : 'Fetch latest tracking' }}</button></div>
        <p v-if="rowError.id === order.order_id" class="cw-notice cw-error" role="alert">{{ rowError.message }}</p>
        <CarrierTrackingDetails v-if="trackingId === order.order_id" :tracking="tracking" class="tracking-box" />
        <details class="order-details"><summary>Customer, payment, package and item details</summary><dl class="cw-facts"><div><dt>Address</dt><dd>{{ [order.address,order.landmark,order.city,order.state,order.pincode].filter(Boolean).join(', ') }}</dd></div><div><dt>Payment / total</dt><dd>{{ order.payment_status }} · ₹{{ order.amount ?? 0 }}</dd></div><div><dt>COD / advance</dt><dd>₹{{ order.cod_amount ?? 0 }} / ₹{{ order.advance_amount ?? 0 }}</dd></div><div><dt>Packages / dimensions</dt><dd>{{ order.package_count || 1 }} · {{ order.length_cm || '-' }} × {{ order.width_cm || '-' }} × {{ order.height_cm || '-' }} cm</dd></div><div><dt>Created</dt><dd>{{ trackingDate(order.created_at) }}</dd></div><div><dt>Booked</dt><dd>{{ trackingDate(order.manifested_at || '') || 'Not confirmed' }}</dd></div><div><dt>Email</dt><dd>{{ order.email || 'Not provided' }}</dd></div><div><dt>Remarks / issues</dt><dd>{{ [order.remarks,order.issues].filter(Boolean).join(' · ') || 'None' }}</dd></div></dl><ul><li v-for="(item,index) in order.items" :key="index">{{ item.item }} × {{ item.quantity }} · SKU {{ item.sku || '—' }} · HSN {{ item.hsn || '—' }}</li></ul></details>
        <DTDCShipmentActions v-if="order.courier_type === 'dtdc'" :order="order" :tracking-enabled="metadata?.tracking_enabled" @updated="updateOrder" />
      </article>
      <PaginationControls :page="page" :limit="limit" :total="total" :total-pages="totalPages" item-label="shipments" @change="changePage" @limit-change="changeLimit" />
    </section>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { directOrdersApi } from '@/api/directOrders'
import { courierError,courierStatusLabel } from '@/utils/courier'
import { savedTracking,trackingDate } from '@/utils/customerTracking'
import DTDCShipmentActions from '@/components/DTDCShipmentActions.vue'
import CarrierTrackingDetails from '@/components/CarrierTrackingDetails.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import type { DirectOrder,DTDCSettings,ShipmentTracking } from '@/types'
import '@/assets/courier-workspace.css'
const orders=ref<DirectOrder[]>([]),metadata=ref<DTDCSettings|null>(null),tracking=ref<ShipmentTracking|null>(null)
const loading=ref(false),error=ref(''),busyId=ref(''),trackingId=ref(''),rowError=ref({id:'',message:''})
const page=ref(1),limit=ref(25),total=ref(0),totalPages=ref(0)
const filters=ref({search:'',courier:'all',courier_status:'',date_from:'',date_to:''}),activeFilters=ref({...filters.value})
function updateOrder(order:DirectOrder){orders.value=orders.value.map(row=>row.order_id===order.order_id?order:row);if(trackingId.value===order.order_id)tracking.value=savedTracking(order)}
async function load(){if(loading.value||busyId.value)return;loading.value=true;error.value='';try{const response=await directOrdersApi.shipments({...activeFilters.value,page:page.value,limit:limit.value});orders.value=response.data;total.value=response.total;totalPages.value=response.total_pages;page.value=response.page;trackingId.value=''}catch(err){error.value=await courierError(err)}finally{loading.value=false}}
async function apply(){if(filters.value.date_from&&filters.value.date_to&&filters.value.date_from>filters.value.date_to){error.value='Created from must be before Created to.';return}activeFilters.value={...filters.value};page.value=1;await load()}
async function clear(){filters.value={search:'',courier:'all',courier_status:'',date_from:'',date_to:''};await apply()}
async function changePage(value:number){if(loading.value||busyId.value)return;page.value=value;await load()}
async function changeLimit(value:number){if(loading.value||busyId.value)return;limit.value=value;page.value=1;await load()}
async function track(order:DirectOrder){if(busyId.value)return;busyId.value=order.order_id;trackingId.value=order.order_id;tracking.value=savedTracking(order);rowError.value={id:'',message:''};try{const response=await directOrdersApi.trackShipment(order.order_id);updateOrder(response.order);tracking.value=response.tracking}catch(err){rowError.value={id:order.order_id,message:await courierError(err)}}finally{busyId.value=''}}
onMounted(async()=>{await Promise.all([load(),directOrdersApi.dtdcSettings().then(value=>{metadata.value=value}).catch(()=>{metadata.value=null})])})
</script>
<style scoped>
.shipment-heading { justify-content:space-between; }
.shipment-row { padding:1.3rem 0; border-top:1px solid #e2e8f0; }
.courier-workspace .awb-link { border:0; padding:0; background:none; text-decoration:underline; font-weight:800; }
.tracking-box { margin:1rem 0; }
.order-details { margin:1rem 0; font-size:.85rem; }
summary { color:#0f766e; font-weight:750; cursor:pointer; }
li { padding:.3rem 0; }
</style>
