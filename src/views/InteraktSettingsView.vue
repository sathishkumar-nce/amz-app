<template>
  <div class="settings-page">
    <section class="settings-card">
      <div class="settings-header">
        <div>
          <p class="eyebrow">WhatsApp automation</p>
          <h1>Interakt Settings</h1>
          <p class="intro-copy">
            Control whether new Amazon orders trigger WhatsApp messages, and switch between test and production mode without restarting the backend.
          </p>
        </div>
        <div class="settings-actions">
          <button type="button" class="primary-button" :disabled="store.loading" @click="handleSave">
            {{ store.loading ? 'Saving...' : 'Save Settings' }}
          </button>
        </div>
      </div>

      <p v-if="message" class="message message--success">{{ message }}</p>
      <p v-if="errorMessage" class="message message--error">{{ errorMessage }}</p>

      <div class="settings-grid">
        <article class="setting-card">
          <div class="setting-row">
            <div>
              <strong>Interakt WhatsApp Send</strong>
              <p>Turn the order-created WhatsApp automation on or off.</p>
            </div>
            <label class="toggle">
              <input v-model="form.enabled" type="checkbox" />
              <span>{{ form.enabled ? 'Enabled' : 'Disabled' }}</span>
            </label>
          </div>
        </article>

        <article class="setting-card">
          <div class="setting-block">
            <strong>Mode</strong>
            <p>Use `test` to reroute all sends to the backend test number. Use `prod` to send to the customer phone.</p>
            <div class="mode-grid">
              <label class="mode-option">
                <input v-model="form.mode" type="radio" value="test" />
                <span>Test Mode</span>
              </label>
              <label class="mode-option">
                <input v-model="form.mode" type="radio" value="prod" />
                <span>Prod Mode</span>
              </label>
            </div>
          </div>
        </article>

        <article class="setting-card">
          <div class="setting-block">
            <strong>Template Name</strong>
            <p>Choose the exact Interakt template name to use for new Amazon order WhatsApp messages.</p>
            <input v-model.trim="form.template_name" type="text" class="text-input" placeholder="amzmrclearorderconfirmation_v2" />
          </div>
        </article>

        <article class="setting-card">
          <div class="setting-block">
            <strong>Test Number</strong>
            <p>When mode is `test`, all WhatsApp messages will be sent to this number instead of the customer phone.</p>
            <input v-model.trim="form.test_number" type="text" class="text-input" placeholder="8838137092" />
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useInteraktSettingsStore } from '@/stores/interaktSettings'

const store = useInteraktSettingsStore()
const message = ref('')
const errorMessage = ref('')
const form = reactive({
  enabled: false,
  mode: 'prod' as 'test' | 'prod',
  template_name: 'amzmrclearorderconfirmation_v2',
  test_number: '',
})

const loadForm = async () => {
  await store.refresh()
  form.enabled = store.settings?.enabled ?? false
  form.mode = store.settings?.mode ?? 'prod'
  form.template_name = store.settings?.template_name ?? 'amzmrclearorderconfirmation_v2'
  form.test_number = store.settings?.test_number ?? ''
}

const handleSave = async () => {
  message.value = ''
  errorMessage.value = ''
  try {
    await store.save({
      enabled: form.enabled,
      mode: form.mode,
      template_name: form.template_name,
      test_number: form.test_number,
    })
    await loadForm()
    message.value = 'Interakt settings saved.'
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to save Interakt settings.'
  }
}

onMounted(() => {
  void loadForm()
})
</script>

<style scoped>
.settings-page {
  max-width: 1080px;
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
.settings-actions,
.setting-row,
.mode-grid {
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

.intro-copy,
.setting-card p {
  margin: 0.8rem 0 0;
  color: #475569;
  max-width: 70ch;
}

.primary-button {
  min-height: 2.9rem;
  padding: 0 1rem;
  border-radius: 14px;
  font-weight: 800;
  cursor: pointer;
  border: 0;
  background: linear-gradient(135deg, #0f766e, #115e59);
  color: #fff;
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

.setting-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  padding: 1rem 1.05rem;
  background: #f8fafc;
}

.setting-block,
.toggle,
.mode-option {
  display: grid;
  gap: 0.45rem;
}

.text-input {
  width: 100%;
  box-sizing: border-box;
  min-height: 2.9rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: #fff;
  color: #0f172a;
  padding: 0 0.9rem;
  font: inherit;
}

.toggle span,
.mode-option span,
.setting-card strong {
  color: #0f172a;
  font-weight: 800;
}

.mode-grid {
  justify-content: flex-start;
}

.mode-option {
  min-width: 180px;
  padding: 0.9rem 1rem;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: #fff;
}
</style>
