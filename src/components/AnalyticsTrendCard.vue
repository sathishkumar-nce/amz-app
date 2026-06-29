<template>
  <article class="trend-card" :class="`trend-card--${tone}`">
    <div class="trend-card__header">
      <div>
        <p class="trend-card__eyebrow">{{ eyebrow }}</p>
        <h3>{{ title }}</h3>
      </div>
      <span class="trend-card__chip" :class="trendClass">{{ trendLabel }}</span>
    </div>

    <div class="trend-card__summary">
      <div>
        <span>Total</span>
        <strong>{{ total }}</strong>
      </div>
      <div>
        <span>Peak</span>
        <strong>{{ peak }}</strong>
      </div>
      <div>
        <span>Average</span>
        <strong>{{ average }}</strong>
      </div>
    </div>

    <div class="trend-card__columns" aria-hidden="true">
      <div
        v-for="item in items"
        :key="`${title}-${item.key}`"
        class="trend-card__column"
      >
        <span class="trend-card__value">{{ item.count }}</span>
        <div class="trend-card__bar-shell">
          <div class="trend-card__bar" :style="{ height: `${barHeight(item.count)}%` }" />
        </div>
        <span class="trend-card__label">{{ item.label }}</span>
      </div>
    </div>

    <div class="trend-card__footer">
      <div class="trend-card__stat">
        <span>Latest</span>
        <strong>{{ latest }}</strong>
      </div>
      <div v-if="showPercentages" class="trend-card__stat trend-card__stat--wide">
        <span>Current impact</span>
        <strong>{{ latestPercentage }}</strong>
      </div>
      <div v-else class="trend-card__stat trend-card__stat--wide">
        <span>Movement</span>
        <strong>{{ movementLabel }}</strong>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AnalyticsPeriodStat } from '@/types'

const props = withDefaults(defineProps<{
  title: string
  eyebrow?: string
  items: AnalyticsPeriodStat[]
  tone?: 'teal' | 'rose' | 'sky' | 'amber' | 'violet'
  showPercentages?: boolean
}>(), {
  eyebrow: 'Analytics',
  tone: 'teal',
  showPercentages: false
})

const sumCount = computed(() => props.items.reduce((sum, item) => sum + item.count, 0))
const peak = computed(() => props.items.reduce((max, item) => Math.max(max, item.count), 0))
const latestItem = computed(() => props.items.at(-1))
const firstItem = computed(() => props.items[0])
const total = computed(() => latestItem.value?.count ?? 0)
const average = computed(() => props.items.length ? Math.round(sumCount.value / props.items.length) : 0)
const latest = computed(() => latestItem.value?.count ?? 0)
const delta = computed(() => latest.value - (firstItem.value?.count ?? 0))
const latestPercentage = computed(() => `${(latestItem.value?.percentage ?? 0).toFixed(1)}%`)

const trendLabel = computed(() => {
  if (delta.value > 0) return `+${delta.value} rising`
  if (delta.value < 0) return `${delta.value} easing`
  return 'Stable pace'
})

const trendClass = computed(() => {
  if (delta.value > 0) return 'trend-card__chip--up'
  if (delta.value < 0) return 'trend-card__chip--down'
  return 'trend-card__chip--flat'
})

const movementLabel = computed(() => {
  if (!props.items.length) return 'No movement'
  const direction = delta.value > 0 ? 'up' : delta.value < 0 ? 'down' : 'flat'
  return `${Math.abs(delta.value)} ${direction}`
})

const barHeight = (count: number) => {
  if (!peak.value) return 12
  return Math.max((count / peak.value) * 100, 12)
}
</script>

<style scoped>
.trend-card {
  border-radius: 26px;
  padding: 1.3rem;
  display: grid;
  gap: 1.15rem;
  min-height: 100%;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.08);
}

.trend-card--teal {
  background: linear-gradient(180deg, rgba(240, 253, 250, 0.98), rgba(204, 251, 241, 0.92));
}

.trend-card--rose {
  background: linear-gradient(180deg, rgba(255, 241, 242, 0.98), rgba(254, 205, 211, 0.9));
}

.trend-card--sky {
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.98), rgba(191, 219, 254, 0.9));
}

.trend-card--amber {
  background: linear-gradient(180deg, rgba(255, 251, 235, 0.98), rgba(253, 230, 138, 0.92));
}

.trend-card--violet {
  background: linear-gradient(180deg, rgba(245, 243, 255, 0.98), rgba(221, 214, 254, 0.92));
}

.trend-card__header,
.trend-card__summary,
.trend-card__footer {
  display: flex;
  justify-content: space-between;
  gap: 0.85rem;
  align-items: flex-start;
}

.trend-card__eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.56);
}

h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.08rem;
}

.trend-card__chip {
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 800;
  white-space: nowrap;
}

.trend-card__chip--up {
  background: rgba(15, 118, 110, 0.12);
  color: #115e59;
}

.trend-card__chip--down {
  background: rgba(190, 24, 93, 0.1);
  color: #9f1239;
}

.trend-card__chip--flat {
  background: rgba(148, 163, 184, 0.16);
  color: #475569;
}

.trend-card__summary > div,
.trend-card__stat {
  flex: 1;
  border-radius: 18px;
  padding: 0.8rem 0.9rem;
  background: rgba(255, 255, 255, 0.62);
  backdrop-filter: blur(8px);
}

.trend-card__summary span,
.trend-card__stat span {
  display: block;
  color: #64748b;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 800;
}

.trend-card__summary strong,
.trend-card__stat strong {
  display: block;
  margin-top: 0.4rem;
  color: #0f172a;
  font-size: 1.35rem;
}

.trend-card__stat--wide {
  flex: 1.4;
}

.trend-card__columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(48px, 1fr));
  gap: 0.7rem;
  align-items: end;
  min-height: 180px;
}

.trend-card__column {
  display: grid;
  grid-template-rows: 1.5rem 120px 2.8rem;
  gap: 0.45rem;
  align-items: stretch;
}

.trend-card__value,
.trend-card__label {
  text-align: center;
  font-size: 0.76rem;
  font-weight: 800;
}

.trend-card__value {
  color: #0f172a;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.trend-card__label {
  color: #475569;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  line-height: 1.25;
  min-height: 2.8rem;
  text-wrap: balance;
}

.trend-card__bar-shell {
  height: 120px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.5);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
  padding: 0.3rem;
}

.trend-card__bar {
  width: 100%;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.14), rgba(15, 23, 42, 0.38));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

@media (max-width: 720px) {
  .trend-card__header,
  .trend-card__summary,
  .trend-card__footer {
    flex-direction: column;
  }

  .trend-card__summary > div,
  .trend-card__stat {
    width: 100%;
  }
}
</style>
