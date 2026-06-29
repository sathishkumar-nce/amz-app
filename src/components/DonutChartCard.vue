<template>
  <article class="chart-card">
    <div class="chart-card__header">
      <div>
        <p class="chart-card__eyebrow">{{ eyebrow }}</p>
        <h3>{{ title }}</h3>
      </div>
      <span class="chart-card__total">{{ total }} total</span>
    </div>

    <div class="chart-card__body">
      <div class="chart-card__visual">
        <div class="donut" :style="{ background: gradientStyle }">
          <div class="donut__center">
            <strong>{{ total }}</strong>
            <span>{{ centerLabel }}</span>
          </div>
        </div>
      </div>

      <div class="chart-card__legend">
        <p v-if="normalizedSlices.length === 0" class="chart-card__empty">No chart data available yet.</p>
        <div v-for="(slice, index) in normalizedSlices" :key="`${title}-${slice.label}`" class="legend-row">
          <span class="legend-row__swatch" :style="{ background: palette[index % palette.length] }" />
          <div class="legend-row__label">
            <strong>{{ slice.label }}</strong>
            <span>{{ slice.count }} · {{ formatPercentage(slice.count) }}</span>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsChartSlice } from '@/types'

const props = withDefaults(defineProps<{
  title: string
  eyebrow?: string
  centerLabel?: string
  slices?: AnalyticsChartSlice[]
}>(), {
  eyebrow: 'Analytics',
  centerLabel: 'records',
  slices: () => []
})

const palette = ['#0f766e', '#14b8a6', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#84cc16', '#f97316']

const normalizedSlices = computed(() => (props.slices || []).filter((slice) => slice.count > 0))
const total = computed(() => normalizedSlices.value.reduce((sum, slice) => sum + slice.count, 0))

const gradientStyle = computed(() => {
  if (!normalizedSlices.value.length || total.value === 0) {
    return 'conic-gradient(#e2e8f0 0deg 360deg)'
  }

  let current = 0
  const parts = normalizedSlices.value.map((slice, index) => {
    const start = current
    const angle = (slice.count / total.value) * 360
    current += angle
    const end = current
    return `${palette[index % palette.length]} ${start}deg ${end}deg`
  })

  return `conic-gradient(${parts.join(', ')})`
})

const formatPercentage = (count: number) => {
  if (!total.value) return '0.0%'
  return `${((count / total.value) * 100).toFixed(1)}%`
}
</script>

<style scoped>
.chart-card {
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 24px;
  padding: 1.35rem;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 1.1rem;
  min-height: 100%;
  align-content: start;
}

.chart-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.chart-card__eyebrow {
  margin: 0 0 0.4rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  font-weight: 800;
  color: #0f766e;
}

h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #0f172a;
}

.chart-card__total {
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  background: rgba(15, 118, 110, 0.08);
  color: #0f766e;
  font-weight: 800;
  white-space: nowrap;
}

.chart-card__body {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.chart-card__visual {
  display: grid;
  place-items: center;
}

.donut {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
}

.donut__center {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.96);
  display: grid;
  place-items: center;
  text-align: center;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
}

.donut__center strong {
  color: #0f172a;
  font-size: 1.2rem;
}

.donut__center span {
  color: #64748b;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.chart-card__legend {
  display: grid;
  gap: 0.7rem;
  align-content: start;
}

.chart-card__empty {
  margin: 0;
  color: #64748b;
  font-weight: 700;
}

.legend-row {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
}

.legend-row__swatch {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}

.legend-row__label {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: #475569;
  align-items: baseline;
}

.legend-row__label strong {
  color: #0f172a;
  min-width: 0;
}

.legend-row__label span {
  white-space: nowrap;
  text-align: right;
}

@media (max-width: 720px) {
  .chart-card__body {
    grid-template-columns: 1fr;
  }
}
</style>
