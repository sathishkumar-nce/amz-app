<template>
  <nav v-if="total > 0" class="pager" aria-label="Pagination">
    <div class="pager__summary">
      <strong>{{ rangeStart }}-{{ rangeEnd }}</strong>
      <span>of {{ total }} {{ itemLabel }}</span>
      <span class="pager__meta">Page {{ safePage }} of {{ safeTotalPages }}</span>
      <span class="pager__meta">{{ limit }} per page</span>
    </div>

    <div v-if="safeTotalPages > 1" class="pager__actions">
      <button type="button" class="pager__button" :disabled="safePage <= 1" @click="$emit('change', safePage - 1)">
        Previous
      </button>

      <button
        v-for="targetPage in visiblePages"
        :key="targetPage"
        type="button"
        :class="['pager__button', { 'pager__button--active': targetPage === safePage }]"
        @click="$emit('change', targetPage)"
      >
        {{ targetPage }}
      </button>

      <button type="button" class="pager__button" :disabled="safePage >= safeTotalPages" @click="$emit('change', safePage + 1)">
        Next
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  page: number
  totalPages: number
  total: number
  limit: number
  itemLabel?: string
}>(), {
  itemLabel: 'items'
})

defineEmits<{
  change: [page: number]
}>()

const safeTotalPages = computed(() => Math.max(props.totalPages || 0, props.total > 0 ? 1 : 0))
const safePage = computed(() => Math.min(Math.max(props.page || 1, 1), Math.max(safeTotalPages.value, 1)))
const rangeStart = computed(() => {
  if (props.total <= 0) return 0
  return ((safePage.value - 1) * props.limit) + 1
})
const rangeEnd = computed(() => {
  if (props.total <= 0) return 0
  return Math.min(props.total, safePage.value * props.limit)
})

const visiblePages = computed(() => {
  const totalPages = safeTotalPages.value
  const current = safePage.value

  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const start = Math.max(1, current - 2)
  const end = Math.min(totalPages, start + 4)
  const adjustedStart = Math.max(1, end - 4)

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index)
})
</script>

<style scoped>
.pager {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 1rem 0 0;
  flex-wrap: wrap;
}

.pager__summary {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  color: #334155;
  font-weight: 700;
  flex-wrap: wrap;
}

.pager__meta {
  color: #64748b;
}

.pager__actions {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.pager__button {
  min-width: 2.7rem;
  min-height: 2.7rem;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
  padding: 0 0.9rem;
}

.pager__button--active {
  border-color: rgba(15, 118, 110, 0.2);
  background: linear-gradient(135deg, #0f766e, #115e59);
  color: #ffffff;
}

.pager__button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
