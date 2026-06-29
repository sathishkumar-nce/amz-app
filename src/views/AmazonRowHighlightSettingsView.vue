<template>
  <div class="settings-page">
    <section class="settings-card">
      <div class="settings-header">
        <div>
          <p class="eyebrow">Amazon row highlighting</p>
          <h1>Row Highlight Settings</h1>
          <p class="intro-copy">
            Configure which Amazon order rows should be highlighted across all Amazon order boards. Rules are checked by sort order, and the first matching enabled rule wins.
          </p>
        </div>
        <div class="settings-actions">
          <button type="button" class="secondary-button" :disabled="store.loading" @click="handleReset">
            Reset To Default
          </button>
          <button type="button" class="primary-button" :disabled="store.loading" @click="handleSave">
            {{ store.loading ? 'Saving...' : 'Save Rules' }}
          </button>
        </div>
      </div>

      <p v-if="message" class="message message--success">{{ message }}</p>
      <p v-if="errorMessage" class="message message--error">{{ errorMessage }}</p>

      <div class="rules-grid">
        <article v-for="rule in form" :key="rule.rule_key" class="rule-card">
          <div class="rule-card__header">
            <div>
              <strong>{{ rule.label }}</strong>
              <span>{{ rule.rule_key }}</span>
            </div>
            <label class="toggle">
              <input v-model="rule.enabled" type="checkbox" />
              <span>Enabled</span>
            </label>
          </div>

          <div class="rule-card__grid">
            <label>
              <span>Label</span>
              <input v-model.trim="rule.label" type="text" />
            </label>
            <label>
              <span>Field</span>
              <select v-model="rule.field_name">
                <option value="quantity">quantity</option>
                <option value="is_round">is_round</option>
                <option value="priority">priority</option>
                <option value="payment_done">payment_done</option>
              </select>
            </label>
            <label>
              <span>Operator</span>
              <select v-model="rule.operator">
                <option value="gt">greater than</option>
                <option value="eq">equals</option>
              </select>
            </label>
            <label>
              <span>Sort Order</span>
              <input v-model.number="rule.sort_order" type="number" />
            </label>
            <label v-if="rule.operator === 'gt'">
              <span>Threshold Number</span>
              <input v-model.number="rule.threshold_number" type="number" step="0.01" />
            </label>
            <label v-else>
              <span>Match Text</span>
              <input v-model.trim="rule.match_text" type="text" />
            </label>
            <label>
              <span>Color Mode</span>
              <select v-model="rule.color_mode">
                <option value="solid">solid</option>
                <option value="gradient">gradient</option>
              </select>
            </label>
            <label>
              <span>Color Start</span>
              <div class="color-field">
                <input v-model.trim="rule.color_start" type="text" placeholder="#dbeafe" />
                <input v-model="rule.color_start" type="color" class="color-picker" />
              </div>
            </label>
            <label v-if="rule.color_mode === 'gradient'">
              <span>Color End</span>
              <div class="color-field">
                <input v-model.trim="rule.color_end" type="text" placeholder="#fef08a" />
                <input v-model="rule.color_end" type="color" class="color-picker" />
              </div>
            </label>
          </div>

          <div class="preview">
            <span>Preview</span>
            <div class="preview__swatch" :style="previewStyle(rule)" />
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAmazonRowHighlightRulesStore } from '@/stores/amazonRowHighlightRules'
import type { AmazonRowHighlightRule } from '@/types'

const store = useAmazonRowHighlightRulesStore()
const form = ref<AmazonRowHighlightRule[]>([])
const message = ref('')
const errorMessage = ref('')

const loadForm = async () => {
  await store.refresh()
  form.value = store.rules.map((rule) => ({ ...rule }))
}

const handleSave = async () => {
  message.value = ''
  errorMessage.value = ''
  try {
    await store.saveAll(form.value.map((rule) => ({
      ...rule,
      threshold_number: rule.operator === 'gt' ? rule.threshold_number ?? 0 : null,
      match_text: rule.operator === 'eq' ? rule.match_text?.trim() || '' : null,
      color_end: rule.color_mode === 'gradient' ? rule.color_end?.trim() || '#ffffff' : null,
    })))
    await loadForm()
    message.value = 'Row highlight rules saved.'
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to save row highlight rules.'
  }
}

const handleReset = async () => {
  message.value = ''
  errorMessage.value = ''
  try {
    await store.resetDefaults()
    await loadForm()
    message.value = 'Default row highlight rules restored.'
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to reset row highlight rules.'
  }
}

const previewStyle = (rule: AmazonRowHighlightRule) => {
  if (rule.color_mode === 'gradient' && rule.color_end) {
    return {
      background: `linear-gradient(135deg, ${rule.color_start}, ${rule.color_end})`,
    }
  }
  return {
    background: rule.color_start,
  }
}

onMounted(() => {
  void loadForm()
})
</script>

<style scoped>
.settings-page {
  max-width: 1320px;
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
.rule-card__header {
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
  max-width: 76ch;
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

.rules-grid {
  display: grid;
  gap: 1rem;
}

.rule-card {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  padding: 1rem 1.05rem;
  background: #f8fafc;
  display: grid;
  gap: 0.9rem;
}

.rule-card__header strong {
  display: block;
  color: #0f172a;
}

.rule-card__header span {
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 700;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: #475569;
  font-weight: 700;
}

.rule-card__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.85rem;
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

input,
select {
  min-height: 2.8rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: #fff;
  color: #0f172a;
  padding: 0.7rem 0.85rem;
  font: inherit;
}

.color-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 3.2rem;
  gap: 0.5rem;
}

.color-picker {
  padding: 0.2rem;
}

.preview {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  color: #475569;
  font-size: 0.85rem;
  font-weight: 700;
}

.preview__swatch {
  width: 220px;
  max-width: 100%;
  min-height: 2.8rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25);
}
</style>
