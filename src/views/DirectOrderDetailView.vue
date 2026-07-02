<template>
  <div class="direct-detail-page">
    <div class="top-row">
      <router-link to="/direct-orders" class="back-link">Back to Direct Orders</router-link>
      <div class="top-actions" v-if="order">
        <router-link :to="`/direct-orders/${order.order_id}/edit`" class="btn-secondary">Edit</router-link>
        <button class="btn-primary" :disabled="syncing" @click="handleDelhiveryForwardOrder">
          {{ syncing ? 'Creating...' : 'Create Forward Order In Delhivery' }}
        </button>
      </div>
    </div>

    <section class="detail-card">
      <header class="detail-header">
        <div>
          <p class="eyebrow">Direct order</p>
          <h1>{{ order?.order_id || 'Direct Order Details' }}</h1>
          <p class="sub-copy">Track the local order data and the courier sync result from one screen.</p>
        </div>
      </header>

      <div v-if="store.loading" class="empty-state"><p>Loading...</p></div>
      <template v-else-if="order">
        <div class="detail-sections">
          <section class="detail-section">
            <div class="section-header">
              <h2>Order Basics</h2>
            </div>
            <div class="detail-grid">
              <div class="detail-item"><dt>Order ID</dt><dd>{{ order.order_id }}</dd></div>
              <div class="detail-item"><dt>Source</dt><dd>{{ order.source || 'Not set' }}</dd></div>
              <div class="detail-item"><dt>Status</dt><dd>{{ order.order_status }}</dd></div>
              <div class="detail-item"><dt>Payment</dt><dd>{{ order.payment_status }}</dd></div>
              <div class="detail-item"><dt>Priority</dt><dd>{{ order.priority }}</dd></div>
              <div class="detail-item"><dt>Amount</dt><dd>{{ formatCurrency(order.amount) }}</dd></div>
              <div class="detail-item"><dt>Invoice Date</dt><dd>{{ formatDate(order.invoice_date) }}</dd></div>
            </div>
          </section>

          <section class="detail-section">
            <div class="section-header">
              <h2>Customer Details</h2>
            </div>
            <div class="detail-grid">
              <div class="detail-item"><dt>Customer</dt><dd>{{ order.customer_name || 'Not set' }}</dd></div>
              <div class="detail-item"><dt>Mobile</dt><dd>{{ order.mobile || 'Not set' }}</dd></div>
              <div class="detail-item detail-item--wide"><dt>Address</dt><dd>{{ fullAddress }}</dd></div>
              <div class="detail-item"><dt>Email</dt><dd>{{ order.email || 'Not set' }}</dd></div>
              <div class="detail-item"><dt>Alternate Email</dt><dd>{{ order.alternate_email || 'Not set' }}</dd></div>
            </div>
          </section>

          <section class="detail-section">
            <div class="section-header">
              <h2>Shipment And Courier</h2>
            </div>
            <div class="detail-grid">
              <div class="detail-item"><dt>Courier Type</dt><dd>{{ order.courier_type || 'manual' }}</dd></div>
              <div class="detail-item"><dt>Pickup Location</dt><dd>{{ order.pickup_location || 'Not set' }}</dd></div>
              <div class="detail-item"><dt>Service Type</dt><dd>{{ order.service_type || 'Not set' }}</dd></div>
              <div class="detail-item"><dt>AWB</dt><dd>{{ order.awb || 'Not set' }}</dd></div>
              <div class="detail-item"><dt>Courier Status</dt><dd>{{ order.courier_status || 'Not yet synced' }}</dd></div>
              <div class="detail-item"><dt>Courier Order ID</dt><dd>{{ order.courier_order_id || 'Not set' }}</dd></div>
              <div class="detail-item"><dt>Shipment Weight (g)</dt><dd>{{ order.total_weight ?? 'Not set' }}</dd></div>
              <div class="detail-item"><dt>Dimensions</dt><dd>{{ dimensions }}</dd></div>
            </div>
          </section>

          <section class="detail-section">
            <div class="section-header">
              <h2>Notes</h2>
            </div>
            <div class="detail-grid">
              <div class="detail-item detail-item--wide"><dt>Remarks</dt><dd>{{ order.remarks || 'None' }}</dd></div>
              <div class="detail-item detail-item--wide"><dt>Issues</dt><dd>{{ order.issues || 'None' }}</dd></div>
            </div>
          </section>
        </div>

        <section class="items-section">
          <div class="section-header">
            <h2>Items</h2>
            <span>{{ order.items.length }} line(s)</span>
          </div>
          <div v-if="order.items.length === 0" class="empty-inline">No items added.</div>
          <div v-else class="items-list">
            <article class="item-card" v-for="item in order.items" :key="item.id || `${item.item}-${item.quantity}`">
              <strong>{{ item.item || 'Unnamed item' }}</strong>
              <p>Qty: {{ item.quantity }}</p>
              <p>SKU: {{ item.sku || 'NA' }}</p>
              <p>HSN: {{ item.hsn || 'NA' }}</p>
              <p>Item Weight (g): {{ item.weight ?? 'NA' }}</p>
              <p>Amount: {{ formatCurrency(item.amount) }}</p>
              <p>Customer Size (in): {{ formatSize(item.customer_width_in_inches, item.customer_length_in_inches) }}</p>
              <p>Customer Size (mm): {{ formatSize(item.customer_width_in_mm, item.customer_length_in_mm) }}</p>
              <p>Corner Radius and Notes: {{ item.corner_radius_and_notes || 'NA' }}</p>
            </article>
          </div>
        </section>
      </template>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useDirectOrdersStore } from '@/stores/directOrders'
import type { DirectOrder } from '@/types'

const route = useRoute()
const store = useDirectOrdersStore()
const order = ref<DirectOrder | null>(null)
const syncing = ref(false)

const fullAddress = computed(() => {
  if (!order.value) return 'Not set'
  return [
    order.value.address,
    order.value.landmark,
    order.value.city,
    order.value.state,
    order.value.pincode,
    order.value.country,
  ].filter(Boolean).join(', ')
})

const dimensions = computed(() => {
  if (!order.value) return 'Not set'
  const values = [order.value.length_cm, order.value.width_cm, order.value.height_cm]
  if (values.every((value) => value == null)) return 'Not set'
  return `${order.value.length_cm ?? '-'} x ${order.value.width_cm ?? '-'} x ${order.value.height_cm ?? '-'} cm`
})

const formatCurrency = (value?: number | null) => value == null ? 'Not set' : `₹${value.toFixed(2)}`
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString() : 'Not set'
const formatSize = (width?: number | null, length?: number | null) => (width == null && length == null ? 'NA' : `${width ?? '-'} x ${length ?? '-'}`)

const handleDelhiveryForwardOrder = async () => {
  if (!order.value) return
  syncing.value = true
  try {
    const response = await store.createDelhiveryForwardOrder(order.value.order_id)
    order.value = response.order
    alert(response.message)
  } catch (error: any) {
    alert(error.response?.data?.error || 'Failed to create Delhivery forward order')
  } finally {
    syncing.value = false
  }
}

onMounted(async () => {
  order.value = await store.fetchOrderById(route.params.id as string)
})
</script>

<style scoped>
.direct-detail-page {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.top-row,
.top-actions,
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.back-link {
  color: #0f766e;
  font-weight: 800;
  text-decoration: none;
}

.detail-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  padding: 1.4rem 1.5rem;
}

.detail-sections {
  display: grid;
  gap: 1rem;
}

.detail-section {
  display: grid;
  gap: 0.8rem;
}

.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  font-weight: 800;
  color: #0f766e;
}

h1,
h2 {
  margin: 0;
  color: #0f172a;
  font-weight: 900;
}

.sub-copy {
  margin: 0.75rem 0 0;
  color: #64748b;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.detail-item {
  padding: 1rem;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.detail-item--wide {
  grid-column: span 2;
}

.detail-item dt {
  color: #64748b;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 800;
}

.detail-item dd {
  margin: 0.45rem 0 0;
  color: #0f172a;
  font-size: 1rem;
  font-weight: 800;
}

.items-section {
  margin-top: 1rem;
  display: grid;
  gap: 1rem;
}

.items-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.item-card {
  padding: 1rem;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(240, 249, 255, 0.8), rgba(248, 250, 252, 0.98));
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.item-card p,
.empty-inline,
.empty-state {
  color: #64748b;
}

.btn-primary,
.btn-secondary {
  min-height: 2.8rem;
  padding: 0 1rem;
  border-radius: 14px;
  font: inherit;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  cursor: pointer;
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

@media (max-width: 900px) {
  .items-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .top-row,
  .top-actions,
  .section-header {
    flex-direction: column;
    align-items: stretch;
  }

  .detail-grid,
  .items-list {
    grid-template-columns: 1fr;
  }

  .detail-item--wide {
    grid-column: span 1;
  }
}
</style>
