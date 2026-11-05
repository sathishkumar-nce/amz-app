<template>
  <div class="courier-workspace">
    <header class="cw-card cw-hero"><div><p class="cw-eyebrow">Customer support</p><h1>Tracking & WhatsApp</h1><p class="cw-muted">Find a customer's direct orders, fetch official courier updates, and prepare a WhatsApp message.</p></div><router-link to="/courier-shipments" class="cw-button">Courier Shipments</router-link></header>
    <form class="cw-card cw-filters" @submit.prevent="search"><label class="cw-search">Customer mobile, tracking ID, customer name or order ID<input v-model.trim="query" aria-label="Find customer orders" placeholder="e.g. mobile number, AWB or customer name" required /></label><button class="cw-primary" :disabled="searching">{{ searching ? 'Searching…' : 'Find orders' }}</button></form>
    <p v-if="searchError" class="cw-notice cw-error" role="alert">{{ searchError }}</p>
    <div class="tracking-workspace-grid">
      <section class="cw-card results-panel"><h2>{{ searched ? `${total} matching order(s)` : 'Customer orders' }}</h2><p v-if="!searched" class="cw-empty">Search to see the customer's available orders and shipment status.</p><p v-else-if="!searching && !orders.length" class="cw-empty">No matching direct orders found.</p><p v-if="searching" class="cw-muted" role="status">Finding orders…</p>
        <article v-for="order in orders" :key="order.order_id" :class="['result-order',{selected:selected?.order_id===order.order_id}]">
          <div class="cw-actions result-heading"><strong>{{ order.order_id }}</strong><span class="cw-badge">{{ order.courier_status || order.order_status }}</span></div><p>{{ order.customer_name || 'Customer not recorded' }}</p><p class="cw-muted">{{ order.mobile || 'No mobile recorded' }} · {{ [order.city,order.pincode].filter(Boolean).join(' ') }}</p><p class="cw-muted">Order: {{ order.order_status }} · {{ trackingDate(order.created_at) }}</p>
          <div class="cw-actions"><button type="button" @click="selectOrder(order)">View details</button><button v-if="order.awb" type="button" class="awb-button" @click="openTracking(order)">{{ order.awb }}</button><span v-else class="cw-muted">Tracking ID not assigned</span></div>
        </article>
        <PaginationControls :page="page" :limit="limit" :total="total" :total-pages="totalPages" item-label="orders" :page-size-options="[10,25,50]" @change="changePage" @limit-change="changeLimit" />
      </section>
      <section class="cw-card tracking-detail" aria-label="Selected order and tracking">
        <p v-if="!selected" class="cw-empty">Select an order or click its tracking ID. Its details and message preview will appear here.</p>
        <template v-else>
          <div class="cw-actions result-heading"><div><p class="cw-eyebrow">Selected order</p><h2>{{ selected.order_id }}</h2></div><router-link :to="`/direct-orders/${encodeURIComponent(selected.order_id)}`" class="cw-order-link">Full order</router-link></div>
          <dl class="cw-facts"><div><dt>Customer</dt><dd>{{ selected.customer_name }}</dd></div><div><dt>Order status</dt><dd>{{ selected.order_status }}</dd></div><div><dt>Payment</dt><dd>{{ selected.payment_status }} · ₹{{ selected.amount ?? 0 }}</dd></div><div><dt>Courier / AWB</dt><dd>{{ selected.courier_type || 'Not assigned' }} · {{ selected.awb || 'Not assigned' }}</dd></div></dl><p class="cw-muted">{{ [selected.address,selected.city,selected.state,selected.pincode].filter(Boolean).join(', ') }}</p>
          <ul class="item-summary"><li v-for="(item,index) in selected.items" :key="index">{{ item.item }} × {{ item.quantity }}</li></ul>
          <div v-if="selected.awb" class="cw-actions tracking-controls"><button v-if="supported" type="button" class="cw-primary" :disabled="fetching" @click="refreshTracking">{{ fetching ? `Contacting ${selected.courier_type}…` : 'Fetch latest courier status' }}</button><a v-if="officialURL" :href="officialURL" target="_blank" rel="noopener noreferrer" class="cw-button">Official tracking page</a></div>
          <p v-else class="cw-notice">This order has not been assigned a tracking ID. Its saved order status can still be shared.</p>
          <p v-if="selected.awb && !supported" class="cw-notice">Official API tracking is available for DTDC and Delhivery orders.</p>
          <p v-if="trackingError" class="cw-notice cw-error" role="alert">{{ trackingError }}{{ tracking ? '\nSaved tracking is shown below; check its last-checked time.' : '' }}</p>
          <p v-if="fetching" class="cw-muted" role="status">Fetching current details from the official courier API…</p>
          <CarrierTrackingDetails v-if="selected.awb" :tracking="tracking" />
          <hr class="cw-divider" />
          <h2>WhatsApp message</h2><p class="cw-muted">Review the recipient and message. WhatsApp Web opens with this text; you click Send there.</p>
          <label>Recipient mobile<input v-model.trim="recipient" aria-label="WhatsApp recipient mobile" inputmode="tel" placeholder="10-digit Indian number or country code + number" /></label><p v-if="recipient && !recipientValid" class="cw-notice cw-error">Enter a valid mobile number with country code, or a 10-digit Indian mobile number.</p>
          <label class="message-label">Message preview<textarea v-model="draft" aria-label="WhatsApp message preview" rows="13" @input="messageEdited=true" /></label>
          <div class="cw-actions"><a v-if="whatsappURL" :href="whatsappURL" target="_blank" rel="noopener noreferrer" class="cw-button cw-primary">Open WhatsApp Web</a><button v-else type="button" disabled>Open WhatsApp Web</button><button type="button" @click="resetMessage">Reset message</button></div>
        </template>
      </section>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed,onMounted,ref } from 'vue'
import { useRoute } from 'vue-router'
import { directOrdersApi } from '@/api/directOrders'
import { courierError } from '@/utils/courier'
import { buildTrackingMessage,officialTrackingURL,savedTracking,trackingDate,whatsappPhone,whatsappWebURL } from '@/utils/customerTracking'
import CarrierTrackingDetails from '@/components/CarrierTrackingDetails.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import type { DirectOrder,ShipmentTracking } from '@/types'
import '@/assets/courier-workspace.css'
const route=useRoute()
const query=ref(''),submittedQuery=ref(''),searched=ref(false),searching=ref(false),searchError=ref('')
const orders=ref<DirectOrder[]>([]),selected=ref<DirectOrder|null>(null),tracking=ref<ShipmentTracking|null>(null)
const page=ref(1),limit=ref(10),total=ref(0),totalPages=ref(0),fetching=ref(false),trackingError=ref('')
const recipient=ref(''),draft=ref(''),messageEdited=ref(false)
let searchVersion=0,trackingVersion=0
const supported=computed(()=>['dtdc','delhivery'].includes(selected.value?.courier_type?.toLowerCase() || ''))
const officialURL=computed(()=>officialTrackingURL(selected.value?.courier_type,selected.value?.awb))
const recipientValid=computed(()=>Boolean(whatsappPhone(recipient.value)))
const whatsappURL=computed(()=>whatsappWebURL(recipient.value,draft.value))
function resetMessage(){if(selected.value)draft.value=buildTrackingMessage(selected.value,tracking.value);messageEdited.value=false}
function selectOrder(order:DirectOrder){trackingVersion++;fetching.value=false;selected.value=order;tracking.value=savedTracking(order);trackingError.value='';recipient.value=order.mobile || order.alternate_mobile || '';resetMessage()}
async function openTracking(order:DirectOrder){selectOrder(order);if(supported.value)await refreshTracking()}
async function refreshTracking(){
  const order=selected.value;if(!order?.awb||!supported.value)return
  const version=++trackingVersion;fetching.value=true;trackingError.value=''
  try{const response=await directOrdersApi.trackShipment(order.order_id);if(version!==trackingVersion||selected.value?.order_id!==order.order_id)return;selected.value=response.order;tracking.value=response.tracking;orders.value=orders.value.map(row=>row.order_id===order.order_id?response.order:row);if(!messageEdited.value)draft.value=buildTrackingMessage(response.order,response.tracking)}
  catch(err){if(version===trackingVersion)trackingError.value=await courierError(err)}
  finally{if(version===trackingVersion)fetching.value=false}
}
async function load(){
  const version=++searchVersion;searching.value=true;searchError.value='';trackingVersion++;selected.value=null;tracking.value=null;recipient.value='';draft.value='';fetching.value=false;orders.value=[]
  try{const response=await directOrdersApi.search({search:submittedQuery.value,page:page.value,limit:limit.value});if(version!==searchVersion)return;orders.value=response.data;page.value=response.page;total.value=response.total;totalPages.value=response.total_pages}
  catch(err){if(version===searchVersion){searchError.value=await courierError(err);total.value=0;totalPages.value=0}}
  finally{if(version===searchVersion)searching.value=false}
}
async function search(){if(!query.value.trim())return;submittedQuery.value=query.value.trim();page.value=1;searched.value=true;await load()}
async function changePage(value:number){if(searching.value)return;page.value=value;await load()}
async function changeLimit(value:number){if(searching.value)return;limit.value=value;page.value=1;await load()}
onMounted(async()=>{const id=route.query.order_id;if(typeof id==='string'&&id){searched.value=true;searching.value=true;try{const order=await directOrdersApi.getById(id);orders.value=[order];total.value=1;totalPages.value=1;query.value=id;submittedQuery.value=id;await openTracking(order)}catch(err){searchError.value=await courierError(err)}finally{searching.value=false}}})
</script>
<style scoped>
.tracking-workspace-grid { display:grid; grid-template-columns:minmax(290px,.8fr) minmax(0,1.25fr); gap:1rem; align-items:start; }
.result-order { padding:1rem; border:1px solid #e2e8f0; border-radius:12px; margin:.8rem 0; }
.result-order.selected { border-color:#0f766e; background:#f0fdfa; }
.result-heading { justify-content:space-between; }
.tracking-controls { margin:1rem 0; }
.courier-workspace .awb-button { text-decoration:underline; background:#f0fdfa; }
.message-label { margin:1rem 0; }
.item-summary { padding-left:1.2rem; font-size:.85rem; color:#475569; }
@media(max-width:1050px){.tracking-workspace-grid {grid-template-columns:1fr;}}
</style>
