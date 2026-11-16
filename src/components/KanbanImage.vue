<template>
  <div ref="container" class="task-image">
    <img v-if="source" :src="source" :alt="name" loading="lazy" /><span
      v-else
      >{{ failed ? 'Preview unavailable' : 'Image attachment' }}</span
    >
  </div>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { kanbanApi } from '@/api/kanban'
const props = defineProps<{
  taskId: number
  attachmentId: number
  name: string
}>()
const source = ref(''),
  failed = ref(false),
  container = ref<HTMLElement | null>(null)
let disposed = false,
  observer: IntersectionObserver | undefined
async function load() {
  observer?.disconnect()
  try {
    const blob = await kanbanApi.file(props.taskId, props.attachmentId, true)
    if (!disposed) source.value = URL.createObjectURL(blob)
  } catch {
    if (!disposed) failed.value = true
  }
}
onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') {
    void load()
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void load()
    },
    { rootMargin: '200px' },
  )
  if (container.value) observer.observe(container.value)
})
onBeforeUnmount(() => {
  disposed = true
  observer?.disconnect()
  if (source.value) URL.revokeObjectURL(source.value)
})
</script>
<style scoped>
.task-image {
  aspect-ratio: 16/9;
  overflow: hidden;
  background: #eef2f6;
  border-radius: 9px;
  display: grid;
  place-items: center;
  color: #64748b;
  font-size: 0.75rem;
}
.task-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
