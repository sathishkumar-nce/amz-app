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
        <p class="filters-eyebrow">Confirmed Order Filters</p>
        <h2>Filter by date, time, and order details</h2>
      </div>
    </div>

    <div class="filters-grid">
      <label class="filter-field">
        <span>Confirmed from</span>
        <input
          :value="modelValue.confirmed_date_from"
          type="datetime-local"
          class="filter-input"
          :disabled="loading"
          @input="updateField('confirmed_date_from', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="filter-field">
        <span>Confirmed to</span>
        <input
          :value="modelValue.confirmed_date_to"
          type="datetime-local"
          class="filter-input"
          :disabled="loading"
          @input="updateField('confirmed_date_to', ($event.target as HTMLInputElement).value)"
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
          <option value="received">received</option>
          <option value="manufactured">manufactured</option>
          <option value="cancelled">cancelled</option>
          <option value="returned">returned</option>
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
          <option value="p1">P1</option>
          <option value="p2">P2</option>
          <option value="p3">P3</option>
          <option value="p4">P4</option>
        </select>
      </label>

      <div class="filter-field filter-field--split">
        <span>Quantity</span>
        <div class="filter-inline">
          <select
            :value="modelValue.quantity_operator"
            class="filter-input filter-input--operator"
            :disabled="loading"
            @change="updateField('quantity_operator', ($event.target as HTMLSelectElement).value)"
          >
            <option value="gt">&gt;</option>
            <option value="gte">&gt;=</option>
            <option value="lt">&lt;</option>
            <option value="lte">&lt;=</option>
            <option value="eq">=</option>
          </select>
          <input
            :value="modelValue.quantity"
            type="number"
            min="0"
            step="0.01"
            class="filter-input"
            :disabled="loading"
            placeholder="Any quantity"
            @input="updateField('quantity', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <div class="filter-field filter-field--split">
        <span>Default width (in)</span>
        <div class="filter-inline">
          <select
            :value="modelValue.default_width_in_inches_operator"
            class="filter-input filter-input--operator"
            :disabled="loading"
            @change="updateField('default_width_in_inches_operator', ($event.target as HTMLSelectElement).value)"
          >
            <option value="gt">&gt;</option>
            <option value="gte">&gt;=</option>
            <option value="lt">&lt;</option>
            <option value="lte">&lt;=</option>
            <option value="eq">=</option>
          </select>
          <input
            :value="modelValue.default_width_in_inches"
            type="number"
            step="0.01"
            class="filter-input"
            :disabled="loading"
            placeholder="Width in"
            @input="updateField('default_width_in_inches', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <div class="filter-field filter-field--split">
        <span>Default length (in)</span>
        <div class="filter-inline">
          <select
            :value="modelValue.default_length_in_inches_operator"
            class="filter-input filter-input--operator"
            :disabled="loading"
            @change="updateField('default_length_in_inches_operator', ($event.target as HTMLSelectElement).value)"
          >
            <option value="gt">&gt;</option>
            <option value="gte">&gt;=</option>
            <option value="lt">&lt;</option>
            <option value="lte">&lt;=</option>
            <option value="eq">=</option>
          </select>
          <input
            :value="modelValue.default_length_in_inches"
            type="number"
            step="0.01"
            class="filter-input"
            :disabled="loading"
            placeholder="Length in"
            @input="updateField('default_length_in_inches', ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <label class="filter-field">
        <span>Thickness</span>
        <input
          :value="modelValue.thickness"
          type="text"
          class="filter-input"
          :disabled="loading"
          placeholder="1mm, 1.5mm..."
          @input="updateField('thickness', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="filter-field">
        <span>SKU</span>
        <input
          :value="modelValue.sku"
          type="text"
          class="filter-input"
          :disabled="loading"
          placeholder="SKU or wildcard"
          @input="updateField('sku', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="filter-field filter-field--toggle">
        <span>is_round</span>
        <input
          :checked="modelValue.is_round"
          type="checkbox"
          class="toggle-input"
          :disabled="loading"
          @change="updateField('is_round', ($event.target as HTMLInputElement).checked)"
        />
        <span class="toggle-control" aria-hidden="true">
          <span class="toggle-knob"></span>
        </span>
        <strong>{{ modelValue.is_round ? 'Yes' : 'No' }}</strong>
      </label>

      <label class="filter-field">
        <span>Custom inputs</span>
        <select
          :value="modelValue.customer_inputs_mode"
          class="filter-input"
          :disabled="loading"
          @change="updateField('customer_inputs_mode', ($event.target as HTMLSelectElement).value as OrderListAdvancedFilters['customer_inputs_mode'])"
        >
          <option value="">All inputs</option>
          <option value="no_custom_inputs">No custom inputs</option>
          <option value="has_customer_inputs">Has custom inputs</option>
        </select>
      </label>
    </div>

    <div v-if="$slots.extra" class="filters-extra">
      <slot name="extra" />
    </div>

  </section>
</template>

<script setup lang="ts">
import type { OrderListAdvancedFilters } from '@/utils/orderListFilters'

const props = defineProps<{
  modelValue: OrderListAdvancedFilters
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: OrderListAdvancedFilters]
  apply: []
  clear: []
}>()

const updateField = (
  field: keyof OrderListAdvancedFilters,
  value: OrderListAdvancedFilters[keyof OrderListAdvancedFilters],
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

.filters-grid,
.filters-extra {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 220px));
  gap: 0.75rem;
  justify-content: start;
}

.filter-field {
  display: grid;
  gap: 0.45rem;
}

.filter-field--split {
  min-width: 220px;
}

.filter-field--toggle {
  position: relative;
  grid-template-columns: auto auto;
  grid-template-areas:
    'label label'
    'toggle value';
  justify-content: start;
  align-items: center;
  column-gap: 0.7rem;
  min-height: 4.75rem;
}

.filter-field--toggle > span:first-child {
  grid-area: label;
}

.filter-inline {
  display: grid;
  grid-template-columns: 78px minmax(0, 1fr);
  gap: 0.45rem;
}

.filter-field span {
  font-size: 0.8rem;
  font-weight: 700;
  color: #475569;
}

.toggle-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.toggle-input:disabled {
  cursor: wait;
}

.toggle-control {
  grid-area: toggle;
  width: 3.35rem;
  height: 1.75rem;
  display: inline-flex;
  align-items: center;
  padding: 0.2rem;
  border-radius: 999px;
  background: #cbd5e1;
  transition: background 0.18s ease;
}

.toggle-knob {
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
  transition: transform 0.18s ease;
}

.toggle-input:checked + .toggle-control {
  background: #0f766e;
}

.toggle-input:checked + .toggle-control .toggle-knob {
  transform: translateX(1.6rem);
}

.filter-field--toggle strong {
  grid-area: value;
  color: #0f172a;
  font-size: 0.9rem;
}

:deep(.filters-extra .filter-field) {
  display: grid;
  gap: 0.45rem;
}

:deep(.filters-extra .filter-field span) {
  font-size: 0.8rem;
  font-weight: 700;
  color: #475569;
}

:deep(.filters-extra .filter-input) {
  width: 100%;
  min-height: 3rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: #ffffff;
  color: #0f172a;
  padding: 0.75rem 0.85rem;
  font: inherit;
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

.filter-input--operator {
  text-align: center;
  padding-left: 0.55rem;
  padding-right: 0.55rem;
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
