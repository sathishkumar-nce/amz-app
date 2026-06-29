<template>
  <div class="utility-bar">
    <div class="utility-bar__group">
      <span class="utility-pill utility-pill--primary">{{ total }} {{ itemLabel }}</span>
      <span class="utility-pill">Page {{ safePage }} / {{ safeTotalPages }}</span>
      <span class="utility-pill">{{ modeLabel }}</span>
    </div>

    <div class="utility-bar__group utility-bar__group--muted">
      <span class="utility-pill utility-pill--hint">Scroll sideways for full table</span>
      <span v-if="helperText" class="utility-pill utility-pill--hint">{{ helperText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  total: number
  page: number
  totalPages: number
  itemLabel?: string
  editable?: boolean
  helperText?: string
}>(), {
  itemLabel: 'records',
  editable: false,
  helperText: ''
})

const safeTotalPages = computed(() => Math.max(props.totalPages || 0, props.total > 0 ? 1 : 0))
const safePage = computed(() => Math.min(Math.max(props.page || 1, 1), Math.max(safeTotalPages.value, 1)))
const modeLabel = computed(() => (props.editable ? 'Inline editing enabled' : 'Review view'))
</script>

<style scoped>
.utility-bar {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: center;
  flex-wrap: wrap;
  padding: 0 0 0.85rem;
}

.utility-bar__group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.utility-pill {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  color: #334155;
  font-size: 0.82rem;
  font-weight: 700;
}

.utility-pill--primary {
  background: #ecfeff;
  color: #0f766e;
  border-color: rgba(15, 118, 110, 0.18);
}

.utility-pill--hint {
  background: #f8fafc;
  color: #64748b;
}
</style>
