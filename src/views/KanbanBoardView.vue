<template>
  <main class="kanban-page">
    <header class="board-hero">
      <div>
        <p class="board-eyebrow"><Squares2X2Icon /> Shared workspace</p>
        <h1>{{ board?.name || 'Team Board' }}</h1>
        <p>Plan the work. Share ownership. Keep the whole team moving.</p>
      </div>
      <div class="hero-actions">
        <div
          class="team-avatars"
          :aria-label="`${board?.members.length || 0} team members`"
        >
          <span
            v-for="member in board?.members.slice(0, 5) || []"
            :key="member.id"
            :title="member.username"
            class="avatar"
            >{{ taskInitials(member.username) }}</span
          ><span v-if="(board?.members.length || 0) > 5" class="avatar"
            >+{{ (board?.members.length || 0) - 5 }}</span
          >
        </div>
        <span class="shared-label"><UserGroupIcon />Everyone has access</span
        ><button
          class="primary"
          :disabled="!board || loading || mutating"
          @click="createTask()"
        >
          <PlusIcon />New task
        </button>
      </div>
    </header>
    <section class="board-toolbar" aria-label="Board filters">
      <form class="search-form" @submit.prevent="applyFilters">
        <MagnifyingGlassIcon /><input
          v-model.trim="filters.search"
          aria-label="Search tasks"
          placeholder="Search title, description or task #"
          maxlength="200"
        /><button :disabled="loading">Search</button>
      </form>
      <label class="sr-only" for="board-assignee">Filter by assignee</label
      ><select
        id="board-assignee"
        v-model="filters.assignee_id"
        :disabled="loading"
        @change="applyFilters"
      >
        <option value="">All assignees</option>
        <option v-if="auth.user" :value="auth.user.id">Assigned to me</option>
        <option value="unassigned">Unassigned</option>
        <option
          v-for="member in board?.members || []"
          :key="member.id"
          :value="member.id"
        >
          {{ member.username }}
        </option></select
      ><label class="sr-only" for="board-priority">Filter by priority</label
      ><select
        id="board-priority"
        v-model="filters.priority"
        :disabled="loading"
        @change="applyFilters"
      >
        <option value="">All priorities</option>
        <option
          v-for="priority in taskPriorities"
          :key="priority"
          :value="priority"
        >
          {{ priority }}
        </option></select
      ><button
        :class="{ active: filters.archived }"
        :disabled="loading || mutating"
        @click="toggleArchive"
      >
        <ArchiveBoxIcon />{{ filters.archived ? 'Archived tasks' : 'Archive' }}
      </button>
      <div class="toolbar-spacer" />
      <button :disabled="loading || mutating" @click="openSwimlanes">
        <AdjustmentsHorizontalIcon />Swimlanes</button
      ><button
        :disabled="loading || mutating"
        aria-label="Refresh board"
        @click="load()"
      >
        <ArrowPathIcon :class="{ spin: loading }" />
      </button>
    </section>
    <p v-if="error" class="board-notice error" role="alert">{{ error }}</p>
    <p v-if="notice" class="board-notice" role="status">{{ notice }}</p>
    <div v-if="board" class="board-meta">
      <span
        >{{ board.total }}
        {{ filters.archived ? 'archived' : 'active' }} task(s){{
          filtered ? ' matching filters' : ''
        }}
        · {{ board.swimlanes.length }} swimlane(s)</span
      ><button v-if="filtered" :disabled="loading" @click="clearFilters">
        Clear filters</button
      ><span v-if="mutating" role="status">Saving board changes…</span
      ><span v-else-if="loading" role="status">Refreshing…</span
      ><span v-else class="sync-note"
        >Shared with all users · Refreshes every 30s while idle</span
      >
    </div>
    <p v-if="board && board.total > board.limit" class="board-notice warning">
      Showing {{ board.limit }} of {{ board.total }} tasks. Narrow your search
      or assignee filters to find more.
    </p>
    <p v-if="!board && loading" class="board-loading" role="status">
      Loading the shared board…
    </p>
    <section
      v-if="board"
      class="board-scroll"
      tabindex="0"
      aria-label="Task board. Scroll horizontally for all five statuses."
    >
      <div class="board-grid">
        <div class="column-headings">
          <div
            v-for="status in taskStatuses"
            :key="status.id"
            class="column-heading"
          >
            <i :style="{ background: status.color }" />
            <h2>{{ status.label }}</h2>
            <span>{{ countStatus(status.id) }}</span
            ><button
              v-if="!filters.archived"
              :aria-label="`Add task to ${status.label}`"
              :disabled="mutating"
              @click="createTask(undefined, status.id)"
            >
              <PlusIcon />
            </button>
          </div>
        </div>
        <section
          v-for="lane in board.swimlanes"
          :key="lane.id"
          class="swimlane"
          :aria-label="`Swimlane ${lane.name}`"
        >
          <header class="swimlane-header">
            <button
              :aria-expanded="!collapsed.has(lane.id)"
              @click="toggleLane(lane.id)"
            >
              <ChevronDownIcon
                :class="{ collapsed: collapsed.has(lane.id) }"
              /><strong>{{ lane.name }}</strong
              ><span>{{ countLane(lane.id) }} task(s)</span></button
            ><button
              v-if="!filters.archived"
              :aria-label="`Add task in ${lane.name}`"
              :disabled="mutating"
              @click="createTask(lane.id)"
            >
              <PlusIcon />Add task
            </button>
          </header>
          <div v-if="!collapsed.has(lane.id)" class="swimlane-cells">
            <div
              v-for="status in taskStatuses"
              :key="status.id"
              :class="[
                'task-cell',
                { 'drag-over': dropCell === `${lane.id}-${status.id}` },
              ]"
              :data-swimlane="lane.id"
              :data-status="status.id"
              :aria-label="`${lane.name}, ${status.label}`"
              @dragover.prevent="dragOver(lane.id, status.id)"
              @drop.prevent="drop($event, lane.id, status.id)"
            >
              <article
                v-for="task in cellTasks(lane.id, status.id)"
                :key="task.id"
                :class="[
                  'task-card',
                  {
                    'is-dragging': dragging?.id === task.id,
                    'is-overdue': taskOverdue(task),
                  },
                ]"
                :draggable="!mutating && !filters.archived"
                :data-task-id="task.id"
                @dragstart="startDrag($event, task)"
                @dragend="endDrag"
                @dragover.prevent.stop="dragOver(lane.id, status.id)"
                @drop.prevent.stop="drop($event, lane.id, status.id, task.id)"
              >
                <button
                  class="task-open"
                  :aria-label="`Open task ${task.title}`"
                  @click="openTask(task.id)"
                >
                  <KanbanImage
                    v-if="task.attachments.find((a) => a.has_preview)"
                    :task-id="task.id"
                    :attachment-id="
                      task.attachments.find((a) => a.has_preview)!.id
                    "
                    :name="task.attachments.find((a) => a.has_preview)!.name"
                  />
                  <div class="card-labels">
                    <span :class="['priority', task.priority]">{{
                      task.priority
                    }}</span
                    ><span class="task-number">#{{ task.id }}</span>
                  </div>
                  <h3>{{ task.title }}</h3>
                  <p v-if="task.description" class="card-description">
                    {{ task.description }}
                  </p>
                  <div
                    v-if="task.due_date"
                    :class="['due-date', { overdue: taskOverdue(task) }]"
                  >
                    <CalendarDaysIcon />{{ taskDate(task.due_date)
                    }}<span v-if="taskOverdue(task)">· Overdue</span>
                  </div>
                  <footer class="card-footer">
                    <div class="card-counts">
                      <span
                        v-if="task.attachments.length"
                        :aria-label="`${task.attachments.length} attachments`"
                        ><PaperClipIcon />{{ task.attachments.length }}</span
                      ><span
                        v-if="task.comment_count"
                        :aria-label="`${task.comment_count} comments`"
                        ><ChatBubbleLeftEllipsisIcon />{{
                          task.comment_count
                        }}</span
                      ><span v-if="!task.assignees.length" class="unassigned"
                        >Unassigned</span
                      >
                    </div>
                    <div class="card-assignees">
                      <span
                        v-for="member in task.assignees.slice(0, 3)"
                        :key="member.id"
                        class="avatar small"
                        :title="member.username"
                        >{{ taskInitials(member.username) }}</span
                      ><span
                        v-if="task.assignees.length > 3"
                        class="avatar small"
                        >+{{ task.assignees.length - 3 }}</span
                      >
                    </div>
                  </footer>
                </button>
                <div v-if="!filters.archived" class="card-move">
                  <label class="sr-only" :for="`move-${task.id}`"
                    >Move task {{ task.title }}</label
                  ><select
                    :id="`move-${task.id}`"
                    :value="task.status"
                    :disabled="mutating"
                    @change="quickMove(task, $event)"
                  >
                    <option
                      v-for="option in taskStatuses"
                      :key="option.id"
                      :value="option.id"
                    >
                      {{ option.label }}
                    </option></select
                  ><button
                    class="card-edit"
                    :aria-label="`Edit task ${task.title}`"
                    @click="openTask(task.id)"
                  >
                    Details →
                  </button>
                </div>
              </article>
              <button
                v-if="!filters.archived"
                class="cell-add"
                :disabled="mutating"
                @click="createTask(lane.id, status.id)"
              >
                <PlusIcon />{{
                  cellTasks(lane.id, status.id).length
                    ? 'Add task'
                    : 'Create a task'
                }}
              </button>
              <p
                v-else-if="!cellTasks(lane.id, status.id).length"
                class="empty-cell"
              >
                No archived tasks
              </p>
            </div>
          </div>
        </section>
      </div>
    </section>
    <p v-if="board" class="board-help">
      Drag cards to change status, swimlane or order. On mobile, use each card's
      status selector or open Details to change its swimlane.
    </p>
    <KanbanTaskDialog
      v-if="editor && board"
      :initial="selected"
      :members="board.members"
      :swimlanes="board.swimlanes"
      :default-swimlane="newLane"
      :default-status="newStatus"
      :max-attachments="board.max_attachments"
      @close="closeEditor"
      @updated="taskUpdated"
    />
    <dialog
      ref="swimlaneDialog"
      class="swimlane-dialog"
      aria-labelledby="swimlane-title"
      @cancel.prevent="closeSwimlanes"
    >
      <header>
        <div>
          <p class="board-eyebrow">Categories across the board</p>
          <h2 id="swimlane-title">Manage swimlanes</h2>
        </div>
        <button
          :disabled="laneBusy"
          aria-label="Close swimlanes"
          @click="closeSwimlanes"
        >
          <XMarkIcon />
        </button>
      </header>
      <p class="lane-helper">
        Swimlanes group tasks across all five statuses. Everyone can create and
        manage categories.
      </p>
      <p v-if="laneError" class="board-notice error" role="alert">
        {{ laneError }}
      </p>
      <div
        v-for="(lane, index) in board?.swimlanes || []"
        :key="lane.id"
        class="lane-editor"
      >
        <label class="sr-only" :for="`lane-name-${lane.id}`"
          >Swimlane name {{ lane.name }}</label
        ><input
          :id="`lane-name-${lane.id}`"
          v-model.trim="laneNames[lane.id]"
          maxlength="80"
          :disabled="laneBusy"
        /><button
          :disabled="laneBusy || !laneNames[lane.id]"
          :aria-label="`Save swimlane ${lane.name}`"
          @click="saveLane(lane.id)"
        >
          Save</button
        ><button
          :disabled="laneBusy || index === 0"
          :aria-label="`Move ${lane.name} up`"
          @click="moveLane(index, -1)"
        >
          ↑</button
        ><button
          :disabled="laneBusy || index === (board?.swimlanes.length || 0) - 1"
          :aria-label="`Move ${lane.name} down`"
          @click="moveLane(index, 1)"
        >
          ↓</button
        ><button
          :disabled="laneBusy || lane.is_default"
          class="danger"
          :aria-label="`Delete swimlane ${lane.name}`"
          @click="deleteLane(lane.id)"
        >
          Remove
        </button>
      </div>
      <form class="new-lane" @submit.prevent="saveLane(null)">
        <label
          >New swimlane<input
            v-model.trim="laneName"
            placeholder="e.g. Operations, Customer support"
            maxlength="80"
            required
            :disabled="laneBusy" /></label
        ><button class="primary" :disabled="laneBusy || !laneName">
          Add swimlane
        </button>
      </form>
      <p class="lane-helper">
        The default swimlane stays available. To remove another swimlane, first
        move all of its active and archived tasks elsewhere.
      </p>
    </dialog>
  </main>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Squares2X2Icon,
  PlusIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  ArchiveBoxIcon,
  AdjustmentsHorizontalIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  CalendarDaysIcon,
  PaperClipIcon,
  ChatBubbleLeftEllipsisIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { kanbanApi } from '@/api/kanban'
import { courierError } from '@/utils/courier'
import { taskDate, taskInitials, taskOverdue } from '@/utils/kanban'
import { useAuthStore } from '@/stores/auth'
import { taskPriorities, taskStatuses } from '@/types/kanban'
import type {
  BoardFilters,
  BoardTask,
  TaskBoard,
  TaskStatus,
} from '@/types/kanban'
import KanbanImage from '@/components/KanbanImage.vue'
import KanbanTaskDialog from '@/components/KanbanTaskDialog.vue'
const auth = useAuthStore(),
  route = useRoute(),
  router = useRouter()
const board = ref<TaskBoard | null>(null),
  loading = ref(false),
  mutating = ref(false),
  error = ref(''),
  notice = ref(''),
  editor = ref(false),
  selected = ref<BoardTask | null>(null),
  newLane = ref(0),
  newStatus = ref<TaskStatus>('backlog')
const filters = reactive({
    search: '',
    assignee_id: '' as string | number,
    priority: '',
    archived: false,
  }),
  activeFilters = ref<BoardFilters>({})
const filtered = computed(() =>
  Boolean(
    activeFilters.value.search ||
    activeFilters.value.assignee_id ||
    activeFilters.value.priority,
  ),
)
const collapsed = ref(new Set<number>()),
  dragging = ref<BoardTask | null>(null),
  dropCell = ref('')
const swimlaneDialog = ref<HTMLDialogElement | null>(null),
  laneBusy = ref(false),
  laneError = ref(''),
  laneName = ref(''),
  laneNames = reactive<Record<number, string>>({}),
  managingLanes = ref(false)
let requestVersion = 0,
  refreshTimer: ReturnType<typeof setInterval> | undefined,
  disposed = false
async function load(quiet = false) {
  const version = ++requestVersion
  if (!quiet) loading.value = true
  try {
    const result = await kanbanApi.board(activeFilters.value)
    if (version !== requestVersion || disposed) return
    board.value = result
    if (!quiet) error.value = ''
  } catch (err) {
    if (version === requestVersion && !quiet)
      error.value = await courierError(err)
  } finally {
    if (version === requestVersion) loading.value = false
  }
}
async function applyFilters() {
  activeFilters.value = { ...filters }
  notice.value = ''
  await load()
}
async function clearFilters() {
  Object.assign(filters, { search: '', assignee_id: '', priority: '' })
  await applyFilters()
}
async function toggleArchive() {
  filters.archived = !filters.archived
  await applyFilters()
}
function countStatus(status: TaskStatus) {
  return board.value?.tasks.filter((task) => task.status === status).length || 0
}
function countLane(lane: number) {
  return (
    board.value?.tasks.filter((task) => task.swimlane_id === lane).length || 0
  )
}
function cellTasks(lane: number, status: TaskStatus) {
  return (
    board.value?.tasks
      .filter((task) => task.swimlane_id === lane && task.status === status)
      .sort((a, b) => a.position - b.position || a.id - b.id) || []
  )
}
function toggleLane(lane: number) {
  const next = new Set(collapsed.value)
  if (next.has(lane)) next.delete(lane)
  else next.add(lane)
  collapsed.value = next
}
function createTask(lane?: number, status: TaskStatus = 'backlog') {
  if (!board.value) return
  selected.value = null
  newLane.value =
    lane ||
    board.value.swimlanes.find((row) => row.is_default)?.id ||
    board.value.swimlanes[0]?.id ||
    0
  newStatus.value = status
  editor.value = true
}
async function openTask(id: number) {
  if (mutating.value) return
  mutating.value = true
  error.value = ''
  try {
    const task = await kanbanApi.task(id)
    if (disposed) return
    selected.value = task
    editor.value = true
    void router.replace({ query: { ...route.query, task: String(id) } })
  } catch (err) {
    error.value = await courierError(err)
  } finally {
    mutating.value = false
  }
}
async function closeEditor() {
  editor.value = false
  selected.value = null
  const query = { ...route.query }
  delete query.task
  void router.replace({ query })
  await load()
}
function taskUpdated(task: BoardTask) {
  if (board.value)
    board.value.tasks = board.value.tasks.map((row) =>
      row.id === task.id ? task : row,
    )
}
function startDrag(event: DragEvent, task: BoardTask) {
  if (mutating.value || filters.archived) {
    event.preventDefault()
    return
  }
  dragging.value = task
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(task.id))
  }
}
function endDrag() {
  dragging.value = null
  dropCell.value = ''
}
function dragOver(lane: number, status: TaskStatus) {
  if (dragging.value && !mutating.value) dropCell.value = `${lane}-${status}`
}
async function drop(
  event: DragEvent,
  lane: number,
  status: TaskStatus,
  before?: number,
) {
  void event
  const task = dragging.value
  endDrag()
  if (!task || task.id === before) return
  await moveTask(task, lane, status, before)
}
async function quickMove(task: BoardTask, event: Event) {
  const input = event.target as HTMLSelectElement
  const status = input.value as TaskStatus
  input.value = task.status
  if (status !== task.status) await moveTask(task, task.swimlane_id, status)
}
async function moveTask(
  task: BoardTask,
  lane: number,
  status: TaskStatus,
  before?: number,
) {
  if (mutating.value) return
  mutating.value = true
  error.value = ''
  notice.value = ''
  try {
    const updated = await kanbanApi.move(task, lane, status, before)
    taskUpdated(updated)
    notice.value = `Task #${task.id} moved to ${taskStatuses.find((item) => item.id === status)?.label}.`
    await load()
  } catch (err) {
    const message = await courierError(err)
    await load()
    error.value = message
  } finally {
    mutating.value = false
  }
}
function openSwimlanes() {
  if (!board.value) return
  for (const lane of board.value.swimlanes) laneNames[lane.id] = lane.name
  laneError.value = ''
  laneName.value = ''
  managingLanes.value = true
  swimlaneDialog.value?.showModal()
}
function closeSwimlanes() {
  if (laneBusy.value) return
  swimlaneDialog.value?.close()
  managingLanes.value = false
}
async function saveLane(id: number | null) {
  if (laneBusy.value) return
  laneBusy.value = true
  laneError.value = ''
  try {
    await kanbanApi.saveSwimlane(id, id ? laneNames[id] || '' : laneName.value)
    laneName.value = ''
    await load()
    if (board.value)
      for (const lane of board.value.swimlanes) laneNames[lane.id] = lane.name
  } catch (err) {
    laneError.value = await courierError(err)
  } finally {
    laneBusy.value = false
  }
}
async function deleteLane(id: number) {
  if (laneBusy.value) return
  laneBusy.value = true
  laneError.value = ''
  try {
    await kanbanApi.deleteSwimlane(id)
    await load()
  } catch (err) {
    laneError.value = await courierError(err)
  } finally {
    laneBusy.value = false
  }
}
async function moveLane(index: number, direction: number) {
  if (!board.value || laneBusy.value) return
  const ids = board.value.swimlanes.map((lane) => lane.id)
  const other = ids[index + direction]
  if (other === undefined) return
  ids[index + direction] = ids[index]!
  ids[index] = other
  laneBusy.value = true
  laneError.value = ''
  try {
    await kanbanApi.reorderSwimlanes(ids)
    await load()
  } catch (err) {
    laneError.value = await courierError(err)
  } finally {
    laneBusy.value = false
  }
}
onMounted(async () => {
  await load()
  if (disposed) return
  const id = Number(route.query.task)
  if (Number.isSafeInteger(id) && id > 0) await openTask(id)
  if (disposed) return
  refreshTimer = setInterval(() => {
    if (
      !document.hidden &&
      !editor.value &&
      !managingLanes.value &&
      !loading.value &&
      !mutating.value &&
      !dragging.value
    )
      void load(true)
  }, 30000)
})
onBeforeUnmount(() => {
  disposed = true
  requestVersion++
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>
<style scoped>
.kanban-page {
  padding: 1.5rem;
  display: grid;
  gap: 1.1rem;
  min-width: 0;
  color: #0f172a;
}
.board-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(110deg, #eaf6f3, #f8fafc);
  border: 1px solid #dce8e3;
  border-radius: 20px;
}
.board-eyebrow {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #0f766e;
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin: 0 0 0.55rem;
}
.board-eyebrow svg {
  width: 16px;
  height: 16px;
}
h1 {
  font-size: 2rem;
  letter-spacing: -0.04em;
  margin: 0;
}
.board-hero p:last-child {
  font-size: 0.85rem;
  color: #64748b;
  margin: 0.6rem 0 0;
}
.hero-actions {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  flex-wrap: wrap;
}
.shared-label {
  font-size: 0.72rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.shared-label svg {
  width: 16px;
  height: 16px;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e0f2f1;
  color: #0f766e;
  display: inline-grid;
  place-items: center;
  font-weight: 800;
  font-size: 0.65rem;
  border: 2px solid white;
  box-sizing: border-box;
  flex-shrink: 0;
}
.team-avatars,
.card-assignees {
  display: flex;
}
.team-avatars .avatar + .avatar,
.card-assignees .avatar + .avatar {
  margin-left: -8px;
}
.avatar.small {
  width: 26px;
  height: 26px;
  font-size: 0.55rem;
}
.kanban-page button,
.kanban-page input,
.kanban-page select {
  font: inherit;
  box-sizing: border-box;
  min-width: 0;
}
.kanban-page button {
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  background: #fff;
  padding: 0.6rem 0.8rem;
  color: #334155;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}
.kanban-page button svg {
  width: 17px;
  height: 17px;
  flex-shrink: 0;
}
.kanban-page button:disabled {
  opacity: 0.45;
  cursor: default;
}
.kanban-page button.primary {
  background: #0f766e;
  color: #fff;
  border-color: #0f766e;
}
.kanban-page button.active {
  background: #e0f2f1;
  border-color: #0f766e;
  color: #0f766e;
}
.board-toolbar {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}
.board-toolbar select {
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  background: white;
  padding: 0.65rem;
  font-size: 0.75rem;
  max-width: 200px;
}
.search-form {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  padding-left: 0.75rem;
  gap: 0.5rem;
  flex: 1;
  min-width: 260px;
  max-width: 460px;
}
.search-form > svg {
  width: 17px;
  height: 17px;
  color: #94a3b8;
}
.search-form input {
  width: 100%;
  border: 0;
  outline: 0;
  padding: 0.7rem 0;
  font-size: 0.78rem;
  background: none;
}
.kanban-page .search-form button {
  border: 0;
  border-left: 1px solid #e2e8f0;
  border-radius: 0 9px 9px 0;
  padding: 0.7rem;
}
.toolbar-spacer {
  flex: 1;
}
.board-meta {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  flex-wrap: wrap;
  font-size: 0.7rem;
  color: #64748b;
}
.board-meta .sync-note {
  margin-left: auto;
}
.kanban-page .board-meta button {
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  border: 0;
  background: none;
  color: #0f766e;
}
.board-scroll {
  overflow: auto;
  max-height: calc(100vh - 300px);
  min-height: 350px;
  border: 1px solid #dfe7ed;
  border-radius: 14px;
  background: #f3f6f9;
  isolation: isolate;
}
.board-grid {
  min-width: 1320px;
}
.column-headings,
.swimlane-cells {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}
.column-headings {
  position: sticky;
  top: 0;
  z-index: 5;
  box-shadow: 0 1px #dfe7ed;
}
.column-heading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
}
.column-heading > i {
  height: 8px;
  width: 8px;
  border-radius: 50%;
}
.column-heading h2 {
  font-size: 0.8rem;
  margin: 0;
}
.column-heading > span {
  font-size: 0.65rem;
  background: #e8edf3;
  color: #64748b;
  border-radius: 5px;
  padding: 0.15rem 0.4rem;
}
.kanban-page .column-heading button {
  padding: 0.15rem;
  border: 0;
  background: none;
  margin-left: auto;
}
.swimlane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #eaf0f5;
  padding: 0.45rem 0.7rem;
  border-bottom: 1px solid #dde5ec;
  min-height: 42px;
}
.kanban-page .swimlane-header > button {
  border: 0;
  background: none;
  padding: 0.3rem;
  color: #475569;
  font-size: 0.72rem;
  position: sticky;
  left: 0.7rem;
}
.swimlane-header strong {
  color: #334155;
}
.swimlane-header span {
  color: #94a3b8;
  font-size: 0.65rem;
  margin-left: 0.35rem;
}
.swimlane-header svg {
  transition: transform 0.15s;
}
.swimlane-header svg.collapsed {
  transform: rotate(-90deg);
}
.task-cell {
  border-right: 1px solid #e2e8f0;
  border-bottom: 1px solid #dfe7ed;
  padding: 0.7rem;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  transition: background 0.15s;
}
.task-cell.drag-over {
  background: #dff4ee;
  outline: 2px dashed #0f766e;
  outline-offset: -3px;
}
.task-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 4px #0f172a05;
  overflow: hidden;
  min-width: 0;
  cursor: grab;
}
.task-card:hover {
  border-color: #b6c9d5;
  box-shadow: 0 4px 12px #0f172a0d;
}
.task-card.is-dragging {
  opacity: 0.35;
}
.task-card.is-overdue {
  border-left: 3px solid #f59e0b;
}
.kanban-page .task-open {
  border: 0;
  border-radius: 0;
  background: none;
  display: block;
  text-align: left;
  padding: 0.9rem;
  width: 100%;
  font-weight: 400;
  color: #0f172a;
}
.task-open :deep(.task-image) {
  margin-bottom: 0.7rem;
}
.card-labels {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.55rem;
}
.priority {
  font-size: 0.58rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.22rem 0.45rem;
  border-radius: 5px;
  background: #f1f5f9;
  color: #64748b;
}
.priority.high {
  background: #fff7ed;
  color: #c2410c;
}
.priority.urgent {
  background: #fef2f2;
  color: #dc2626;
}
.priority.low {
  background: #f0f9ff;
  color: #0284c7;
}
.task-number {
  font-size: 0.65rem;
  color: #94a3b8;
}
.task-card h3 {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.5;
  font-weight: 750;
  overflow-wrap: anywhere;
}
.card-description {
  font-size: 0.72rem;
  line-height: 1.6;
  color: #64748b;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0.45rem 0 0;
  overflow-wrap: anywhere;
  white-space: pre-line;
}
.due-date {
  font-size: 0.65rem;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.65rem;
}
.due-date svg {
  width: 13px !important;
  height: 13px !important;
}
.due-date.overdue {
  color: #b45309;
}
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.85rem;
  min-height: 22px;
}
.card-counts {
  display: flex;
  gap: 0.5rem;
  font-size: 0.65rem;
  color: #94a3b8;
  align-items: center;
}
.card-counts span {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}
.card-counts svg {
  height: 13px !important;
  width: 13px !important;
}
.unassigned {
  font-size: 0.62rem;
}
.card-move {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.75rem;
  border-top: 1px solid #f1f5f9;
}
.card-move select {
  border: 0;
  padding: 0.25rem 0;
  font-size: 0.65rem;
  color: #64748b;
  background: white;
  max-width: 130px;
}
.kanban-page .card-edit {
  font-size: 0.65rem;
  padding: 0.2rem 0;
  background: none;
  border: 0;
  color: #0f766e;
}
.kanban-page .cell-add {
  background: none;
  color: #94a3b8;
  border: 1px dashed transparent;
  font-weight: 500;
  justify-content: flex-start;
  padding: 0.5rem;
}
.kanban-page .cell-add:hover {
  border-color: #b8cbc7;
  color: #0f766e;
  background: #f0fdfa;
}
.empty-cell {
  font-size: 0.7rem;
  color: #94a3b8;
  padding: 0.5rem;
}
.board-help {
  color: #94a3b8;
  font-size: 0.72rem;
  margin: 0;
  line-height: 1.6;
}
.board-notice {
  background: #f0fdfa;
  color: #0f766e;
  border-radius: 9px;
  padding: 0.85rem;
  font-size: 0.8rem;
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}
.board-notice.error {
  background: #fef2f2;
  color: #b91c1c;
}
.board-notice.warning {
  background: #fffbeb;
  color: #92400e;
}
.board-loading {
  text-align: center;
  color: #64748b;
  padding: 4rem;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
.swimlane-dialog {
  border: 0;
  border-radius: 18px;
  padding: 1.4rem;
  width: min(700px, calc(100vw - 2rem));
  max-height: 85vh;
  color: #0f172a;
}
.swimlane-dialog::backdrop {
  background: #0f172a80;
}
.swimlane-dialog > header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}
.swimlane-dialog h2 {
  font-size: 1.3rem;
  margin: 0;
}
.swimlane-dialog header > button {
  border: 0;
  padding: 0.25rem;
  align-self: start;
}
.lane-helper {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.6;
  margin: 1rem 0;
}
.lane-editor {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  margin: 0.65rem 0;
}
.lane-editor input {
  width: 100%;
  min-width: 60px;
}
.lane-editor input,
.new-lane input {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.65rem;
  font-size: 0.8rem;
}
.kanban-page .lane-editor button {
  font-size: 0.7rem;
  padding: 0.6rem;
}
.kanban-page .lane-editor button.danger {
  color: #b91c1c;
}
.new-lane {
  display: flex;
  gap: 0.65rem;
  align-items: end;
  border-top: 1px solid #e2e8f0;
  padding-top: 1rem;
  margin-top: 1.2rem;
}
.new-lane label {
  display: grid;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 700;
  flex: 1;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@media (max-width: 950px) {
  .board-hero {
    align-items: start;
    flex-direction: column;
  }
  .board-meta .sync-note {
    margin-left: 0;
  }
  .board-scroll {
    max-height: 65vh;
  }
}
@media (max-width: 600px) {
  .kanban-page {
    padding: 0.85rem;
  }
  .board-hero {
    padding: 1.1rem;
  }
  .board-hero h1 {
    font-size: 1.7rem;
  }
  .hero-actions {
    gap: 0.5rem;
  }
  .shared-label {
    font-size: 0.65rem;
  }
  .board-toolbar {
    gap: 0.5rem;
  }
  .search-form {
    min-width: 100%;
    max-width: none;
  }
  .board-toolbar select {
    flex: 1;
    max-width: none;
    min-width: 120px;
  }
  .toolbar-spacer {
    display: none;
  }
  .board-grid {
    min-width: 1290px;
  }
  .board-scroll {
    max-height: 65vh;
  }
  .lane-editor {
    flex-wrap: wrap;
  }
  .lane-editor input {
    width: 100%;
  }
  .new-lane {
    flex-direction: column;
    align-items: stretch;
  }
  .board-meta {
    font-size: 0.65rem;
  }
}
</style>
