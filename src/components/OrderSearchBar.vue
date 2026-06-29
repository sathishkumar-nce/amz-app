<template>
  <section class="search-shell">
    <div class="search-grid">
      <select :value="searchKey" class="search-input" @change="emit('update:searchKey', ($event.target as HTMLSelectElement).value)">
        <option value="order_id">Order ID</option>
        <option value="customer">Customer Name</option>
        <option value="phone">Phone</option>
        <option value="sku">SKU</option>
        <option value="thickness">Thickness</option>
        <option value="priority">Priority</option>
        <option value="is_round">Is Round</option>
        <option value="confirmed_date">Order Confirmed Date</option>
        <option value="order_status">Order Status</option>
        <option value="default_width_in_inches">Default Width (in)</option>
        <option value="default_length_in_inches">Default Length (in)</option>
      </select>

      <input
        v-if="searchKey !== 'order_status' && searchKey !== 'confirmed_date' && searchKey !== 'priority' && searchKey !== 'is_round' && searchKey !== 'default_width_in_inches' && searchKey !== 'default_length_in_inches'"
        :value="searchValue"
        type="text"
        class="search-input"
        :placeholder="placeholder"
        @input="emit('update:searchValue', ($event.target as HTMLInputElement).value)"
        @keyup.enter="emit('search')"
      />

      <input
        v-else-if="searchKey === 'confirmed_date'"
        :value="searchValue"
        type="date"
        class="search-input"
        @input="emit('update:searchValue', ($event.target as HTMLInputElement).value)"
        @keyup.enter="emit('search')"
      />

      <select
        v-else-if="searchKey === 'order_status'"
        :value="searchValue"
        class="search-input"
        @change="emit('update:searchValue', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Select order status</option>
        <option value="received">received</option>
        <option value="manufactured">manufactured</option>
        <option value="cancelled">cancelled</option>
        <option value="returned">returned</option>
      </select>

      <select
        v-else-if="searchKey === 'priority'"
        :value="searchValue"
        class="search-input"
        @change="emit('update:searchValue', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Select priority</option>
        <option value="p1">p1</option>
        <option value="p2">p2</option>
        <option value="p3">p3</option>
        <option value="p4">p4</option>
      </select>

      <select
        v-else-if="searchKey === 'is_round'"
        :value="searchValue"
        class="search-input"
        @change="emit('update:searchValue', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Select is_round value</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>

      <div
        v-else
        class="search-range-inline"
      >
        <select
          :value="searchOperator"
          class="search-input search-input--operator"
          @change="emit('update:searchOperator', ($event.target as HTMLSelectElement).value as SearchOperator)"
        >
          <option value="gt">&gt;</option>
          <option value="gte">&gt;=</option>
          <option value="lt">&lt;</option>
          <option value="lte">&lt;=</option>
          <option value="eq">=</option>
        </select>
        <input
          :value="searchValue"
          type="number"
          step="0.01"
          class="search-input"
          :placeholder="placeholder"
          @input="emit('update:searchValue', ($event.target as HTMLInputElement).value)"
          @keyup.enter="emit('search')"
        />
      </div>

      <button type="button" class="search-button" :disabled="loading" @click="emit('search')">
        {{ loading ? 'Searching...' : 'Search' }}
      </button>
      <button type="button" class="clear-button" :disabled="loading" @click="emit('clear')">Clear</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type SearchOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq'

const props = defineProps<{
  searchKey: string
  searchValue: string
  searchOperator?: SearchOperator
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:searchKey': [value: string]
  'update:searchValue': [value: string]
  'update:searchOperator': [value: SearchOperator]
  search: []
  clear: []
}>()

const placeholder = computed(() => {
  if (props.searchKey === 'order_id') return 'Enter order ID'
  if (props.searchKey === 'customer') return 'Enter customer name'
  if (props.searchKey === 'phone') return 'Enter phone number'
  if (props.searchKey === 'sku') return 'Enter SKU'
  if (props.searchKey === 'thickness') return 'Enter thickness'
  if (props.searchKey === 'default_width_in_inches') return 'Width in'
  if (props.searchKey === 'default_length_in_inches') return 'Length in'
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

.search-range-inline {
  display: grid;
  grid-template-columns: 78px minmax(140px, 1fr);
  gap: 0.6rem;
  min-width: 220px;
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

.search-input--operator {
  text-align: center;
  padding-left: 0.55rem;
  padding-right: 0.55rem;
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
