<template>
  <div class="settings-page">
    <section class="settings-card">
      <header class="settings-header">
        <div>
          <p class="eyebrow">Review follow-up settings</p>
          <h1>State Follow-Up Days</h1>
        </div>
        <div class="settings-actions">
          <router-link to="/review-requests" class="secondary-button">Review Queue</router-link>
          <button type="button" class="secondary-button" :disabled="store.loading" @click="handleReset">
            Reset
          </button>
          <button type="button" class="primary-button" :disabled="store.loading" @click="handleSave">
            {{ store.loading ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </header>

      <p v-if="message" class="message message--success">{{ message }}</p>
      <p v-if="errorMessage" class="message message--error">{{ errorMessage }}</p>

      <div v-if="store.loading && form.length === 0" class="empty-state">Loading state settings...</div>

      <div v-else class="settings-grid">
        <label v-for="item in form" :key="item.state_code" class="state-row">
          <span class="state-name">
            <strong>{{ item.state_name }}</strong>
            <small>{{ item.state_code }}</small>
          </span>
          <input
            v-model.number="item.followup_days"
            type="number"
            min="0"
            max="120"
            step="1"
          />
        </label>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useReviewFollowupsStore } from '@/stores/reviewFollowups'
import type { ReviewFollowupStateSetting } from '@/types'

const store = useReviewFollowupsStore()
const form = ref<ReviewFollowupStateSetting[]>([])
const message = ref('')
const errorMessage = ref('')

const clampDays = (value: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(120, Math.max(0, Math.round(parsed)))
}

const loadForm = async () => {
  await store.refreshSettings()
  form.value = store.settings.map((item) => ({ ...item }))
}

const handleSave = async () => {
  message.value = ''
  errorMessage.value = ''

  try {
    await store.saveSettings(form.value.map((item) => ({
      ...item,
      followup_days: clampDays(item.followup_days),
    })))
    await loadForm()
    message.value = 'Review follow-up settings saved.'
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to save settings.'
  }
}

const handleReset = async () => {
  message.value = ''
  errorMessage.value = ''

  try {
    await store.resetSettings()
    await loadForm()
    message.value = 'Review follow-up settings reset.'
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to reset settings.'
  }
}

onMounted(() => {
  void loadForm()
})
</script>

<style scoped>
.settings-page {
  max-width: 1180px;
  margin: 0 auto;
}

.settings-card {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 20px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  padding: 1.25rem;
  display: grid;
  gap: 1rem;
}

.settings-header,
.settings-actions {
  display: flex;
  gap: 0.85rem;
  justify-content: space-between;
  align-items: center;
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

.primary-button,
.secondary-button {
  min-height: 2.6rem;
  border-radius: 8px;
  font-weight: 800;
  cursor: pointer;
}

.primary-button {
  border: 0;
  padding: 0 1rem;
  background: #0f766e;
  color: #fff;
}

.secondary-button {
  display: inline-flex;
  align-items: center;
  padding: 0 1rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #0f172a;
  text-decoration: none;
}

.message {
  margin: 0;
  font-weight: 800;
}

.message--success {
  color: #15803d;
}

.message--error {
  color: #b91c1c;
}

.empty-state {
  padding: 2rem 1rem;
  text-align: center;
  color: #64748b;
  font-weight: 700;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.75rem;
}

.state-row {
  min-height: 4.25rem;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 10px;
  background: #f8fafc;
  padding: 0.75rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 5.5rem;
  align-items: center;
  gap: 0.75rem;
}

.state-name {
  min-width: 0;
  display: grid;
  gap: 0.2rem;
}

.state-name strong {
  color: #0f172a;
  overflow-wrap: anywhere;
}

.state-name small {
  color: #64748b;
  font-weight: 800;
}

input {
  width: 100%;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.42);
  background: #fff;
  color: #0f172a;
  padding: 0.65rem 0.7rem;
  font: inherit;
  font-weight: 800;
}

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
</style>
