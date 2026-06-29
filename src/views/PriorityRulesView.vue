<template>
  <div class="priority-page">
    <section class="priority-hero">
      <div>
        <p class="eyebrow">Priority routing</p>
        <h1>Order Priority Rules</h1>
        <p class="priority-copy">
          Define which SKUs should automatically mark newly imported orders as `p1`, `p2`, `p3`, or `p4`.
          If an imported order matches multiple lists, the highest priority wins in the order `p1`, `p2`, `p3`, `p4`.
          If nothing matches, the fallback stays `p3`.
        </p>
      </div>

      <div class="hero-actions">
        <button @click="reloadRules" :disabled="loading" class="secondary-action">
          {{ loading ? 'Refreshing...' : 'Reload Rules' }}
        </button>
        <button @click="saveRules" :disabled="saving || loading" class="primary-action">
          {{ saving ? 'Saving...' : 'Save Rules' }}
        </button>
      </div>
    </section>

    <section class="priority-grid">
      <article v-for="rule in editableRules" :key="rule.key" class="rule-card">
        <div class="rule-header">
          <div>
            <p class="eyebrow">{{ rule.key.toUpperCase() }}</p>
            <h2>{{ priorityDescriptions[rule.key] }}</h2>
          </div>
          <span class="count-pill">{{ parsedSkuCount(rule.skuText) }} SKUs</span>
        </div>

        <label class="field">
          <span>SKUs</span>
          <textarea
            v-model="rule.skuText"
            rows="10"
            class="rule-textarea"
            placeholder="Enter one SKU per line or separate with commas"
          />
        </label>

        <p class="helper-copy">
          Examples: `MRC-MR-001`, `ABC-123`, `ROUND-GLASS-9`
        </p>
      </article>
    </section>

    <p v-if="feedback" class="feedback feedback--success">{{ feedback }}</p>
    <p v-if="errorMessage" class="feedback feedback--error">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { priorityRulesApi } from '@/api/priorityRules'
import type { OrderPriorityKey, OrderPriorityRule, UpdateOrderPriorityRulesRequest } from '@/types'

type EditableRule = {
  key: OrderPriorityKey
  skuText: string
}

const priorityKeys: OrderPriorityKey[] = ['p1', 'p2', 'p3', 'p4']
const priorityDescriptions: Record<OrderPriorityKey, string> = {
  p1: 'Highest urgency',
  p2: 'High priority',
  p3: 'Default priority',
  p4: 'Lowest urgency',
}

const loading = ref(false)
const saving = ref(false)
const feedback = ref('')
const errorMessage = ref('')
const editableRules = ref<EditableRule[]>(priorityKeys.map((key) => ({ key, skuText: '' })))

const skuArrayToText = (values: string[]) => values.join('\n')

const parseSkuText = (value: string) => {
  const seen = new Set<string>()
  return value
    .split(/[\n,]+/)
    .map((sku) => sku.trim().toUpperCase())
    .filter((sku) => {
      if (!sku || seen.has(sku)) return false
      seen.add(sku)
      return true
    })
}

const parsedSkuCount = (value: string) => parseSkuText(value).length

const applyRules = (rules: OrderPriorityRule[]) => {
  const ruleMap = new Map(rules.map((rule) => [rule.key, rule]))
  editableRules.value = priorityKeys.map((key) => ({
    key,
    skuText: skuArrayToText(ruleMap.get(key)?.sku_values || []),
  }))
}

const reloadRules = async () => {
  loading.value = true
  feedback.value = ''
  errorMessage.value = ''
  try {
    const rules = await priorityRulesApi.list()
    applyRules(rules)
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || 'Failed to load priority rules'
  } finally {
    loading.value = false
  }
}

const saveRules = async () => {
  saving.value = true
  feedback.value = ''
  errorMessage.value = ''

  const payload: UpdateOrderPriorityRulesRequest = {
    rules: editableRules.value.map((rule) => ({
      key: rule.key,
      sku_values: parseSkuText(rule.skuText),
    })),
  }

  try {
    const rules = await priorityRulesApi.update(payload)
    applyRules(rules)
    feedback.value = 'Priority rules saved successfully'
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || 'Failed to save priority rules'
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  reloadRules()
})
</script>

<style scoped>
.priority-page {
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.priority-hero,
.rule-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.priority-hero {
  padding: 1.5rem 1.65rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.18), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 251, 235, 0.9));
}

.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.74rem;
  font-weight: 800;
  color: #0f766e;
}

h1,
h2 {
  margin: 0;
  color: #0f172a;
  font-weight: 900;
}

h1 {
  font-size: clamp(2rem, 4vw, 3.1rem);
}

h2 {
  font-size: 1.35rem;
}

.priority-copy {
  margin: 0.8rem 0 0;
  max-width: 72ch;
  color: #475569;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.primary-action,
.secondary-action {
  min-height: 3rem;
  padding: 0 1.1rem;
  border-radius: 16px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.primary-action {
  border: 0;
  background: linear-gradient(135deg, #0f766e, #115e59);
  color: #ffffff;
}

.secondary-action {
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: rgba(255, 255, 255, 0.95);
  color: #0f172a;
}

.primary-action:disabled,
.secondary-action:disabled {
  opacity: 0.65;
  cursor: wait;
}

.priority-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.rule-card {
  padding: 1.3rem;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.count-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  background: #fef3c7;
  color: #92400e;
  font-size: 0.84rem;
  font-weight: 800;
  white-space: nowrap;
}

.field {
  display: grid;
  gap: 0.45rem;
}

.field span {
  color: #334155;
  font-size: 0.92rem;
  font-weight: 800;
}

.rule-textarea {
  width: 100%;
  min-height: 220px;
  box-sizing: border-box;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  padding: 0.9rem 1rem;
  font: inherit;
  color: #0f172a;
  background: #ffffff;
  resize: vertical;
}

.helper-copy {
  margin: 0.7rem 0 0;
  color: #64748b;
  font-size: 0.86rem;
}

.feedback {
  margin: 0;
  padding: 0.95rem 1rem;
  border-radius: 16px;
  font-weight: 700;
}

.feedback--success {
  background: #dcfce7;
  color: #166534;
}

.feedback--error {
  background: #fee2e2;
  color: #b91c1c;
}

@media (max-width: 900px) {
  .priority-hero {
    flex-direction: column;
  }

  .priority-grid {
    grid-template-columns: 1fr;
  }
}
</style>
