<template>
  <div class="mapper-page">
    <section class="mapper-hero">
      <div>
        <p class="eyebrow">SKU mapper</p>
        <h1>SKU Mapper File</h1>
        <p class="mapper-hero__copy">
          Review the currently active CSV mapper, download it for edits, and upload a fresh version to replace the live mapping file used by imports.
        </p>
      </div>
      <div class="mapper-hero__actions">
        <button @click="downloadCurrentFile" :disabled="downloading || !fileInfo" class="primary-action">
          {{ downloading ? 'Downloading...' : 'Download Current CSV' }}
        </button>
      </div>
    </section>

    <section class="mapper-grid">
      <article class="info-card">
        <p class="eyebrow">Current file</p>
        <h2>Active Mapper</h2>

        <div v-if="loading" class="empty-state">Loading SKU mapper info...</div>
        <div v-else-if="!fileInfo" class="empty-state">No SKU mapper file information available.</div>
        <dl v-else class="info-list">
          <div><dt>Uploaded file</dt><dd>{{ fileInfo.source_file_name || fileInfo.file_name }}</dd></div>
          <div><dt>Status</dt><dd>{{ fileInfo.status }}</dd></div>
          <div><dt>SKU count</dt><dd>{{ fileInfo.sku_count }}</dd></div>
          <div><dt>File size</dt><dd>{{ formatBytes(fileInfo.file_size) }}</dd></div>
          <div><dt>Updated at</dt><dd>{{ formatDate(fileInfo.updated_at) }}</dd></div>
          <div><dt>Uploaded at</dt><dd>{{ formatDate(fileInfo.uploaded_at || fileInfo.updated_at) }}</dd></div>
        </dl>
      </article>

      <article class="upload-card">
        <p class="eyebrow">Replace file</p>
        <h2>Upload Fresh CSV</h2>
        <p class="upload-copy">
          Uploading a new CSV validates it first and then replaces the active mapper file. The previous file is backed up automatically on the server.
        </p>

        <input
          ref="fileInput"
          class="visually-hidden-input"
          type="file"
          accept=".csv,text/csv"
          @change="handleFileChange"
        />

        <div class="upload-dropzone" @click="openFilePicker">
          <span>{{ selectedFile ? selectedFile.name : 'Choose a CSV file to upload' }}</span>
          <small>{{ selectedFile ? formatBytes(selectedFile.size) : 'Only .csv files, max 10 MB' }}</small>
        </div>

        <button type="button" class="choose-file-button" :disabled="uploading" @click="openFilePicker">
          {{ selectedFile ? 'Choose Different CSV' : 'Choose CSV File' }}
        </button>

        <button @click="uploadSelectedFile" :disabled="uploading || !selectedFile" class="upload-button">
          {{ uploading ? 'Validating and Replacing...' : 'Upload and Replace Mapper' }}
        </button>

        <p v-if="uploadMessage" class="feedback feedback--success">{{ uploadMessage }}</p>
        <p v-if="uploadError" class="feedback feedback--error">{{ uploadError }}</p>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { skuMapperApi } from '@/api/skuMapper'
import type { SKUMapperFileInfo } from '@/types'

const fileInput = ref<HTMLInputElement | null>(null)
const loading = ref(false)
const downloading = ref(false)
const uploading = ref(false)
const fileInfo = ref<SKUMapperFileInfo | null>(null)
const selectedFile = ref<File | null>(null)
const uploadMessage = ref('')
const uploadError = ref('')

const loadInfo = async () => {
  loading.value = true
  try {
    fileInfo.value = await skuMapperApi.getInfo()
  } finally {
    loading.value = false
  }
}

const formatDate = (value: string) => new Intl.DateTimeFormat('en-IN', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value))

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  selectedFile.value = target.files?.[0] || null
  uploadMessage.value = ''
  uploadError.value = ''
}

const openFilePicker = () => {
  if (uploading.value) return
  fileInput.value?.click()
}

const downloadCurrentFile = async () => {
  downloading.value = true
  try {
    const blob = await skuMapperApi.download()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileInfo.value?.file_name || 'sku-mapper.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } finally {
    downloading.value = false
  }
}

const uploadSelectedFile = async () => {
  if (!selectedFile.value) return

  uploading.value = true
  uploadMessage.value = ''
  uploadError.value = ''

  try {
    const result = await skuMapperApi.upload(selectedFile.value)
    uploadMessage.value = `${result.message}. Loaded ${result.sku_count} SKUs.`
    selectedFile.value = null
    await loadInfo()
  } catch (error: any) {
    uploadError.value = error.response?.data?.error || 'Upload failed'
  } finally {
    uploading.value = false
  }
}

onMounted(() => {
  loadInfo()
})
</script>

<style scoped>
.mapper-page {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.mapper-hero,
.info-card,
.upload-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.mapper-hero {
  padding: 1.5rem 1.65rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  background:
    radial-gradient(circle at top right, rgba(59, 130, 246, 0.16), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(239, 246, 255, 0.9));
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
  font-size: clamp(2rem, 3.8vw, 3.2rem);
  line-height: 1;
}

h2 {
  font-size: 1.45rem;
}

.mapper-hero__copy,
.upload-copy {
  margin: 0.8rem 0 0;
  color: #334155;
  max-width: 60ch;
}

.primary-action,
.upload-button {
  border: 0;
  cursor: pointer;
  font: inherit;
  min-height: 3rem;
  border-radius: 16px;
  font-weight: 800;
}

.primary-action {
  padding: 0 1.1rem;
  background: #0f766e;
  color: #ffffff;
}

.upload-button {
  width: 100%;
  background: linear-gradient(135deg, #1d4ed8, #0f766e);
  color: #ffffff;
}

.primary-action:disabled,
.upload-button:disabled {
  opacity: 0.65;
  cursor: wait;
}

.mapper-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.info-card,
.upload-card {
  padding: 1.35rem;
}

.info-list {
  margin: 1rem 0 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.info-list div {
  padding: 0.9rem 1rem;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.info-list__wide {
  grid-column: 1 / -1;
}

dt {
  color: #475569;
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

dd {
  margin: 0.35rem 0 0;
  color: #0f172a;
  font-weight: 700;
  word-break: break-word;
}

.upload-dropzone {
  margin: 1rem 0;
  display: grid;
  gap: 0.35rem;
  padding: 1.2rem;
  border-radius: 20px;
  border: 1px dashed rgba(59, 130, 246, 0.45);
  background: linear-gradient(180deg, #f8fbff, #eff6ff);
  cursor: pointer;
}

.upload-dropzone span {
  color: #0f172a;
  font-weight: 800;
}

.upload-dropzone small {
  color: #475569;
}

.visually-hidden-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.choose-file-button {
  width: 100%;
  min-height: 2.9rem;
  margin-bottom: 0.8rem;
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #ffffff;
  color: #0f172a;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.choose-file-button:disabled {
  opacity: 0.65;
  cursor: wait;
}

.feedback {
  margin: 0.85rem 0 0;
  font-weight: 700;
}

.feedback--success {
  color: #166534;
}

.feedback--error {
  color: #b91c1c;
}

.empty-state {
  margin-top: 1rem;
  color: #334155;
  font-weight: 700;
}

@media (max-width: 900px) {
  .mapper-hero,
  .mapper-grid,
  .info-list {
    grid-template-columns: 1fr;
  }
}
</style>
