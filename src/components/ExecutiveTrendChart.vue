<template>
  <article class="trend-card">
    <header class="trend-card__header">
      <div>
        <p class="trend-card__eyebrow">{{ eyebrow }}</p>
        <h3>{{ title }}</h3>
      </div>
      <strong class="trend-card__summary">{{ totalLabel }}</strong>
    </header>

    <div v-if="plottedPoints.length" class="trend-card__chart">
      <svg viewBox="0 0 520 250" preserveAspectRatio="none" class="trend-card__svg" aria-hidden="true">
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="color" stop-opacity="0.28" />
            <stop offset="100%" :stop-color="color" stop-opacity="0.04" />
          </linearGradient>
        </defs>

        <line
          v-for="tick in yTicks"
          :key="`grid-${tick.value}`"
          x1="48"
          :y1="tick.y"
          x2="500"
          :y2="tick.y"
          class="trend-card__grid"
        />

        <text
          v-for="tick in yTicks"
          :key="`label-${tick.value}`"
          x="40"
          :y="tick.y + 4"
          text-anchor="end"
          class="trend-card__axis"
        >
          {{ formatValue(tick.value) }}
        </text>

        <path :d="areaPath" :fill="`url(#${gradientId})`" />
        <path :d="linePath" :stroke="color" class="trend-card__line" fill="none" />

        <circle
          v-for="point in plottedPoints"
          :key="point.date"
          :cx="point.x"
          :cy="point.y"
          r="4"
          :fill="color"
        />
      </svg>

      <div class="trend-card__x-axis">
        <span v-for="tick in xTicks" :key="tick.date">{{ tick.label }}</span>
      </div>
    </div>

    <div v-else class="trend-card__empty">No Data Available</div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsTimePoint } from '@/types'

const props = defineProps<{
  title: string
  eyebrow: string
  points: AnalyticsTimePoint[]
  color?: string
  valueSuffix?: string
  summaryMode?: 'total' | 'average'
}>()

const gradientId = `executive-line-${Math.random().toString(36).slice(2)}`
const color = computed(() => props.color ?? '#0f766e')
const total = computed(() => props.points.reduce((sum, point) => sum + point.count, 0))
const peak = computed(() => props.points.reduce((max, point) => Math.max(max, point.count), 0))
const average = computed(() => (props.points.length ? total.value / props.points.length : 0))
const totalLabel = computed(() => {
  if (props.summaryMode === 'average') return `${formatValue(average.value)} avg`
  return `${formatValue(total.value)} total`
})

const formatValue = (value: number) => {
  const base = value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)
  return `${base}${props.valueSuffix ?? ''}`
}

const plottedPoints = computed(() => {
  if (!props.points.length) return []

  const maxValue = Math.max(peak.value, 1)
  const chartLeft = 48
  const chartRight = 500
  const chartTop = 18
  const chartBottom = 210
  const chartWidth = chartRight - chartLeft
  const chartHeight = chartBottom - chartTop
  const stepX = props.points.length === 1 ? 0 : chartWidth / (props.points.length - 1)

  return props.points.map((point, index) => {
    const ratio = point.count / maxValue
    return {
      ...point,
      x: chartLeft + (stepX * index),
      y: chartBottom - (ratio * chartHeight),
    }
  })
})

const linePath = computed(() => {
  if (!plottedPoints.value.length) return ''
  return plottedPoints.value.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
})

const areaPath = computed(() => {
  if (!plottedPoints.value.length) return ''
  const first = plottedPoints.value[0]
  const last = plottedPoints.value[plottedPoints.value.length - 1]
  if (!first || !last) return ''
  return `${linePath.value} L ${last.x} 210 L ${first.x} 210 Z`
})

const yTicks = computed(() => {
  const maxValue = Math.max(peak.value, 1)
  const ticks = []
  for (let index = 0; index < 4; index += 1) {
    const ratio = index / 3
    ticks.push({
      value: Math.round(maxValue * (1 - ratio)),
      y: 18 + (192 * ratio),
    })
  }
  return ticks
})

const xTicks = computed(() => {
  if (props.points.length <= 4) return props.points
  const indexes = [
    0,
    Math.floor((props.points.length - 1) / 3),
    Math.floor(((props.points.length - 1) * 2) / 3),
    props.points.length - 1,
  ]
  return indexes
    .map((index) => props.points[index])
    .filter((point): point is AnalyticsTimePoint => Boolean(point))
})
</script>

<style scoped>
.trend-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 26px;
  padding: 1.25rem;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 0.9rem;
}

.trend-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.trend-card__eyebrow {
  margin: 0 0 0.3rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  font-weight: 800;
  color: #0f766e;
}

h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.15rem;
}

.trend-card__summary {
  color: #475569;
  font-size: 0.95rem;
}

.trend-card__chart {
  display: grid;
  gap: 0.55rem;
}

.trend-card__svg {
  width: 100%;
  height: 250px;
}

.trend-card__grid {
  stroke: rgba(148, 163, 184, 0.24);
  stroke-dasharray: 4 6;
}

.trend-card__axis,
.trend-card__x-axis {
  color: #64748b;
  font-size: 0.8rem;
  font-weight: 700;
}

.trend-card__line {
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-card__x-axis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  gap: 0.65rem;
}

.trend-card__x-axis span:last-child {
  text-align: right;
}

.trend-card__empty {
  min-height: 250px;
  display: grid;
  place-items: center;
  color: #64748b;
  font-weight: 700;
  border: 1px dashed rgba(148, 163, 184, 0.5);
  border-radius: 20px;
}
</style>
