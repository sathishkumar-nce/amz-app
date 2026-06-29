<template>
  <div class="settings-page">
    <section class="settings-card">
      <div class="settings-header">
        <div>
          <p class="eyebrow">Shipping filter settings</p>
          <h1>Sidebar Shipping Date Filters</h1>
          <p class="intro-copy">
            Configure the relative day offsets and times used by the global shipping filter buttons. These settings apply to all Amazon order boards.
          </p>
        </div>
        <div class="settings-actions">
          <button type="button" class="secondary-button" :disabled="store.loading" @click="handleReset">
            Reset To Default
          </button>
          <button type="button" class="primary-button" :disabled="store.loading" @click="handleSave">
            {{ store.loading ? 'Saving...' : 'Save Settings' }}
          </button>
        </div>
      </div>

      <p v-if="message" class="message message--success">{{ message }}</p>
      <p v-if="errorMessage" class="message message--error">{{ errorMessage }}</p>

      <div class="settings-grid">
        <article v-for="item in form" :key="item.filter_key" class="filter-card">
          <div class="filter-card__header">
            <strong>{{ item.label }}</strong>
            <span>{{ item.filter_key }}</span>
          </div>

          <p v-if="!item.is_range_enabled" class="filter-card__note">
            This option disables confirmed-date filtering and shows all Amazon orders.
          </p>

          <div class="filter-card__grid">
            <label>
              <span>Start Day Offset</span>
              <input v-model.number="item.start_day_offset" type="number" :disabled="!item.is_range_enabled" />
            </label>
            <label>
              <span>Start Time</span>
              <input v-model="item.start_time" type="time" :disabled="!item.is_range_enabled" />
            </label>
            <label>
              <span>End Day Offset</span>
              <input v-model.number="item.end_day_offset" type="number" :disabled="!item.is_range_enabled" />
            </label>
            <label>
              <span>End Time</span>
              <input v-model="item.end_time" type="time" :disabled="!item.is_range_enabled" />
            </label>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useShippingDateFiltersStore } from '@/stores/shippingDateFilters'

type ShippingDateFilterFormRow = {
  filter_key: string
  label: string
  is_range_enabled: boolean
  start_day_offset: number
  end_day_offset: number
  start_time: string
  end_time: string
}

const store = useShippingDateFiltersStore()
const form = ref<ShippingDateFilterFormRow[]>([])
const message = ref('')
const errorMessage = ref('')

const toTimeValue = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`

const loadForm = async () => {
  await store.refresh()
  form.value = store.settings.map((item) => ({
    filter_key: item.filter_key,
    label: item.label,
    is_range_enabled: item.is_range_enabled,
    start_day_offset: item.start_day_offset,
    end_day_offset: item.end_day_offset,
    start_time: toTimeValue(item.start_hour, item.start_minute),
    end_time: toTimeValue(item.end_hour, item.end_minute),
  }))
}

const parseTime = (value: string): { hour: number; minute: number } => {
  const [hour = 0, minute = 0] = value.split(':').map((part) => Number(part))
  return {
    hour: Number.isFinite(hour) ? hour : 0,
    minute: Number.isFinite(minute) ? minute : 0,
  }
}

const handleSave = async () => {
  message.value = ''
  errorMessage.value = ''
  try {
    await store.saveAll(form.value.map((item) => {
      const start = parseTime(item.start_time)
      const end = parseTime(item.end_time)
      return {
        filter_key: item.filter_key,
        label: item.label,
        is_range_enabled: item.is_range_enabled,
        start_day_offset: item.start_day_offset,
        start_hour: start.hour,
        start_minute: start.minute,
        end_day_offset: item.end_day_offset,
        end_hour: end.hour,
        end_minute: end.minute,
      }
    }))
    await loadForm()
    message.value = 'Shipping date filter settings saved.'
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to save settings.'
  }
}

const handleReset = async () => {
  message.value = ''
  errorMessage.value = ''
  try {
    await store.resetDefaults()
    await loadForm()
    message.value = 'Default shipping date filters restored.'
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to reset defaults.'
  }
}

onMounted(() => {
  void loadForm()
})
</script>

<style scoped>
.settings-page {
  max-width: 1280px;
  margin: 0 auto;
}

.settings-card {
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 24px;
  padding: 1.35rem 1.45rem;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  display: grid;
  gap: 1.1rem;
}

.settings-header,
.settings-actions {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
}

.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
  font-weight: 800;
  color: #0f766e;
}

h1 {
  margin: 0;
  color: #0f172a;
  font-size: 2rem;
}

.intro-copy {
  margin: 0.8rem 0 0;
  color: #475569;
  max-width: 70ch;
}

.primary-button,
.secondary-button {
  min-height: 2.9rem;
  padding: 0 1rem;
  border-radius: 14px;
  font-weight: 800;
  cursor: pointer;
}

.primary-button {
  border: 0;
  background: linear-gradient(135deg, #0f766e, #115e59);
  color: #fff;
}

.secondary-button {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #0f172a;
}

.message {
  margin: 0;
  font-weight: 700;
}

.message--success { color: #15803d; }
.message--error { color: #b91c1c; }

.settings-grid {
  display: grid;
  gap: 1rem;
}

.filter-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  padding: 1rem 1.05rem;
  background: #f8fafc;
  display: grid;
  gap: 0.85rem;
}

.filter-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.filter-card__header strong {
  color: #0f172a;
}

.filter-card__header span {
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 700;
}

.filter-card__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.85rem;
}

.filter-card__note {
  margin: 0;
  color: #475569;
  font-size: 0.92rem;
}

label {
  display: grid;
  gap: 0.35rem;
}

label span {
  color: #475569;
  font-size: 0.82rem;
  font-weight: 700;
}

input {
  min-height: 2.8rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #0f172a;
  padding: 0.7rem 0.85rem;
  font: inherit;
}

input:disabled {
  background: #e2e8f0;
  color: #64748b;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .filter-card__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .filter-card__grid {
    grid-template-columns: 1fr;
  }
}
</style>
