<template>
  <section class="search-shell">
    <div class="search-grid">
      <select :value="searchKey" class="search-input" @change="emit('update:searchKey', ($event.target as HTMLSelectElement).value)">
        <option value="order_id">Order ID</option>
        <option value="customer_name">Customer Name</option>
        <option value="mobile">Mobile</option>
        <option value="pincode">Pincode</option>
        <option value="awb">AWB</option>
        <option value="item">Item</option>
        <option value="order_status">Order Status</option>
        <option value="payment_status">Payment Status</option>
        <option value="priority">Priority</option>
        <option value="source">Source</option>
      </select>

      <input
        v-if="!selectKeys.has(searchKey)"
        :value="searchValue"
        type="text"
        class="search-input"
        :placeholder="placeholder"
        @input="emit('update:searchValue', ($event.target as HTMLInputElement).value)"
        @keyup.enter="emit('search')"
      />

      <select
        v-else
        :value="searchValue"
        class="search-input"
        @change="emit('update:searchValue', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Select value</option>
        <option v-for="option in currentOptions" :key="option" :value="option">{{ option }}</option>
      </select>

      <button type="button" class="search-button" :disabled="loading" @click="emit('search')">
        {{ loading ? 'Searching...' : 'Search' }}
      </button>
      <button type="button" class="clear-button" :disabled="loading" @click="emit('clear')">Clear</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  searchKey: string
  searchValue: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:searchKey': [value: string]
  'update:searchValue': [value: string]
  search: []
  clear: []
}>()

const optionMap: Record<string, string[]> = {
  order_status: ['confirmed', 'manufactured', 'on-hold', 'forwarded', 'cancelled', 'returned', 'other-issues'],
  payment_status: ['pending', 'paid-full', 'paid-advance', 'refunded'],
  priority: ['P1', 'P2', 'P3', 'P4'],
  source: ['website', 'phone', 'whatsapp', 'email', 'meta', 'amz-replacement', 'issue-replacement', 'other'],
}

const selectKeys = new Set(Object.keys(optionMap))

const currentOptions = computed(() => optionMap[props.searchKey] || [])

const placeholder = computed(() => {
  if (props.searchKey === 'order_id') return 'Enter order ID'
  if (props.searchKey === 'customer_name') return 'Enter customer name'
  if (props.searchKey === 'mobile') return 'Enter mobile number'
  if (props.searchKey === 'pincode') return 'Enter pincode'
  if (props.searchKey === 'awb') return 'Enter AWB'
  if (props.searchKey === 'item') return 'Enter item name'
  return 'Enter search value'
})
</script>

<style scoped>
.search-shell {
  padding: 1rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.search-grid {
  display: grid;
  grid-template-columns: 190px minmax(220px, 320px) auto auto;
  gap: 0.6rem;
  align-items: center;
  justify-content: start;
}

.search-input {
  width: 100%;
  min-height: 3rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #ffffff;
  color: #0f172a;
  padding: 0.75rem 0.85rem;
  font: inherit;
}

.search-input:focus {
  outline: none;
  border-color: #0f766e;
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
}

.search-button,
.clear-button {
  min-height: 3rem;
  padding: 0 1.2rem;
  border-radius: 14px;
  border: 0;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.search-button {
  background: #0f766e;
  color: #ffffff;
}

.clear-button {
  background: #e2e8f0;
  color: #0f172a;
}

.search-button:disabled,
.clear-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

@media (max-width: 900px) {
  .search-grid {
    grid-template-columns: 1fr;
  }
}
</style>
