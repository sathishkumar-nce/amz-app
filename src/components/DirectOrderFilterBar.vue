<template>
  <section class="filters-shell">
    <div class="filters-head">
      <div class="filters-head__actions">
        <button type="button" class="filters-button filters-button--primary" :disabled="loading" @click="emit('apply')">
          {{ loading ? 'Applying...' : 'Apply Filters' }}
        </button>
        <button type="button" class="filters-button filters-button--ghost" :disabled="loading" @click="emit('clear')">
          Clear Filters
        </button>
        <span class="filters-count">All filters are optional</span>
      </div>
      <div class="filters-title">
        <p class="filters-eyebrow">Direct Order Filters</p>
        <h2>Filter by direct-order status, dates, and customer details</h2>
      </div>
    </div>

    <div class="filters-grid">
      <label class="filter-field">
        <span>Created from</span>
        <input
          :value="modelValue.date_from"
          type="date"
          class="filter-input"
          :disabled="loading"
          @input="updateField('date_from', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="filter-field">
        <span>Created to</span>
        <input
          :value="modelValue.date_to"
          type="date"
          class="filter-input"
          :disabled="loading"
          @input="updateField('date_to', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="filter-field">
        <span>Order status</span>
        <select
          :value="modelValue.order_status"
          class="filter-input"
          :disabled="loading"
          @change="updateField('order_status', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">All statuses</option>
          <option value="confirmed">confirmed</option>
          <option value="manufactured">manufactured</option>
          <option value="on-hold">on-hold</option>
          <option value="forwarded">forwarded</option>
          <option value="cancelled">cancelled</option>
          <option value="returned">returned</option>
          <option value="other-issues">other-issues</option>
        </select>
      </label>

      <label class="filter-field">
        <span>Payment status</span>
        <select
          :value="modelValue.payment_status"
          class="filter-input"
          :disabled="loading"
          @change="updateField('payment_status', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">All payment statuses</option>
          <option value="pending">pending</option>
          <option value="paid-full">paid-full</option>
          <option value="paid-advance">paid-advance</option>
          <option value="refunded">refunded</option>
        </select>
      </label>

      <label class="filter-field">
        <span>Priority</span>
        <select
          :value="modelValue.priority"
          class="filter-input"
          :disabled="loading"
          @change="updateField('priority', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">All priorities</option>
          <option value="P1">P1</option>
          <option value="P2">P2</option>
          <option value="P3">P3</option>
          <option value="P4">P4</option>
        </select>
      </label>

      <label class="filter-field">
        <span>Source</span>
        <select
          :value="modelValue.source"
          class="filter-input"
          :disabled="loading"
          @change="updateField('source', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">All sources</option>
          <option value="website">website</option>
          <option value="phone">phone</option>
          <option value="whatsapp">whatsapp</option>
          <option value="email">email</option>
          <option value="meta">meta</option>
          <option value="amz-replacement">amz-replacement</option>
          <option value="issue-replacement">issue-replacement</option>
          <option value="other">other</option>
        </select>
      </label>

      <label class="filter-field">
        <span>Customer name</span>
        <input
          :value="modelValue.customer_name"
          type="text"
          class="filter-input"
          :disabled="loading"
          placeholder="Customer name"
          @input="updateField('customer_name', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="filter-field">
        <span>Mobile</span>
        <input
          :value="modelValue.mobile"
          type="text"
          class="filter-input"
          :disabled="loading"
          placeholder="Mobile number"
          @input="updateField('mobile', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="filter-field">
        <span>AWB</span>
        <input
          :value="modelValue.awb"
          type="text"
          class="filter-input"
          :disabled="loading"
          placeholder="AWB"
          @input="updateField('awb', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="filter-field">
        <span>Pincode</span>
        <input
          :value="modelValue.pincode"
          type="text"
          class="filter-input"
          :disabled="loading"
          placeholder="Pincode"
          @input="updateField('pincode', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="filter-field">
        <span>Quantity</span>
        <input
          :value="modelValue.quantity"
          type="number"
          min="0"
          step="1"
          class="filter-input"
          :disabled="loading"
          placeholder="Exact quantity"
          @input="updateField('quantity', ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { DirectOrderAdvancedFilters } from '@/utils/directOrderListFilters'

const props = defineProps<{
  modelValue: DirectOrderAdvancedFilters
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DirectOrderAdvancedFilters]
  apply: []
  clear: []
}>()

const updateField = (
  field: keyof DirectOrderAdvancedFilters,
  value: DirectOrderAdvancedFilters[keyof DirectOrderAdvancedFilters],
) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value,
  })
}
</script>

<style scoped>
.filters-shell {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.filters-head {
  display: flex;
  justify-content: flex-start;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.filters-head__actions {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  flex-wrap: wrap;
  order: 0;
}

.filters-title {
  order: 1;
}

.filters-eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  font-weight: 800;
  color: #0f766e;
}

h2 {
  margin: 0;
  font-size: 1.1rem;
  color: #0f172a;
}

.filters-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.2rem;
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: #ecfeff;
  color: #0f766e;
  border: 1px solid rgba(15, 118, 110, 0.18);
  font-size: 0.82rem;
  font-weight: 800;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 220px));
  gap: 0.75rem;
  justify-content: start;
}

.filter-field {
  display: grid;
  gap: 0.45rem;
}

.filter-field span {
  font-size: 0.8rem;
  font-weight: 700;
  color: #475569;
}

.filter-input {
  width: 100%;
  min-height: 3rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #ffffff;
  color: #0f172a;
  padding: 0.75rem 0.85rem;
  font: inherit;
}

.filter-input:focus {
  outline: none;
  border-color: #0f766e;
  box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.12);
}

.filters-button {
  min-height: 2.6rem;
  padding: 0 1rem;
  border-radius: 14px;
  border: 0;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.filters-button--primary {
  background: #0f766e;
  color: #ffffff;
}

.filters-button--ghost {
  background: #e2e8f0;
  color: #0f172a;
}

.filters-button:disabled {
  opacity: 0.7;
  cursor: wait;
}

@media (max-width: 900px) {
  .filters-head__actions {
    width: 100%;
  }

  .filters-button {
    flex: 1 1 180px;
  }
}
</style>
