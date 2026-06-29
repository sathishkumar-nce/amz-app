<template>
  <div class="parser-page">
    <section class="parser-hero">
      <div>
        <p class="eyebrow">Amazon schedule helper</p>
        <h1>Schedule Weight Parser</h1>
        <p class="parser-copy">
          Paste raw text copied from the Amazon bulk schedule screen. We will detect each SKU and quantity,
          match the live SKU mapper CSV, and list the mapped weight row by row in the same order as the pasted content.
        </p>
      </div>

      <div class="hero-metrics">
        <article class="metric-card">
          <span>Total rows</span>
          <strong>{{ result?.total_items || 0 }}</strong>
        </article>
        <article class="metric-card">
          <span>Matched</span>
          <strong>{{ result?.matched_count || 0 }}</strong>
        </article>
        <article class="metric-card">
          <span>Total kg</span>
          <strong>{{ formatWeight(result?.total_weight_kg || 0) }}</strong>
        </article>
      </div>
    </section>

    <section class="parser-grid">
      <article class="input-card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Raw input</p>
            <h2>Paste Amazon Text</h2>
          </div>
          <div class="input-actions">
            <button class="ghost-button" :disabled="parsing || !rawText.trim()" @click="clearAll">Clear</button>
            <button class="primary-button" :disabled="parsing || !rawText.trim()" @click="parseText">
              {{ parsing ? 'Parsing...' : 'Extract SKU Weights' }}
            </button>
          </div>
        </div>

        <textarea
          v-model="rawText"
          class="raw-textarea"
          placeholder="Paste raw text from Amazon schedule screen here..."
          spellcheck="false"
        />

        <p v-if="errorMessage" class="feedback feedback--error">{{ errorMessage }}</p>
        <p v-else class="helper-copy">
          Expected pattern: lines that contain `SKU: MRC-MR-xxxx` followed by `Quantity: 1`, `2`, `3`, etc.
        </p>
      </article>

      <article class="results-card">
        <div class="section-head">
          <div>
            <p class="eyebrow">Parsed output</p>
            <h2>SKU, Quantity, Weight</h2>
          </div>
          <span v-if="result" class="parser-badge">{{ result.parser_version }}</span>
        </div>

        <div v-if="!result" class="empty-state">
          Paste the raw schedule text and run the parser to see the extracted rows here.
        </div>

        <div v-else class="results-shell">
          <div class="summary-strip">
            <div>
              <span>Matched rows</span>
              <strong>{{ result.matched_count }}</strong>
            </div>
            <div>
              <span>Unmatched rows</span>
              <strong>{{ result.unmatched_count }}</strong>
            </div>
            <div>
              <span>Input lines</span>
              <strong>{{ result.source_line_count }}</strong>
            </div>
          </div>

          <div class="table-wrap">
            <table class="result-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>SKU</th>
                  <th>Qty</th>
                  <th>Unit Weight (kg)</th>
                  <th>Total Weight (kg)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in result.items" :key="`${item.position}-${item.sku}`" :class="{ 'result-row--missing': !item.found }">
                  <td>{{ item.position }}</td>
                  <td>{{ item.sku }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>{{ item.found ? formatWeight(item.unit_weight_kg) : 'Not found' }}</td>
                  <td>{{ item.found ? formatWeight(item.total_weight_kg) : 'Not found' }}</td>
                  <td>
                    <span class="status-pill" :class="item.found ? 'status-pill--ok' : 'status-pill--warn'">
                      {{ item.found ? 'Mapped' : 'Missing in CSV' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { skuMapperApi } from '@/api/skuMapper'
import type { ScheduleWeightParseResponse } from '@/types'

const rawText = ref('')
const parsing = ref(false)
const errorMessage = ref('')
const result = ref<ScheduleWeightParseResponse | null>(null)

const formatWeight = (value: number) => value.toFixed(3)

const clearAll = () => {
  rawText.value = ''
  result.value = null
  errorMessage.value = ''
}

const parseText = async () => {
  if (!rawText.value.trim()) return

  parsing.value = true
  errorMessage.value = ''

  try {
    result.value = await skuMapperApi.parseScheduleWeights(rawText.value)
    if (!result.value.items.length) {
      errorMessage.value = 'No SKU and Quantity pairs were found in the pasted text.'
    }
  } catch (error: any) {
    result.value = null
    errorMessage.value = error.response?.data?.error || 'Unable to parse the pasted schedule text right now.'
  } finally {
    parsing.value = false
  }
}
</script>

<style scoped>
.parser-page {
  max-width: 1360px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.parser-hero,
.input-card,
.results-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 28px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.parser-hero {
  padding: 1.6rem;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 1rem;
  align-items: start;
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.18), transparent 36%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(236, 254, 255, 0.94));
}

.eyebrow {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.74rem;
  font-weight: 800;
  color: #0f766e;
}

h1,
h2 {
  margin: 0;
  color: #0f172a;
}

h1 {
  font-size: clamp(2rem, 3.8vw, 3.2rem);
  line-height: 1.02;
  font-weight: 900;
}

h2 {
  font-size: 1.3rem;
  font-weight: 900;
}

.parser-copy,
.helper-copy {
  margin: 0.8rem 0 0;
  color: #334155;
  line-height: 1.6;
}

.hero-metrics {
  display: grid;
  gap: 0.85rem;
}

.metric-card {
  border-radius: 22px;
  padding: 1rem 1.05rem;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(14, 165, 233, 0.16);
}

.metric-card span,
.summary-strip span {
  display: block;
  color: #334155;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 800;
}

.metric-card strong,
.summary-strip strong {
  display: block;
  margin-top: 0.45rem;
  font-size: 1.6rem;
  color: #0f172a;
}

.parser-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 1rem;
}

.input-card,
.results-card {
  padding: 1.35rem;
  min-width: 0;
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.input-actions {
  display: flex;
  gap: 0.7rem;
  flex-wrap: wrap;
}

.primary-button,
.ghost-button {
  border-radius: 16px;
  min-height: 3rem;
  padding: 0 1rem;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.primary-button {
  border: 0;
  color: #fff;
  background: linear-gradient(135deg, #0f766e, #0f4c81);
}

.ghost-button {
  border: 1px solid rgba(15, 23, 42, 0.12);
  color: #334155;
  background: #fff;
}

.primary-button:disabled,
.ghost-button:disabled {
  opacity: 0.65;
  cursor: wait;
}

.raw-textarea {
  width: 100%;
  min-height: 560px;
  border-radius: 22px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  padding: 1rem 1.05rem;
  font: inherit;
  color: #0f172a;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.98));
  resize: vertical;
}

.feedback {
  margin: 1rem 0 0;
  border-radius: 16px;
  padding: 0.9rem 1rem;
  font-weight: 700;
}

.feedback--error {
  background: rgba(254, 226, 226, 0.8);
  color: #b91c1c;
}

.parser-badge {
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  background: rgba(15, 118, 110, 0.16);
  color: #115e59;
  font-size: 0.8rem;
  font-weight: 800;
}

.results-shell {
  display: grid;
  gap: 1rem;
}

.summary-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
}

.summary-strip > div {
  border-radius: 18px;
  padding: 0.95rem 1rem;
  background: linear-gradient(135deg, rgba(239, 246, 255, 0.92), rgba(236, 253, 245, 0.88));
  border: 1px solid rgba(125, 211, 252, 0.22);
}

.empty-state {
  min-height: 420px;
  display: grid;
  place-items: center;
  text-align: center;
  color: #334155;
  border-radius: 24px;
  border: 1px dashed rgba(148, 163, 184, 0.4);
  background: rgba(248, 250, 252, 0.7);
  padding: 1.5rem;
}

.table-wrap {
  overflow-x: auto;
  border-radius: 22px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: #fff;
}

.result-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
}

.result-table th,
.result-table td {
  padding: 0.95rem 1rem;
  text-align: left;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
}

.result-table th {
  background: rgba(248, 250, 252, 0.95);
  color: #115e59;
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.result-table td {
  color: #0f172a;
  font-weight: 700;
}

.result-row--missing {
  background: rgba(254, 242, 242, 0.7);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.4rem 0.7rem;
  font-size: 0.78rem;
  font-weight: 800;
}

.status-pill--ok {
  background: rgba(220, 252, 231, 0.9);
  color: #166534;
}

.status-pill--warn {
  background: rgba(254, 226, 226, 0.92);
  color: #b91c1c;
}

@media (max-width: 980px) {
  .parser-hero,
  .parser-grid,
  .summary-strip {
    grid-template-columns: 1fr;
  }

  .section-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
