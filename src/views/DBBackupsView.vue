<template>
  <div class="backup-page">
    <section class="backup-hero">
      <div>
        <p class="eyebrow">Database safety</p>
        <h1>DB Backups</h1>
        <p class="backup-copy">
          Create an on-demand PostgreSQL backup whenever you need one, then download the generated SQL file to your
          local system from this screen.
        </p>
      </div>

      <div class="hero-actions">
        <button @click="reloadStatus" :disabled="loading || running" class="secondary-action">
          {{ loading ? 'Refreshing...' : 'Refresh Status' }}
        </button>
        <button @click="runBackup" :disabled="running || !status?.enabled" class="primary-action">
          {{ running ? 'Running Backup...' : 'Run Backup Now' }}
        </button>
        <button
          @click="downloadLastBackup"
          :disabled="downloading || !canDownload"
          class="secondary-action"
        >
          {{ downloading ? 'Downloading...' : 'Download Latest Backup' }}
        </button>
      </div>
    </section>

    <section class="status-grid">
      <article class="status-card">
        <span class="status-label">Service</span>
        <strong :class="['status-value', status?.enabled ? 'status-ok' : 'status-bad']">
          {{ status?.enabled ? 'Enabled' : 'Disabled' }}
        </strong>
        <p class="status-meta">Manual local backup export status</p>
      </article>

      <article class="status-card">
        <span class="status-label">Mode</span>
        <strong class="status-value">Manual Backup</strong>
        <p class="status-meta">Automatic upload and scheduling removed</p>
      </article>

      <article class="status-card">
        <span class="status-label">Latest File</span>
        <strong class="status-value">{{ status?.last_backup?.file_name || 'Not created yet' }}</strong>
        <p class="status-meta">Generated with `pg_dump` when you run a backup</p>
      </article>

      <article class="status-card">
        <span class="status-label">Current State</span>
        <strong :class="['status-value', running ? 'status-warn' : 'status-ok']">
          {{ running ? 'Backup Running' : 'Idle' }}
        </strong>
        <p class="status-meta">{{ status?.local_backup_directory || './backups' }}</p>
      </article>
    </section>

    <section class="history-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Latest activity</p>
          <h2>Last backup result</h2>
        </div>
      </div>

      <div v-if="status?.last_backup" class="history-grid">
        <div class="history-row">
          <span>File</span>
          <strong>{{ status.last_backup.file_name || 'In progress' }}</strong>
        </div>
        <div class="history-row">
          <span>Started</span>
          <strong>{{ formatDateTime(status.last_backup.started_at) }}</strong>
        </div>
        <div class="history-row">
          <span>Completed</span>
          <strong>{{ formatDateTime(status.last_backup.completed_at) }}</strong>
        </div>
        <div class="history-row history-row--full">
          <span>Result</span>
          <strong :class="status.last_backup.error ? 'status-bad' : 'status-ok'">
            {{ status.last_backup.error ? status.last_backup.error : 'Backup created successfully and ready to download' }}
          </strong>
        </div>
      </div>
      <div v-else class="empty-state">
        No backup has been run from this app yet.
      </div>
    </section>

    <p v-if="feedback" class="feedback feedback--success">{{ feedback }}</p>
    <p v-if="errorMessage" class="feedback feedback--error">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { dbBackupsApi } from '@/api/dbBackups'
import type { DBBackupStatusResponse } from '@/types'

const loading = ref(false)
const running = ref(false)
const downloading = ref(false)
const feedback = ref('')
const errorMessage = ref('')
const status = ref<DBBackupStatusResponse | null>(null)

const canDownload = computed(() => Boolean(status.value?.last_backup?.file_name && !status.value?.last_backup?.error))

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Not available'
  return new Date(value).toLocaleString()
}

const reloadStatus = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    status.value = await dbBackupsApi.getStatus()
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || 'Failed to load backup status'
  } finally {
    loading.value = false
  }
}

const runBackup = async () => {
  running.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    const result = await dbBackupsApi.run()
    feedback.value = `Backup created successfully: ${result.file_name}`
    await reloadStatus()
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || 'Failed to run backup'
    await reloadStatus()
  } finally {
    running.value = false
  }
}

const downloadLastBackup = async () => {
  const fileName = status.value?.last_backup?.file_name
  if (!fileName) return

  downloading.value = true
  feedback.value = ''
  errorMessage.value = ''

  try {
    const blob = await dbBackupsApi.download(fileName)
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.URL.revokeObjectURL(url)
    feedback.value = `Backup downloaded: ${fileName}`
  } catch (error: any) {
    errorMessage.value = error.response?.data?.error || 'Failed to download backup'
  } finally {
    downloading.value = false
  }
}

onMounted(() => {
  reloadStatus()
})
</script>

<style scoped>
.backup-page {
  max-width: 1320px;
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}

.backup-hero,
.status-card,
.history-panel {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
}

.backup-hero {
  padding: 1.5rem 1.65rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.18), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(240, 249, 255, 0.9));
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
  font-size: clamp(2rem, 4vw, 3rem);
}

h2 {
  font-size: 1.3rem;
}

.backup-copy {
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
  color: #fff;
}

.secondary-action {
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #fff;
  color: #0f172a;
}

.primary-action:disabled,
.secondary-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.status-card,
.history-panel {
  padding: 1.35rem 1.4rem;
}

.status-label {
  display: block;
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.status-value {
  display: block;
  margin-top: 0.55rem;
  font-size: 1.35rem;
  color: #0f172a;
}

.status-meta {
  margin: 0.45rem 0 0;
  color: #475569;
  word-break: break-word;
}

.status-ok {
  color: #0f766e;
}

.status-bad {
  color: #b91c1c;
}

.status-warn {
  color: #b45309;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.85rem 1rem;
}

.history-row {
  display: grid;
  gap: 0.28rem;
  padding: 0.95rem 1rem;
  border-radius: 18px;
  background: rgba(248, 250, 252, 0.9);
}

.history-row--full {
  grid-column: 1 / -1;
}

.history-row span {
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.history-row strong {
  color: #0f172a;
  line-height: 1.5;
  word-break: break-word;
}

.empty-state,
.feedback {
  padding: 1rem 1.15rem;
  border-radius: 18px;
  font-weight: 700;
}

.empty-state {
  background: rgba(248, 250, 252, 0.9);
  color: #475569;
}

.feedback--success {
  background: rgba(220, 252, 231, 0.9);
  color: #166534;
}

.feedback--error {
  background: rgba(254, 226, 226, 0.94);
  color: #b91c1c;
}

@media (max-width: 900px) {
  .backup-hero {
    flex-direction: column;
  }

  .hero-actions {
    width: 100%;
  }

  .primary-action,
  .secondary-action {
    flex: 1 1 220px;
  }
}
</style>
