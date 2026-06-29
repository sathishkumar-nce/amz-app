<template>
  <article class="pie-card">
    <header class="pie-card__header">
      <div>
        <p class="pie-card__eyebrow">{{ eyebrow }}</p>
        <h3>{{ title }}</h3>
      </div>
      <span class="pie-card__total">{{ total }} total</span>
    </header>

    <div v-if="displaySlices.length" class="pie-card__body">
      <div class="pie-card__visual">
        <div class="pie-donut" :style="{ background: gradientStyle }">
          <div class="pie-donut__center">
            <strong>{{ total }}</strong>
            <span>records</span>
          </div>
        </div>
      </div>

      <div class="pie-card__legend">
        <div v-for="(slice, index) in displaySlices" :key="slice.label" class="legend-row">
          <span class="legend-row__swatch" :style="{ background: palette[index % palette.length] }" />
          <div class="legend-row__copy">
            <strong :title="slice.label">{{ slice.label }}</strong>
            <span>{{ slice.count }} · {{ percentage(slice.count) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="pie-card__empty">No Data Available</div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsChartSlice } from '@/types'

const props = defineProps<{
  title: string
  eyebrow: string
  slices: AnalyticsChartSlice[]
}>()

const palette = ['#0f766e', '#f59e0b', '#e11d48', '#2563eb', '#7c3aed', '#14b8a6', '#ea580c']
const normalizedSlices = computed(() => props.slices.filter((slice) => slice.count > 0))
const total = computed(() => normalizedSlices.value.reduce((sum, slice) => sum + slice.count, 0))
const displaySlices = computed(() => {
  const maxVisible = 6
  if (normalizedSlices.value.length <= maxVisible) return normalizedSlices.value

  const visible = normalizedSlices.value.slice(0, maxVisible - 1)
  const othersCount = normalizedSlices.value
    .slice(maxVisible - 1)
    .reduce((sum, slice) => sum + slice.count, 0)

  return [
    ...visible,
    { label: 'Others', count: othersCount },
  ]
})

const gradientStyle = computed(() => {
  if (!displaySlices.value.length || total.value === 0) {
    return 'conic-gradient(#e2e8f0 0deg 360deg)'
  }

  let current = 0
  const segments = displaySlices.value.map((slice, index) => {
    const start = current
    current += (slice.count / total.value) * 360
    return `${palette[index % palette.length]} ${start}deg ${current}deg`
  })

  return `conic-gradient(${segments.join(', ')})`
})

const percentage = (count: number) => {
  if (!total.value) return '0.0%'
  return `${((count / total.value) * 100).toFixed(1)}%`
}
</script>

<style scoped>
.pie-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 26px;
  padding: 1.25rem;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 1rem;
}

.pie-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.pie-card__eyebrow {
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

.pie-card__total {
  color: #475569;
  font-weight: 800;
}

.pie-card__body {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  gap: 1.15rem;
  align-items: center;
  min-height: 220px;
}

.pie-card__visual {
  display: grid;
  place-items: center;
}

.pie-donut {
  width: 150px;
  height: 150px;
  border-radius: 50%;
  display: grid;
  place-items: center;
}

.pie-donut__center {
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.98);
  display: grid;
  place-items: center;
  text-align: center;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
}

.pie-donut__center strong {
  color: #0f172a;
  font-size: 1.25rem;
}

.pie-donut__center span {
  color: #64748b;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.pie-card__legend {
  display: grid;
  gap: 0.6rem;
}

.legend-row {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  gap: 0.7rem;
  align-items: center;
}

.legend-row__swatch {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}

.legend-row__copy {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: #475569;
  min-width: 0;
}

.legend-row__copy strong {
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pie-card__empty {
  min-height: 220px;
  display: grid;
  place-items: center;
  color: #64748b;
  font-weight: 700;
  border: 1px dashed rgba(148, 163, 184, 0.5);
  border-radius: 20px;
}

@media (max-width: 720px) {
  .pie-card__body {
    grid-template-columns: 1fr;
  }
}
</style>
