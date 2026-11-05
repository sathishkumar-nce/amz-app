<template>
  <section aria-label="Carrier tracking details" class="carrier-tracking">
    <template v-if="tracking">
      <div class="cw-actions"><span class="cw-badge">{{ tracking.status }}</span><span class="cw-muted">{{ tracking.courier.toUpperCase() }} · {{ tracking.awb }}</span></div>
      <dl class="cw-facts"><div><dt>Current location</dt><dd>{{ tracking.current_location || 'Not provided by courier' }}</dd></div><div><dt>Latest scan</dt><dd>{{ trackingDate(tracking.last_event_at) || 'Not available' }}</dd></div><div><dt>Expected delivery</dt><dd>{{ trackingDate(tracking.expected_delivery) || 'Not provided' }}</dd></div><div><dt>Last checked</dt><dd>{{ trackingDate(tracking.checked_at) }}</dd></div><div v-if="tracking.origin"><dt>Origin</dt><dd>{{ tracking.origin }}</dd></div><div v-if="tracking.destination"><dt>Destination</dt><dd>{{ tracking.destination }}</dd></div></dl>
      <p v-if="tracking.remarks">{{ tracking.remarks }}</p>
      <p v-if="tracking.reported_status && tracking.status !== tracking.reported_status" class="cw-muted">The saved cancellation is confirmed. The carrier's latest scan header reports {{ tracking.reported_status }}.</p>
      <ol v-if="events.length" class="carrier-timeline"><li v-for="(event,index) in events" :key="index"><strong>{{ event.status }}</strong><span>{{ trackingDate(event.occurred_at) }}</span><span>{{ [event.location,event.destination].filter(Boolean).join(' → ') }}</span><span v-if="event.remarks">{{ event.remarks }}</span></li></ol>
      <p v-else class="cw-muted">The courier has not provided scan events yet.</p>
    </template>
    <p v-else class="cw-muted">Click a tracking ID to fetch the latest status directly from the courier.</p>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { trackingDate } from '@/utils/customerTracking'
import type { ShipmentTracking } from '@/types'
const props=defineProps<{ tracking: ShipmentTracking | null }>()
const events=computed(()=>[...(props.tracking?.events || [])].sort((a,b)=>(Date.parse(b.occurred_at || '') || 0)-(Date.parse(a.occurred_at || '') || 0)))
</script>
<style scoped>
.carrier-tracking { padding: 1rem; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
.carrier-timeline { padding-left: 1.3rem; margin: 1rem 0 0; display: grid; gap: 1rem; }
.carrier-timeline li { padding-left: .3rem; font-size: .85rem; }
.carrier-timeline span { display: block; margin-top: .25rem; color: #475569; }
</style>
