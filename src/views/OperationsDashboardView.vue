<template>
  <main class="operations-dashboard">
    <header class="op-hero">
      <div>
        <p class="op-eyebrow">Admin · Business activity</p>
        <h1>Operations Dashboard</h1>
        <p>Sales, manufacturing and return follow-through, day by day.</p>
      </div>
      <div class="hero-meta">
        <span class="live-dot" />{{
          dashboard
            ? `Updated ${dateTime(dashboard.generated_at)}`
            : 'India Standard Time'
        }}<router-link to="/dashboard">Amazon overview →</router-link>
      </div>
    </header>
    <section class="op-panel date-panel" aria-label="Dashboard date filters">
      <div class="presets">
        <button
          v-for="preset in presets"
          :key="preset.key"
          type="button"
          :class="{ active: range === preset.key }"
          :disabled="loading"
          @click="selectRange(preset.key)"
        >
          {{ preset.label }}
        </button>
      </div>
      <form class="custom-dates" @submit.prevent="applyCustom">
        <label
          >From date<input
            v-model="fromDate"
            aria-label="From date"
            type="date"
            required /></label
        ><label
          >To date<input
            v-model="toDate"
            aria-label="To date"
            type="date"
            required /></label
        ><button class="primary" :disabled="loading">Apply dates</button
        ><button type="button" :disabled="loading" @click="load">
          {{ loading ? 'Loading…' : 'Refresh' }}</button
        ><span v-if="dashboard" class="range-caption"
          >{{ dashboard.from_date }} — {{ dashboard.to_date }} · IST</span
        >
      </form>
    </section>
    <p v-if="error" class="op-error" role="alert">{{ error }}</p>
    <p v-if="loading" class="loading" role="status">
      Loading business activity…
    </p>
    <template v-if="dashboard">
      <details class="history-note">
        <summary>
          How these dates and totals work{{
            legacyRange ? ' · Historical limits apply' : ''
          }}
        </summary>
        <p>
          Direct orders use their creation date and saved order amounts,
          excluding deleted orders. Amazon counts use the date a status or
          action changed, in IST. Manufacturing and return values are
          merchandise value (price × quantity, including discount lines),
          excluding delivery charges.
        </p>
        <p>
          Event history started {{ dateTime(dashboard.history_started_at) }}.
          Earlier events are recovered only where a dedicated status timestamp
          exists. Historical fresh/claim classifications use the saved migration
          snapshot; exact earlier classification and addressed dates cannot be
          reconstructed. {{ dashboard.undated_legacy_orders }} older
          manufactured/returned order(s) have no recorded status date and are
          excluded from dated activity.
        </p>
        <p>
          Return buckets reflect the last state recorded by the end of each
          return day. Later activity appears on its own date. Period totals
          count each order once per metric; daily totals may include an order
          again if it re-entered a workflow on another day. Product activity is
          grouped into unique orders in the cards; the event log retains each
          product update.
        </p>
      </details>
      <p v-if="legacyRange" class="op-warning">
        This range includes dates before complete event history. Older activity
        may be incomplete; {{ dashboard.summary.backfilled }} order(s) use
        recovered timestamps. Fresh-roll addressed and direct-sale conversion
        history begins when this feature is installed.
      </p>
      <p v-if="dashboard.summary.non_inr_amazon_orders" class="op-warning">
        {{ dashboard.summary.non_inr_amazon_orders }} Amazon order(s) use
        another currency. Their counts are included; their amounts are excluded
        from INR totals. Original currency is shown in the activity log.
      </p>
      <section aria-labelledby="sales-title">
        <div class="section-heading">
          <div>
            <p class="op-eyebrow">Created in this range</p>
            <h2 id="sales-title">Direct orders</h2>
          </div>
          <router-link to="/direct-orders">Open direct orders →</router-link>
        </div>
        <div class="metric-grid four">
          <article class="metric">
            <span>Orders created</span
            ><strong>{{ number(dashboard.summary.direct_orders) }}</strong
            ><small>All saved statuses</small>
          </article>
          <article class="metric">
            <span>Total order value</span
            ><strong>{{ money(dashboard.summary.direct_value) }}</strong
            ><small>Saved order amount</small>
          </article>
          <article class="metric">
            <span>COD value</span
            ><strong>{{ money(dashboard.summary.direct_cod) }}</strong
            ><small>Cash due on delivery</small>
          </article>
          <article class="metric">
            <span>Advance recorded</span
            ><strong>{{ money(dashboard.summary.direct_advance) }}</strong
            ><small>Recorded advance payments</small>
          </article>
        </div>
      </section>
      <section aria-labelledby="amazon-title">
        <div class="section-heading">
          <div>
            <p class="op-eyebrow">Status changes in this range</p>
            <h2 id="amazon-title">Amazon manufacturing & returns</h2>
          </div>
          <router-link to="/returned">Open returned orders →</router-link>
        </div>
        <div class="metric-grid four">
          <article class="metric">
            <span>Marked manufactured</span
            ><strong>{{ number(dashboard.summary.manufactured) }}</strong
            ><small
              >{{ money(dashboard.summary.manufactured_value) }} merchandise
              value</small
            >
          </article>
          <article class="metric rose">
            <span>Marked returned</span
            ><strong>{{ number(dashboard.summary.returned) }}</strong
            ><small
              >{{ number(dashboard.summary.returned_units) }} product units ·
              {{ money(dashboard.summary.returned_value) }}</small
            >
          </article>
          <article class="metric">
            <span>Returned with a claim</span
            ><strong>{{ number(dashboard.summary.claimed_returns) }}</strong
            ><small>Includes fresh returns with a claim</small>
          </article>
          <article class="metric">
            <span>Returned without a claim</span
            ><strong>{{ number(dashboard.summary.unclaimed_returns) }}</strong
            ><small>As recorded by the return day's end</small>
          </article>
        </div>
        <div class="return-breakdown op-panel">
          <div>
            <h3>Returned-order breakdown</h3>
            <p>
              These three groups add up to
              {{ dashboard.summary.returned }} returned orders.
            </p>
          </div>
          <div class="breakdown-items">
            <div>
              <i style="background: #0f766e" /><strong>{{
                dashboard.summary.fresh_returned
              }}</strong
              ><span>Fresh rolls</span>
            </div>
            <div>
              <i style="background: #6366f1" /><strong>{{
                dashboard.summary.claimed_nonfresh
              }}</strong
              ><span>Non-fresh, safety claimed</span>
            </div>
            <div>
              <i style="background: #f59e0b" /><strong>{{
                dashboard.summary.other_returned
              }}</strong
              ><span>Non-fresh, not claimed</span>
            </div>
          </div>
        </div>
      </section>
      <section aria-labelledby="outcomes-title">
        <div class="section-heading">
          <div>
            <p class="op-eyebrow">Actions completed in this range</p>
            <h2 id="outcomes-title">Return follow-through</h2>
          </div>
          <router-link to="/returns-initiated"
            >Manage return outcomes →</router-link
          >
        </div>
        <div class="metric-grid outcomes">
          <article v-for="card in outcomeCards" :key="card.key" class="metric">
            <span>{{ card.label }}</span><strong>{{
              number(dashboard.summary[card.key])
            }}</strong
            ><small>{{ card.hint }}</small>
          </article>
        </div>
        <aside class="backlog">
          <strong
            >{{ number(dashboard.pending_fresh) }} fresh returned orders
            awaiting attention</strong
          ><span
            >Unaddressed as of {{ dashboard.to_date }} end of day{{
              legacyRange ? ' · Older backlog may be incomplete' : ''
            }}.</span
          ><router-link to="/fresh-roll-issues"
            >Open fresh-roll queue →</router-link
          >
        </aside>
      </section>
      <section class="chart-grid" aria-label="Daily charts">
        <OperationsTrendChart
          title="Orders created & manufactured"
          :days="dashboard.daily"
          :series="orderSeries"
        /><OperationsTrendChart
          title="Daily order values"
          :days="dashboard.daily"
          :series="valueSeries"
          money
        /><OperationsTrendChart
          title="Return arrivals & claims filed"
          :days="dashboard.daily"
          :series="returnSeries"
        /><OperationsTrendChart
          title="Return outcomes recorded"
          :days="dashboard.daily"
          :series="outcomeSeries"
        />
      </section>
      <section class="op-panel daily-panel">
        <div class="section-heading">
          <div>
            <p class="op-eyebrow">Every day in the selected range</p>
            <h2>Daily activity ledger</h2>
            <p>Click a date to see that day's Amazon updates below.</p>
          </div>
          <button type="button" @click="exportDaily">Download daily CSV</button>
        </div>
        <div
          class="table-scroll"
          tabindex="0"
          aria-label="Daily activity table"
        >
          <table>
            <thead>
              <tr>
                <th>Date · IST</th>
                <th>Direct orders</th>
                <th>Direct value</th>
                <th>COD value</th>
                <th>Manufactured</th>
                <th>Manufactured value</th>
                <th>Returned</th>
                <th>Return value</th>
                <th>Fresh returned</th>
                <th>Non-fresh claimed</th>
                <th>Other returned</th>
                <th>Claims filed</th>
                <th>Retained / compromised</th>
                <th>Direct conversions</th>
                <th>Fresh addressed</th>
                <th>Follow-ups</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="day in [...dashboard.daily].reverse()"
                :key="day.date"
                :class="{ selected: activityDate === day.date }"
              >
                <th>
                  <button
                    :disabled="loading"
                    @click="selectActivityDay(day.date)"
                  >
                    {{ day.date }}
                  </button>
                </th>
                <td>{{ day.direct_orders }}</td>
                <td>{{ money(day.direct_value) }}</td>
                <td>{{ money(day.direct_cod) }}</td>
                <td>{{ day.manufactured }}</td>
                <td>{{ money(day.manufactured_value) }}</td>
                <td>{{ day.returned }}</td>
                <td>{{ money(day.returned_value) }}</td>
                <td>{{ day.fresh_returned }}</td>
                <td>{{ day.claimed_nonfresh }}</td>
                <td>{{ day.other_returned }}</td>
                <td>{{ day.claims }}</td>
                <td>{{ day.compromised }}</td>
                <td>{{ day.converted }}</td>
                <td>{{ day.addressed }}</td>
                <td>{{ day.followups }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
      <section ref="activityPanel" class="op-panel activity-panel">
        <div class="section-heading">
          <div>
            <p class="op-eyebrow">
              Source updates · {{ dashboard.activity_total }} events
            </p>
            <h2>Amazon activity log</h2>
          </div>
          <div class="activity-filters">
            <label
              >Activity date<input
                v-model="activityDate"
                type="date"
                :min="dashboard.from_date"
                :max="dashboard.to_date"
                aria-label="Activity date"
                :disabled="loading"
                @change="filterActivity" /></label
            ><label
              >Activity type<select
                v-model="activityKind"
                aria-label="Activity type"
                :disabled="loading"
                @change="filterActivity"
              >
                <option value="">All updates</option>
                <option
                  v-for="(label, key) in activityLabels"
                  :key="key"
                  :value="key"
                >
                  {{ label }}
                </option>
              </select></label
            ><button :disabled="loading" @click="clearActivity">Clear</button>
          </div>
        </div>
        <p class="subtle">
          Action timestamps show when each update happened. Multiple product
          updates can belong to the same order.
        </p>
        <div class="table-scroll" tabindex="0" aria-label="Amazon activity log">
          <table>
            <thead>
              <tr>
                <th>Updated · IST</th>
                <th>Order / product</th>
                <th>Customer</th>
                <th>Action</th>
                <th>Value</th>
                <th>Recorded state</th>
                <th>Updated by</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="event in dashboard.activity" :key="event.id">
                <td>
                  {{ dateTime(event.occurred_at)
                  }}<small v-if="event.backfill" class="recovered"
                    >Recovered date</small
                  >
                </td>
                <td>
                  <router-link
                    :to="`/orders/${encodeURIComponent(event.order_id)}`"
                    >{{ event.order_id }}</router-link><small
                    v-if="event.product_id"
                    >Product {{ event.product_id }}</small
                  >
                </td>
                <td>{{ event.customer || '—' }}</td>
                <td>
                  <span class="action-badge">{{
                    activityLabels[event.kind] || event.kind
                  }}</span>
                </td>
                <td>{{ money(event.value, event.currency) }}</td>
                <td>
                  {{
                    [
                      event.fresh ? 'Fresh' : 'Non-fresh',
                      event.claimed ? 'Claimed' : 'Not claimed',
                      event.addressed ? 'Addressed' : 'Unaddressed',
                    ].join(' · ')
                  }}
                </td>
                <td>{{ event.actor || 'Unknown' }}</td>
                <td class="event-details">{{ event.details || '—' }}</td>
              </tr>
              <tr v-if="!dashboard.activity.length">
                <td colspan="8" class="empty">
                  No recorded Amazon updates match these dates and filters.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <span
            >Page {{ dashboard.activity_page }} of
            {{
              Math.max(
                1,
                Math.ceil(dashboard.activity_total / dashboard.activity_limit),
              )
            }}</span
          ><button :disabled="loading || page <= 1" @click="changePage(-1)">
            Previous</button
          ><button
            :disabled="
              loading ||
              page * dashboard.activity_limit >= dashboard.activity_total
            "
            @click="changePage(1)"
          >
            Next
          </button>
        </div>
      </section>
    </template>
  </main>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getOperationsDashboard } from '@/api/operations'
import OperationsTrendChart from '@/components/OperationsTrendChart.vue'
import { courierError } from '@/utils/courier'
import { exportRowsAsCsv } from '@/utils/exportData'
import type { OperationsDashboard, OperationsMetrics } from '@/types/operations'
const dashboard = ref<OperationsDashboard | null>(null),
  loading = ref(false),
  error = ref('')
const range = ref('today'),
  fromDate = ref(''),
  toDate = ref(''),
  activityDate = ref(''),
  activityKind = ref(''),
  page = ref(1),
  activityPanel = ref<HTMLElement | null>(null)
const presets = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last_7_days', label: 'Last 7 days' },
  { key: 'this_month', label: 'This month' },
  { key: 'last_month', label: 'Last month' },
  { key: 'last_30_days', label: 'Last 30 days' },
]
const activityLabels: Record<string, string> = {
  manufactured: 'Marked manufactured',
  returned: 'Marked returned',
  safety_claimed: 'Safety claim filed',
  return_initiated: 'Return initiated',
  return_compromised: 'Retained / compromised',
  converted_direct: 'Converted to direct sale',
  fresh_roll_addressed: 'Fresh roll addressed',
  fresh_roll_marked: 'Fresh roll marked',
  return_followup: 'Return follow-up',
  fresh_roll_followup: 'Fresh roll follow-up',
}
const outcomeCards: {
  key: keyof OperationsMetrics
  label: string
  hint: string
}[] = [
  {
    key: 'claims',
    label: 'Safety claims filed',
    hint: 'Claim switched on during this range',
  },
  {
    key: 'compromised',
    label: 'Retained / compromised',
    hint: 'Customer retained the order',
  },
  {
    key: 'converted',
    label: 'Converted to direct sale',
    hint: 'Explicitly marked in Returns Initiated',
  },
  {
    key: 'addressed',
    label: 'Fresh rolls addressed',
    hint: 'Addressed flag switched on',
  },
  {
    key: 'initiated',
    label: 'Returns initiated',
    hint: 'Initiated flag switched on',
  },
  {
    key: 'followups',
    label: 'Orders followed up',
    hint: 'Return or fresh-roll action updated',
  },
]
type Series = { key: keyof OperationsMetrics; label: string; color: string }
const orderSeries: Series[] = [
  { key: 'direct_orders', label: 'Direct orders', color: '#0f766e' },
  { key: 'manufactured', label: 'Amazon manufactured', color: '#6366f1' },
]
const valueSeries: Series[] = [
  { key: 'direct_value', label: 'Direct total', color: '#0f766e' },
  { key: 'direct_cod', label: 'Direct COD', color: '#f59e0b' },
  { key: 'manufactured_value', label: 'Amazon manufactured', color: '#6366f1' },
]
const returnSeries: Series[] = [
  { key: 'returned', label: 'Marked returned', color: '#e11d48' },
  { key: 'fresh_returned', label: 'Fresh returns', color: '#0f766e' },
  { key: 'claims', label: 'Claims filed', color: '#6366f1' },
]
const outcomeSeries: Series[] = [
  { key: 'compromised', label: 'Retained', color: '#f59e0b' },
  { key: 'converted', label: 'Direct sale', color: '#6366f1' },
  { key: 'addressed', label: 'Fresh addressed', color: '#0f766e' },
]
const legacyRange = computed(() =>
  dashboard.value
    ? dashboard.value.from_date <=
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
        new Date(dashboard.value.history_started_at),
      )
    : false,
)
function number(value: number) {
  return Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value)
}
function money(value: number, currency = 'INR') {
  try {
    return Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currency} ${number(value)}`
  }
}
function dateTime(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
let version = 0
async function load() {
  const request = ++version
  loading.value = true
  error.value = ''
  try {
    const result = await getOperationsDashboard({
      date_range: range.value,
      from_date: range.value === 'custom_range' ? fromDate.value : undefined,
      to_date: range.value === 'custom_range' ? toDate.value : undefined,
      activity_date: activityDate.value || undefined,
      activity_kind: activityKind.value || undefined,
      page: page.value,
    })
    if (request !== version) return
    dashboard.value = result
    fromDate.value = result.from_date
    toDate.value = result.to_date
  } catch (err) {
    if (request === version) {
      error.value = await courierError(err)
      dashboard.value = null
    }
  } finally {
    if (request === version) loading.value = false
  }
}
function resetActivity() {
  activityDate.value = ''
  activityKind.value = ''
  page.value = 1
}
async function selectRange(value: string) {
  range.value = value
  resetActivity()
  await load()
}
async function applyCustom() {
  if (!fromDate.value || !toDate.value || fromDate.value > toDate.value) {
    error.value = 'Choose valid From and To dates.'
    return
  }
  if (
    (Date.parse(toDate.value) - Date.parse(fromDate.value)) / 86400000 >=
    366
  ) {
    error.value = 'Choose a date range of 366 days or fewer.'
    return
  }
  range.value = 'custom_range'
  resetActivity()
  await load()
}
async function filterActivity() {
  page.value = 1
  await load()
}
async function clearActivity() {
  resetActivity()
  await load()
}
async function changePage(change: number) {
  page.value += change
  await load()
}
async function selectActivityDay(date: string) {
  activityDate.value = date
  await filterActivity()
  activityPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
function exportDaily() {
  if (!dashboard.value) return
  exportRowsAsCsv(
    `operations-${dashboard.value.from_date}-${dashboard.value.to_date}.csv`,
    dashboard.value.daily.map((day) => ({ ...day })),
  )
}
onMounted(load)
</script>
<style scoped>
.operations-dashboard {
  padding: 1.5rem;
  display: grid;
  gap: 1.5rem;
  color: #0f172a;
  max-width: 1680px;
  margin: auto;
}
.op-hero {
  background: linear-gradient(110deg, #e8f6f2, #f8fafc);
  border: 1px solid #dce8e3;
  border-radius: 22px;
  padding: 1.8rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.op-eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-size: 0.7rem;
  font-weight: 800;
  color: #0f766e;
  margin: 0 0 0.5rem;
}
h1 {
  font-size: clamp(1.75rem, 3vw, 2.4rem);
  letter-spacing: -0.04em;
  margin: 0;
}
h2 {
  font-size: 1.2rem;
  letter-spacing: -0.02em;
  margin: 0.2rem 0;
}
h3 {
  margin: 0;
  font-size: 1rem;
}
.op-hero p:not(.op-eyebrow) {
  color: #64748b;
  margin: 0.6rem 0 0;
}
.hero-meta {
  font-size: 0.75rem;
  color: #64748b;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  max-width: 240px;
}
.hero-meta a {
  display: block;
  width: 100%;
  margin-top: 0.7rem;
}
.live-dot {
  width: 7px;
  height: 7px;
  background: #0f766e;
  border-radius: 50%;
}
a {
  color: #0f766e;
  text-decoration: none;
  font-weight: 700;
}
.op-panel {
  background: #fff;
  border: 1px solid #dfe7ed;
  border-radius: 18px;
  padding: 1.25rem;
  min-width: 0;
}
.presets {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
button,
input,
select {
  font: inherit;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  background: #fff;
  color: #334155;
  padding: 0.6rem 0.85rem;
  min-width: 0;
}
button {
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 700;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
button.active,
button.primary {
  background: #0f766e;
  color: #fff;
  border-color: #0f766e;
}
.custom-dates {
  display: flex;
  gap: 0.8rem;
  align-items: end;
  flex-wrap: wrap;
}
label {
  display: grid;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
}
.range-caption {
  font-size: 0.75rem;
  color: #64748b;
  align-self: center;
  margin-left: auto;
}
.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}
.section-heading a {
  font-size: 0.8rem;
}
.section-heading p:not(.op-eyebrow) {
  font-size: 0.75rem;
  color: #64748b;
  margin: 0.4rem 0 0;
}
.metric-grid {
  display: grid;
  gap: 1rem;
}
.metric-grid.four {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.metric-grid.outcomes {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.metric {
  background: white;
  border: 1px solid #dfe7ed;
  border-radius: 16px;
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  min-width: 0;
}
.metric > span {
  font-size: 0.8rem;
  color: #475569;
  font-weight: 650;
}
.metric strong {
  font-size: clamp(1.35rem, 2.5vw, 2rem);
  letter-spacing: -0.04em;
  overflow-wrap: anywhere;
}
.metric small {
  color: #64748b;
  line-height: 1.5;
  font-size: 0.72rem;
}
.metric.rose {
  border-top: 3px solid #e11d48;
}
.return-breakdown {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  margin-top: 1rem;
}
.return-breakdown p {
  font-size: 0.75rem;
  color: #64748b;
  margin: 0.5rem 0;
}
.breakdown-items {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}
.breakdown-items > div {
  display: grid;
  grid-template-columns: 10px auto;
  gap: 0.3rem 0.5rem;
  align-items: center;
}
.breakdown-items i {
  height: 8px;
  width: 8px;
  border-radius: 50%;
}
.breakdown-items strong {
  font-size: 1.5rem;
}
.breakdown-items span {
  grid-column: 2;
  font-size: 0.7rem;
  color: #64748b;
}
.backlog {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  background: #fffbeb;
  border: 1px solid #fef3c7;
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1rem;
  font-size: 0.8rem;
}
.backlog span {
  color: #78716c;
}
.backlog a {
  margin-left: auto;
}
.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}
.table-scroll {
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  max-height: 540px;
}
table {
  border-collapse: separate;
  border-spacing: 0;
  width: 100%;
  font-size: 0.75rem;
  text-align: left;
}
th,
td {
  padding: 0.8rem;
  border-bottom: 1px solid #edf2f7;
  white-space: nowrap;
}
thead th {
  background: #f8fafc;
  color: #64748b;
  font-size: 0.68rem;
  position: sticky;
  top: 0;
  z-index: 1;
}
tbody th {
  position: sticky;
  left: 0;
  background: white;
  z-index: 1;
}
tbody th button {
  border: 0;
  padding: 0;
  background: none;
  color: #0f766e;
}
tr.selected,
tr.selected th {
  background: #f0fdfa;
}
tbody tr:hover td {
  background: #f8fafc;
}
td small {
  display: block;
  color: #64748b;
  margin-top: 0.3rem;
}
.event-details {
  min-width: 160px;
  max-width: 300px;
  white-space: normal;
  overflow-wrap: anywhere;
}
.activity-filters {
  display: flex;
  gap: 0.7rem;
  align-items: end;
  flex-wrap: wrap;
}
.subtle {
  font-size: 0.75rem;
  color: #64748b;
}
.action-badge {
  background: #f0fdfa;
  color: #0f766e;
  border-radius: 5px;
  padding: 0.35rem 0.5rem;
  display: inline-block;
}
.recovered {
  color: #a16207 !important;
}
.empty {
  padding: 2rem;
  text-align: center;
  color: #64748b;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1rem;
  font-size: 0.75rem;
  color: #64748b;
}
.history-note {
  font-size: 0.78rem;
  color: #64748b;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 0.85rem 1rem;
  line-height: 1.6;
}
.history-note summary {
  cursor: pointer;
  color: #475569;
  font-weight: 700;
}
.op-warning,
.op-error {
  background: #fffbeb;
  color: #92400e;
  border-radius: 10px;
  padding: 1rem;
  font-size: 0.8rem;
  line-height: 1.6;
  margin: 0;
}
.op-error {
  background: #fef2f2;
  color: #b91c1c;
}
.loading {
  color: #64748b;
  font-size: 0.85rem;
  margin: 0;
}
@media (max-width: 1100px) {
  .metric-grid.four {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .return-breakdown {
    align-items: start;
    flex-direction: column;
  }
  .breakdown-items {
    gap: 1.2rem;
  }
  .op-hero {
    align-items: start;
  }
  .range-caption {
    margin-left: 0;
  }
}
@media (max-width: 700px) {
  .operations-dashboard {
    padding: 0.9rem;
    gap: 1.1rem;
  }
  .op-hero {
    padding: 1.2rem;
    flex-direction: column;
  }
  .metric-grid.outcomes,
  .chart-grid {
    grid-template-columns: 1fr;
  }
  .metric-grid.four {
    gap: 0.6rem;
  }
  .metric {
    padding: 0.9rem;
  }
  .metric strong {
    font-size: 1.5rem;
  }
  .custom-dates label {
    flex: 1;
    min-width: 120px;
  }
  .custom-dates input {
    width: 100%;
  }
  .op-panel {
    padding: 1rem;
  }
  .history-note {
    font-size: 0.73rem;
  }
  .activity-filters {
    width: 100%;
  }
  .activity-filters label {
    flex: 1;
    min-width: 120px;
  }
  .backlog a {
    margin-left: 0;
  }
  .range-caption {
    width: 100%;
  }
}
</style>
