<template>
  <span class="sort-header">
    <span>{{ label }}</span>
    <span class="sort-header__actions">
      <button
        type="button"
        :class="['sort-header__button', { 'sort-header__button--active': direction === 'asc' }]"
        @click="emit('sort', 'asc')"
      >
        ▲
      </button>
      <button
        type="button"
        :class="['sort-header__button', { 'sort-header__button--active': direction === 'desc' }]"
        @click="emit('sort', 'desc')"
      >
        ▼
      </button>
    </span>
  </span>
</template>

<script setup lang="ts">
import type { SortDirection } from '@/utils/tableSort'

defineProps<{
  label: string
  direction?: SortDirection | null
}>()

const emit = defineEmits<{
  sort: [direction: SortDirection]
}>()
</script>

<style scoped>
.sort-header {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.sort-header__actions {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}

.sort-header__button {
  width: 1.2rem;
  height: 1.2rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #94a3b8;
  font-size: 0.68rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.sort-header__button:hover {
  background: rgba(148, 163, 184, 0.15);
  color: #334155;
}

.sort-header__button--active {
  background: rgba(15, 118, 110, 0.14);
  color: #0f766e;
}
</style>
