<template>
  <article class="line-card" :class="`line-card--${tone}`">
    <header class="line-card__header">
      <div>
        <p class="line-card__eyebrow">{{ eyebrow }}</p>
        <h3>{{ title }}</h3>
      </div>
      <div class="line-card__summary">
        <strong>{{ summaryValue }}</strong>
        <span>{{ summaryMode === 'average' ? 'Average' : 'Total' }}</span>
      </div>
    </header>

    <div class="line-card__meta">
      <span>{{ formatValue(peakCount) }} peak</span>
      <span>{{ points.length }} days</span>
      <span>{{ formatValue(averageCount) }} avg/day</span>
    </div>

    <div v-if="points.length" class="line-card__chart">
      <svg viewBox="0 0 520 240" preserveAspectRatio="none" class="line-card__svg" aria-hidden="true">
        <defs>
          <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="strokeColor" stop-opacity="0.34" />
            <stop offset="100%" :stop-color="strokeColor" stop-opacity="0.04" />
          </linearGradient>
        </defs>

        <line
          v-for="tick in yTicks"
          :key="`grid-${tick.value}`"
          x1="54"
          :y1="tick.y"
          x2="496"
          :y2="tick.y"
          class="line-card__grid"
        />

        <text
          v-for="tick in yTicks"
          :key="`label-${tick.value}`"
          x="46"
          :y="tick.y + 4"
          text-anchor="end"
          class="line-card__axis-label"
        >
          {{ formatValue(tick.value) }}
        </text>

        <path :d="areaPath" :fill="`url(#${gradientId})`" />
        <path :d="linePath" :stroke="strokeColor" class="line-card__line" fill="none" />

        <circle
          v-for="point in plottedPoints"
          :key="point.date"
          :cx="point.x"
          :cy="point.y"
          r="4"
          :fill="strokeColor"
          class="line-card__dot"
        />
      </svg>

      <div class="line-card__x-axis">
        <span v-for="tick in xTicks" :key="tick.date">{{ tick.label }}</span>
      </div>
    </div>

    <div v-else class="line-card__empty">No chart data in this date range.</div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsTimePoint } from '@/types'

const props = withDefaults(defineProps<{
  title: string
  eyebrow: string
  tone?: 'teal' | 'rose' | 'sky' | 'amber' | 'violet'
  points: AnalyticsTimePoint[]
  decimalPlaces?: number
  summaryMode?: 'total' | 'average'
  valueSuffix?: string
}>(), {
  tone: 'teal',
  decimalPlaces: 0,
  summaryMode: 'total',
  valueSuffix: '',
})

const strokeColorByTone = {
  teal: '#0f766e',
  rose: '#e11d48',
  sky: '#2563eb',
  amber: '#d97706',
  violet: '#7c3aed',
} as const

const gradientId = `line-gradient-${Math.random().toString(36).slice(2)}`
const chartLeft = 54
const chartRight = 496
const chartTop = 18
const chartBottom = 204
const chartWidth = chartRight - chartLeft
const chartHeight = chartBottom - chartTop

const strokeColor = computed(() => strokeColorByTone[props.tone])
const peakCount = computed(() => props.points.reduce((max, point) => Math.max(max, point.count), 0))
const totalCount = computed(() => props.points.reduce((sum, point) => sum + point.count, 0))
const averageCount = computed(() => {
  if (!props.points.length) return 0
  return totalCount.value / props.points.length
})
const summaryValue = computed(() => formatValue(props.summaryMode === 'average' ? averageCount.value : totalCount.value))

const formatValue = (value: number) => `${value.toFixed(props.decimalPlaces)}${props.valueSuffix}`

const plottedPoints = computed(() => {
  if (!props.points.length) return []

  const maxValue = Math.max(peakCount.value, 1)
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
  return `${linePath.value} L ${last!.x} ${chartBottom} L ${first!.x} ${chartBottom} Z`
})

const yTicks = computed(() => {
  const maxValue = Math.max(peakCount.value, 1)
  return Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3
    const value = Math.round(maxValue * (1 - ratio))
    const y = chartTop + (chartHeight * ratio)
    return { value, y }
  })
})

const xTicks = computed<AnalyticsTimePoint[]>(() => {
  if (props.points.length <= 4) return props.points
  const indexes = [0, Math.floor((props.points.length - 1) / 3), Math.floor(((props.points.length - 1) * 2) / 3), props.points.length - 1]
  return indexes.map((index) => props.points[index]).filter((point): point is AnalyticsTimePoint => Boolean(point))
})
</script>

<style scoped>
.line-card {
  border-radius: 24px;
  padding: 1.2rem;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.68), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 0.9rem;
  min-height: 100%;
  align-content: start;
}

.line-card__header,
.line-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.line-card__eyebrow {
  margin: 0 0 0.3rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  font-weight: 800;
}

h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.15rem;
}

.line-card__summary {
  text-align: right;
}

.line-card__summary strong {
  display: block;
  color: #0f172a;
  font-size: 1.75rem;
  line-height: 1;
}

.line-card__summary span,
.line-card__meta,
.line-card__axis-label,
.line-card__x-axis {
  color: #64748b;
  font-weight: 700;
}

.line-card__meta {
  font-size: 0.88rem;
}

.line-card__chart {
  display: grid;
  gap: 0.55rem;
  margin-top: auto;
}

.line-card__svg {
  width: 100%;
  height: 240px;
}

.line-card__grid {
  stroke: rgba(148, 163, 184, 0.22);
  stroke-dasharray: 4 6;
}

.line-card__axis-label {
  font-size: 11px;
}

.line-card__line {
  stroke-width: 3.5;
  stroke-linejoin: round;
  stroke-linecap: round;
  filter: drop-shadow(0 8px 16px rgba(15, 23, 42, 0.12));
}

.line-card__dot {
  stroke: rgba(255, 255, 255, 0.88);
  stroke-width: 2;
}

.line-card__x-axis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.4rem;
  font-size: 0.8rem;
}

.line-card__x-axis span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.line-card__x-axis span:nth-child(2) {
  text-align: center;
}

.line-card__x-axis span:nth-child(3) {
  text-align: center;
}

.line-card__x-axis span:last-child {
  text-align: right;
}

.line-card__empty {
  min-height: 240px;
  display: grid;
  place-items: center;
  color: #64748b;
  font-weight: 700;
}

.line-card--teal .line-card__eyebrow { color: #0f766e; }
.line-card--rose .line-card__eyebrow { color: #e11d48; }
.line-card--sky .line-card__eyebrow { color: #2563eb; }
.line-card--amber .line-card__eyebrow { color: #d97706; }
</style>
