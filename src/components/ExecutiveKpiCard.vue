<template>
  <article class="kpi-card" :class="`kpi-card--${tone}`">
    <div class="kpi-card__icon-shell">
      <component :is="icon" class="kpi-card__icon" />
    </div>
    <div class="kpi-card__body">
      <p class="kpi-card__title">{{ title }}</p>
      <div class="kpi-card__value-row">
        <strong>{{ value }}</strong>
        <span v-if="percentage != null" class="kpi-card__percentage">{{ percentage }}</span>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: Component
  title: string
  value: string
  percentage?: string | null
  tone?: 'teal' | 'amber' | 'rose' | 'sky' | 'slate'
}>()
</script>

<style scoped>
.kpi-card {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1rem;
  align-items: center;
  padding: 1.15rem;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
}

.kpi-card::after {
  content: '';
  position: absolute;
  inset: auto -10% -40% auto;
  width: 120px;
  height: 120px;
  border-radius: 999px;
  opacity: 0.12;
  background: currentColor;
  filter: blur(6px);
}

.kpi-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
}

.kpi-card__icon-shell {
  width: 3rem;
  height: 3rem;
  border-radius: 1rem;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
}

.kpi-card__icon {
  width: 1.5rem;
  height: 1.5rem;
}

.kpi-card__title {
  margin: 0;
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 700;
}

.kpi-card__value-row {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
  margin-top: 0.35rem;
  flex-wrap: wrap;
}

.kpi-card__value-row strong {
  color: #0f172a;
  font-size: 1.85rem;
  line-height: 1;
}

.kpi-card__percentage {
  color: inherit;
  font-size: 0.95rem;
  font-weight: 800;
}

.kpi-card--teal {
  color: #0f766e;
}

.kpi-card--amber {
  color: #d97706;
}

.kpi-card--rose {
  color: #e11d48;
}

.kpi-card--sky {
  color: #2563eb;
}

.kpi-card--slate {
  color: #475569;
}
</style>
