<template>
  <dialog
    ref="dialog"
    class="task-dialog"
    aria-labelledby="task-dialog-title"
    @cancel.prevent="close"
  >
    <header class="dialog-header">
      <div>
        <p class="task-eyebrow">
          {{ task ? `TASK #${task.id}` : 'NEW TASK' }}
          <span v-if="task?.archived_at">· Archived</span>
        </p>
        <h2 id="task-dialog-title">
          {{ task ? 'Task details' : 'Create a task' }}
        </h2>
      </div>
      <button
        type="button"
        class="icon-button"
        :disabled="busy"
        aria-label="Close task"
        @click="close"
      >
        <XMarkIcon />
      </button>
    </header>
    <p v-if="error" class="task-notice error" role="alert">{{ error }}</p>
    <p v-if="notice" class="task-notice" role="status">{{ notice }}</p>
    <p v-if="task && task.version !== form.version" class="task-notice warning">
      This task was edited in another session. Your draft is preserved. Reload
      before saving.
    </p>
    <form class="task-form" @submit.prevent="save">
      <fieldset :disabled="busy || !!task?.archived_at">
        <div class="form-main">
          <label
            >Title<input
              v-model.trim="form.title"
              aria-label="Task title"
              maxlength="200"
              required
              placeholder="What needs to be done?" /></label
          ><label
            >Description<textarea
              v-model="form.description"
              aria-label="Task description"
              rows="7"
              maxlength="20000"
              placeholder="Add context, requirements, or a checklist…"
            />
          </label>
        </div>
        <div class="form-meta">
          <label
            >Status<select v-model="form.status" aria-label="Task status">
              <option
                v-for="status in taskStatuses"
                :key="status.id"
                :value="status.id"
              >
                {{ status.label }}
              </option>
            </select></label
          ><label
            >Swimlane<select
              v-model="form.swimlane_id"
              aria-label="Task swimlane"
              required
            >
              <option v-for="lane in swimlanes" :key="lane.id" :value="lane.id">
                {{ lane.name }}
              </option>
            </select></label
          ><label
            >Priority<select v-model="form.priority" aria-label="Task priority">
              <option
                v-for="priority in taskPriorities"
                :key="priority"
                :value="priority"
              >
                {{ priority }}
              </option>
            </select></label
          ><label
            >Due date<input
              v-model="dueDate"
              aria-label="Task due date"
              type="date"
          /></label>
          <div>
            <span class="field-label" id="assignee-label">Assignees</span>
            <div
              class="assignee-picker"
              role="group"
              aria-labelledby="assignee-label"
            >
              <label
                v-for="member in members"
                :key="member.id"
                class="assignee-option"
                ><input
                  v-model="form.assignee_ids"
                  type="checkbox"
                  :value="member.id"
                  :aria-label="`Assign ${member.username}`"
                /><span class="task-avatar">{{
                  taskInitials(member.username)
                }}</span
                >{{ member.username }}</label
              >
              <p v-if="!members.length">No users available.</p>
            </div>
            <small>Leave unchecked to keep the task unassigned.</small>
          </div>
        </div>
      </fieldset>
      <footer class="task-form-actions">
        <button v-if="!task?.archived_at" class="primary" :disabled="busy">
          {{
            saving ? 'Saving…' : task ? 'Save changes' : 'Create task'
          }}</button
        ><button v-if="task" type="button" :disabled="busy" @click="reload">
          Reload task</button
        ><button
          v-if="task"
          type="button"
          :disabled="busy || dirty"
          @click="archive"
        >
          {{ task.archived_at ? 'Restore task' : 'Archive task' }}</button
        ><span v-if="task" class="task-muted"
          >Updated {{ taskTimestamp(task.updated_at) }} ·
          {{ task.updated_by }}</span
        >
      </footer>
    </form>
    <div v-if="!task" class="attachment-intro">
      <PaperClipIcon />
      <div>
        <strong>Images, files and links</strong>
        <p>Create the task, then attach files, links and comments here.</p>
      </div>
    </div>
    <template v-else>
      <section class="task-section">
        <div class="section-title">
          <h3>
            Attachments <span>{{ task.attachments.length }}</span>
          </h3>
          <span class="task-muted"
            >Up to 10 MB per file · {{ maxAttachments }} attachments per
            task</span
          >
        </div>
        <div class="attachment-grid">
          <article
            v-for="attachment in task.attachments"
            :key="attachment.id"
            class="attachment-card"
          >
            <KanbanImage
              v-if="attachment.has_preview"
              :task-id="task.id"
              :attachment-id="attachment.id"
              :name="attachment.name"
            />
            <div class="attachment-info">
              <a
                v-if="attachment.kind === 'link'"
                :href="attachment.url"
                target="_blank"
                rel="noopener noreferrer"
                ><LinkIcon />{{ attachment.name }}</a
              ><button
                v-else
                type="button"
                class="file-download"
                :disabled="busy"
                @click="download(attachment)"
              >
                <PaperClipIcon />{{ attachment.name }}
              </button>
              <p>
                {{
                  attachment.kind === 'file'
                    ? fileSize(attachment.size)
                    : attachment.url
                }}
              </p>
              <small
                >{{ attachment.created_by }} ·
                {{ taskTimestamp(attachment.created_at) }}</small
              ><button
                type="button"
                class="remove-link"
                :disabled="busy || !!task.archived_at"
                :aria-label="`Remove attachment ${attachment.name}`"
                @click="removeAttachment(attachment)"
              >
                Remove
              </button>
            </div>
          </article>
        </div>
        <p v-if="!task.attachments.length" class="task-muted">
          No attachments yet.
        </p>
        <div v-if="!task.archived_at" class="attachment-add">
          <label class="file-upload"
            ><input
              ref="fileInput"
              type="file"
              multiple
              :disabled="busy"
              aria-label="Attach files or images"
              @change="upload"
            /><PaperClipIcon />{{
              uploading ? 'Uploading…' : 'Attach images or files'
            }}</label
          ><span class="task-muted"
            >Multiple files are uploaded one at a time.</span
          >
        </div>
        <form
          v-if="!task.archived_at"
          class="link-form"
          @submit.prevent="addLink"
        >
          <label
            >Link URL<input
              v-model.trim="linkURL"
              type="url"
              aria-label="Attachment link URL"
              placeholder="https://…"
              required
              :disabled="busy"
              maxlength="2048" /></label
          ><label
            >Link title<input
              v-model.trim="linkName"
              aria-label="Attachment link title"
              placeholder="Optional title"
              maxlength="200"
              :disabled="busy" /></label
          ><button :disabled="busy || !linkURL">Add link</button>
        </form>
      </section>
      <div class="discussion-grid">
        <section class="task-section">
          <h3>
            Comments <span>{{ task.comment_count }}</span>
          </h3>
          <form class="comment-form" @submit.prevent="addComment">
            <label class="sr-only" for="task-comment">Add a comment</label
            ><textarea
              id="task-comment"
              v-model="comment"
              rows="3"
              maxlength="5000"
              placeholder="Share an update with the team…"
              :disabled="busy"
            /><button :disabled="busy || !comment.trim()">Add comment</button>
          </form>
          <article
            v-for="entry in task.comments || []"
            :key="entry.id"
            class="task-comment"
          >
            <div>
              <strong>{{ entry.created_by }}</strong
              ><time>{{ taskTimestamp(entry.created_at) }}</time>
            </div>
            <p>{{ entry.body }}</p>
          </article>
          <p
            v-if="task.comment_count > (task.comments?.length || 0)"
            class="task-muted"
          >
            Showing the latest 100 comments.
          </p>
        </section>
        <section class="task-section">
          <h3>Activity</h3>
          <ol class="task-activity">
            <li v-for="entry in task.activity || []" :key="entry.id">
              <strong>{{ entry.actor }}</strong> {{ entry.message
              }}<time>{{ taskTimestamp(entry.created_at) }}</time>
            </li>
          </ol>
          <small class="task-muted"
            >Latest 50 updates · Times shown in IST</small
          >
        </section>
      </div>
    </template>
  </dialog>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { XMarkIcon, PaperClipIcon, LinkIcon } from '@heroicons/vue/24/outline'
import { kanbanApi } from '@/api/kanban'
import { courierError } from '@/utils/courier'
import {
  downloadTaskFile,
  fileSize,
  taskInitials,
  taskTimestamp,
} from '@/utils/kanban'
import { taskPriorities, taskStatuses } from '@/types/kanban'
import type {
  BoardMember,
  BoardTask,
  Swimlane,
  TaskAttachment,
  TaskInput,
  TaskStatus,
} from '@/types/kanban'
import KanbanImage from '@/components/KanbanImage.vue'
const props = defineProps<{
  initial: BoardTask | null
  members: BoardMember[]
  swimlanes: Swimlane[]
  defaultSwimlane: number
  defaultStatus: TaskStatus
  maxAttachments: number
}>()
const emit = defineEmits<{ close: []; updated: [task: BoardTask] }>()
const dialog = ref<HTMLDialogElement | null>(null),
  fileInput = ref<HTMLInputElement | null>(null)
const task = ref<BoardTask | null>(props.initial)
const form = reactive<TaskInput>({
  title: '',
  description: '',
  status: props.defaultStatus,
  priority: 'normal',
  swimlane_id: props.defaultSwimlane,
  due_date: null,
  assignee_ids: [],
  version: 0,
})
const dueDate = computed({
  get: () => form.due_date || '',
  set: (value: string) => {
    form.due_date = value || null
  },
})
const baseline = ref(''),
  saving = ref(false),
  working = ref(false),
  uploading = ref(false),
  error = ref(''),
  notice = ref(''),
  linkURL = ref(''),
  linkName = ref(''),
  comment = ref('')
const busy = computed(() => saving.value || working.value || uploading.value)
const dirty = computed(() => JSON.stringify(form) !== baseline.value)
function hydrate(value: BoardTask | null) {
  if (value)
    Object.assign(form, {
      title: value.title,
      description: value.description,
      status: value.status,
      priority: value.priority,
      swimlane_id: value.swimlane_id,
      due_date: value.due_date,
      assignee_ids: value.assignees.map((m) => m.id),
      version: value.version,
    })
  baseline.value = JSON.stringify(form)
}
function close() {
  if (busy.value) return
  if (
    (dirty.value || comment.value.trim() || linkURL.value.trim()) &&
    !window.confirm('Discard unsaved task details or draft text?')
  )
    return
  emit('close')
}
async function refreshDetails() {
  if (!task.value) return
  task.value = await kanbanApi.task(task.value.id)
  emit('updated', task.value)
}
async function save() {
  if (busy.value) return
  saving.value = true
  error.value = ''
  notice.value = ''
  try {
    task.value = await kanbanApi.save(task.value?.id || null, {
      ...form,
      assignee_ids: [...form.assignee_ids],
    })
    hydrate(task.value)
    emit('updated', task.value)
    notice.value = 'Task saved. You can add attachments and comments below.'
  } catch (err) {
    error.value = await courierError(err)
  } finally {
    saving.value = false
  }
}
async function reload() {
  if (!task.value || busy.value) return
  if (
    dirty.value &&
    !window.confirm('Reload this task and discard unsaved detail changes?')
  )
    return
  working.value = true
  error.value = ''
  try {
    await refreshDetails()
    hydrate(task.value)
    notice.value = 'Latest task loaded.'
  } catch (err) {
    error.value = await courierError(err)
  } finally {
    working.value = false
  }
}
async function archive() {
  if (!task.value || busy.value || dirty.value) return
  working.value = true
  error.value = ''
  try {
    task.value = await kanbanApi.archive(
      task.value,
      !task.value.archived_at,
      form.version,
    )
    hydrate(task.value)
    emit('updated', task.value)
    notice.value = task.value.archived_at
      ? 'Task archived. You can restore it at any time.'
      : 'Task restored.'
  } catch (err) {
    error.value = await courierError(err)
  } finally {
    working.value = false
  }
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!task.value || busy.value || !files.length) return
  uploading.value = true
  error.value = ''
  notice.value = ''
  const failed: string[] = []
  let count = 0
  try {
    for (const file of files) {
      if (file.size > 10485760 || !file.size) {
        failed.push(`${file.name}: choose a non-empty file up to 10 MB`)
        continue
      }
      try {
        await kanbanApi.upload(task.value.id, file)
        count++
      } catch (err) {
        failed.push(`${file.name}: ${await courierError(err)}`)
      }
    }
    await refreshDetails()
    notice.value = count ? `${count} file(s) attached.` : ''
    error.value = failed.join('\n')
  } catch (err) {
    error.value = await courierError(err)
  } finally {
    uploading.value = false
    input.value = ''
  }
}
async function addLink() {
  if (!task.value || busy.value) return
  working.value = true
  error.value = ''
  try {
    await kanbanApi.link(task.value.id, linkName.value, linkURL.value)
    linkURL.value = ''
    linkName.value = ''
    await refreshDetails()
    notice.value = 'Link attached.'
  } catch (err) {
    error.value = await courierError(err)
  } finally {
    working.value = false
  }
}
async function addComment() {
  if (!task.value || busy.value || !comment.value.trim()) return
  working.value = true
  error.value = ''
  try {
    await kanbanApi.comment(task.value.id, comment.value.trim())
    comment.value = ''
    await refreshDetails()
    notice.value = 'Comment added.'
  } catch (err) {
    error.value = await courierError(err)
  } finally {
    working.value = false
  }
}
async function download(attachment: TaskAttachment) {
  if (!task.value || busy.value) return
  working.value = true
  error.value = ''
  try {
    downloadTaskFile(
      await kanbanApi.file(task.value.id, attachment.id),
      attachment.name,
    )
  } catch (err) {
    error.value = await courierError(err)
  } finally {
    working.value = false
  }
}
async function removeAttachment(attachment: TaskAttachment) {
  if (!task.value || busy.value) return
  if (!window.confirm(`Remove attachment “${attachment.name}”?`)) return
  working.value = true
  error.value = ''
  try {
    await kanbanApi.removeAttachment(task.value.id, attachment.id)
    await refreshDetails()
    notice.value = 'Attachment removed.'
  } catch (err) {
    error.value = await courierError(err)
  } finally {
    working.value = false
  }
}
onMounted(() => {
  hydrate(task.value)
  dialog.value?.showModal()
})
</script>
<style scoped>
.task-dialog {
  border: 0;
  border-radius: 22px;
  width: min(1080px, calc(100vw - 2rem));
  max-height: 92vh;
  padding: 1.6rem;
  color: #0f172a;
  box-shadow: 0 24px 90px #0f172a50;
}
.task-dialog::backdrop {
  background: #0f172a80;
  backdrop-filter: blur(2px);
}
.dialog-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  margin-bottom: 1.4rem;
}
.task-eyebrow {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: #0f766e;
  margin: 0 0 0.5rem;
}
h2 {
  font-size: 1.6rem;
  margin: 0;
  letter-spacing: -0.03em;
}
h3 {
  font-size: 1rem;
  margin: 0 0 1rem;
}
h3 span {
  color: #94a3b8;
  margin-left: 0.3rem;
}
button,
input,
select,
textarea {
  font: inherit;
  box-sizing: border-box;
}
button {
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  padding: 0.65rem 0.85rem;
  border-radius: 9px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
}
button:disabled,
input:disabled {
  opacity: 0.5;
  cursor: default;
}
.primary {
  background: #0f766e;
  color: white;
  border-color: #0f766e;
}
.icon-button {
  padding: 0.35rem;
  border: 0;
}
.icon-button svg {
  width: 24px;
  height: 24px;
}
.task-form fieldset {
  margin: 0;
  border: 0;
  padding: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px;
  gap: 1.6rem;
  min-width: 0;
}
.form-main,
.form-meta {
  display: grid;
  align-content: start;
  gap: 1rem;
}
.form-meta {
  border-left: 1px solid #e2e8f0;
  padding-left: 1.3rem;
}
label,
.field-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  display: grid;
  gap: 0.45rem;
}
input,
select,
textarea {
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  padding: 0.7rem 0.8rem;
  min-width: 0;
  width: 100%;
  background: white;
  color: #0f172a;
}
textarea {
  resize: vertical;
  line-height: 1.6;
}
.task-form-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem;
  margin-top: 1.1rem;
}
.task-muted,
small {
  color: #64748b;
  font-size: 0.72rem;
  line-height: 1.6;
}
.assignee-picker {
  max-height: 180px;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
  padding: 0.5rem;
  margin-top: 0.4rem;
}
.assignee-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem;
  font-weight: 500;
}
.assignee-option input {
  width: 15px;
  height: 15px;
  accent-color: #0f766e;
}
.task-avatar {
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background: #e0f2f1;
  color: #0f766e;
  display: inline-grid;
  place-items: center;
  font-size: 0.6rem;
  font-weight: 800;
  flex-shrink: 0;
}
.task-section {
  padding-top: 1.5rem;
  margin-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
  min-width: 0;
}
.section-title {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  flex-wrap: wrap;
}
.attachment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.8rem;
}
.attachment-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
  min-width: 0;
}
.attachment-card :deep(.task-image) {
  border-radius: 0;
}
.attachment-info {
  padding: 0.8rem;
}
.attachment-info a,
.file-download {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  font-weight: 700;
  font-size: 0.8rem;
  color: #0f766e;
  text-align: left;
  overflow-wrap: anywhere;
  text-decoration: none;
}
.attachment-info svg {
  width: 16px;
  min-width: 16px;
  height: 16px;
}
.file-download {
  padding: 0;
  border: 0;
  background: none;
}
.attachment-info p {
  font-size: 0.72rem;
  color: #64748b;
  overflow-wrap: anywhere;
  margin: 0.4rem 0;
}
.remove-link {
  border: 0;
  background: none;
  color: #b91c1c;
  display: block;
  padding: 0.4rem 0 0;
  font-size: 0.7rem;
}
.attachment-add {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.8rem;
  margin-top: 1rem;
}
.file-upload {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px dashed #94a3b8;
  border-radius: 9px;
  padding: 0.7rem;
  color: #0f766e;
  cursor: pointer;
  overflow: hidden;
}
.file-upload input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.file-upload svg {
  width: 18px;
  height: 18px;
}
.link-form {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 0.7rem;
  align-items: end;
  margin-top: 1rem;
}
.discussion-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 2rem;
}
.comment-form {
  display: grid;
  gap: 0.5rem;
}
.comment-form button {
  justify-self: start;
}
.task-comment {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0.8rem;
  margin-top: 0.8rem;
  font-size: 0.8rem;
}
.task-comment > div {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
.task-comment time,
.task-activity time {
  font-size: 0.65rem;
  color: #64748b;
}
.task-comment p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.6;
  margin: 0.6rem 0 0;
}
.task-activity {
  list-style: none;
  padding: 0;
  margin: 0;
}
.task-activity li {
  padding: 0 0 1rem 0.8rem;
  border-left: 2px solid #e2e8f0;
  font-size: 0.75rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.task-activity time {
  display: block;
}
.task-notice {
  background: #f0fdfa;
  color: #0f766e;
  padding: 0.9rem;
  border-radius: 9px;
  font-size: 0.8rem;
  line-height: 1.6;
  white-space: pre-wrap;
}
.task-notice.error {
  background: #fef2f2;
  color: #b91c1c;
}
.task-notice.warning {
  background: #fffbeb;
  color: #92400e;
}
.attachment-intro {
  display: flex;
  gap: 0.8rem;
  background: #f8fafc;
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1.5rem;
  font-size: 0.8rem;
}
.attachment-intro svg {
  width: 22px;
  height: 22px;
  color: #64748b;
}
.attachment-intro p {
  color: #64748b;
  margin: 0.4rem 0 0;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
@media (max-width: 700px) {
  .task-dialog {
    padding: 1.1rem;
    width: calc(100vw - 1rem);
    max-height: 95vh;
  }
  .task-form fieldset,
  .discussion-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  .form-meta {
    border: 0;
    padding: 0;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .form-meta > div {
    grid-column: 1/-1;
  }
  .link-form {
    grid-template-columns: 1fr;
  }
  .task-form-actions .task-muted {
    width: 100%;
  }
}
</style>
