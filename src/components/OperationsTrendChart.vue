<template>
  <article class="op-chart">
    <header>
      <div>
        <p class="op-eyebrow">Daily activity · IST</p>
        <h3>{{ title }}</h3>
      </div>
      <span v-if="hovered" class="chart-tooltip"
        >{{ hovered.date
        }}<template v-for="series in visibleSeries" :key="series.key"
          ><br />{{ series.label }}: {{ format(hovered[series.key]) }}</template
        ></span
      >
    </header>
    <div class="chart-legend">
      <button
        v-for="item in series"
        :key="item.key"
        type="button"
        :aria-pressed="!hidden.includes(item.key)"
        @click="toggle(item.key)"
      >
        <i :style="{ background: item.color }" />{{ item.label }}
      </button>
    </div>
    <svg
      v-if="days.length"
      viewBox="0 0 620 240"
      role="img"
      :aria-label="`${title}. Daily values are also available in the table below.`"
    >
      <g v-for="index in 5" :key="index">
        <line
          x1="56"
          x2="604"
          :y1="20 + (index - 1) * 45"
          :y2="20 + (index - 1) * 45"
          stroke="#e2e8f0"
        />
        <text x="49" :y="24 + (index - 1) * 45" text-anchor="end">
          {{ axis((maximum * (5 - index)) / 4) }}
        </text>
      </g>
      <g v-for="series in visibleSeries" :key="series.key">
        <polyline
          :points="line(series.key)"
          fill="none"
          :stroke="series.color"
          stroke-width="2.5"
          vector-effect="non-scaling-stroke"
        />
        <circle
          v-for="(day, index) in days"
          :key="day.date"
          :cx="x(index)"
          :cy="y(day[series.key])"
          :r="days.length > 90 ? 2 : 4"
          :fill="series.color"
          tabindex="0"
          :aria-label="`${day.date}, ${series.label}: ${format(day[series.key])}`"
          @focus="hovered = day"
          @mouseenter="hovered = day"
        >
          <title>
            {{ day.date }} · {{ series.label }}: {{ format(day[series.key]) }}
          </title>
        </circle>
      </g>
      <text
        v-for="index in ticks"
        :key="index"
        :x="x(index)"
        y="226"
        text-anchor="middle"
      >
        {{ shortDate(days[index]?.date || '') }}
      </text>
    </svg>
    <p v-else>No daily data for this range.</p>
  </article>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { OperationsDay, OperationsMetrics } from '@/types/operations'
type Key = keyof OperationsMetrics
const props = defineProps<{
  title: string
  days: OperationsDay[]
  series: { key: Key; label: string; color: string }[]
  money?: boolean
}>()
const hidden = ref<Key[]>([]),
  hovered = ref<OperationsDay | null>(null)
watch(
  () => props.days,
  () => {
    hovered.value = null
  },
)
const visibleSeries = computed(() =>
  props.series.filter((item) => !hidden.value.includes(item.key)),
)
const maximum = computed(() =>
  Math.max(
    1,
    ...props.days.flatMap((day) =>
      visibleSeries.value.map((series) => day[series.key]),
    ),
  ),
)
const ticks = computed(() => [
  ...new Set([
    0,
    Math.floor((props.days.length - 1) / 2),
    props.days.length - 1,
  ]),
])
function toggle(key: Key) {
  if (hidden.value.includes(key))
    hidden.value = hidden.value.filter((item) => item !== key)
  else if (visibleSeries.value.length > 1) hidden.value.push(key)
  hovered.value = null
}
function x(index: number) {
  return props.days.length === 1
    ? 330
    : 56 + (index * 548) / (props.days.length - 1)
}
function y(value: number) {
  return 200 - (value / maximum.value) * 180
}
function line(key: Key) {
  return props.days.map((day, index) => `${x(index)},${y(day[key])}`).join(' ')
}
function format(value: number) {
  return props.money
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2,
      }).format(value)
    : value.toLocaleString('en-IN')
}
function axis(value: number) {
  return `${props.money ? '₹' : ''}${Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`
}
function shortDate(date: string) {
  return date.slice(5).split('-').reverse().join('/')
}
</script>
<style scoped>
.op-chart {
  background: white;
  border: 1px solid #dfe7ed;
  border-radius: 18px;
  padding: 1.25rem;
  min-width: 0;
}
.op-chart header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  min-height: 80px;
}
.op-chart h3 {
  margin: 0.3rem 0;
  font-size: 1.05rem;
}
.op-eyebrow {
  color: #64748b;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin: 0;
}
.chart-tooltip {
  font-size: 0.7rem;
  text-align: right;
  color: #475569;
}
.chart-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin: 0.5rem 0 1rem;
}
.chart-legend button {
  border: 0;
  background: none;
  font: inherit;
  font-size: 0.75rem;
  padding: 0.25rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.chart-legend button[aria-pressed='false'] {
  opacity: 0.4;
}
.chart-legend i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}
.op-chart svg {
  display: block;
  width: 100%;
  overflow: visible;
}
.op-chart svg text {
  font-size: 10px;
  fill: #64748b;
}
.op-chart circle:focus {
  outline: none;
  stroke: #0f172a;
  stroke-width: 3;
}
@media (max-width: 700px) {
  .op-chart svg text {
    font-size: 17px;
  }
}
</style>
