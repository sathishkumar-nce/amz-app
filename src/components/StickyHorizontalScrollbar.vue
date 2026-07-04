<template>
  <Teleport to="body">
    <div v-show="isVisible" class="sticky-scrollbar-shell" :style="shellStyle">
      <div ref="trackRef" class="sticky-scrollbar" @pointerdown="handleTrackPointerDown">
        <div
          ref="thumbRef"
          class="sticky-scrollbar__thumb"
          :style="thumbStyle"
          @pointerdown.stop="handleThumbPointerDown"
        ></div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  target: HTMLElement | null
  alwaysVisible?: boolean
}>()

const FLOATING_SCROLL_CLASS = 'floating-horizontal-scroll-target'

const trackRef = ref<HTMLDivElement | null>(null)
const thumbRef = ref<HTMLDivElement | null>(null)
const isVisible = ref(false)
const shellStyle = ref<Record<string, string>>({})
const thumbStyle = ref<Record<string, string>>({})

let resizeObserver: ResizeObserver | null = null
let pointerId: number | null = null
let dragStartClientX = 0
let dragStartScrollLeft = 0
let thumbWidth = 0
let maxThumbOffset = 0
let maxScrollLeft = 0

const updateTargetClass = (target: HTMLElement | null, enabled: boolean) => {
  if (!target) return

  if (enabled) {
    target.classList.add(FLOATING_SCROLL_CLASS)
  } else {
    target.classList.remove(FLOATING_SCROLL_CLASS)
  }
}

const syncMetrics = () => {
  const target = props.target
  if (!target) {
    isVisible.value = false
    thumbStyle.value = {
      width: '0px',
      transform: 'translateX(0px)',
    }
    return
  }

  const rect = target.getBoundingClientRect()
  const viewportPadding = 12
  const left = Math.max(rect.left, viewportPadding)
  const right = Math.min(rect.right, window.innerWidth - viewportPadding)
  const width = Math.max(0, right - left)
  maxScrollLeft = Math.max(0, target.scrollWidth - target.clientWidth)
  const hasHorizontalOverflow = maxScrollLeft > 1

  isVisible.value =
    hasHorizontalOverflow &&
    width > 120 &&
    (props.alwaysVisible === true || (rect.bottom > 0 && rect.top < window.innerHeight))

  shellStyle.value = {
    left: `${left}px`,
    width: `${width}px`,
  }

  updateTargetClass(target, isVisible.value)

  if (!isVisible.value) {
    thumbStyle.value = {
      width: '0px',
      transform: 'translateX(0px)',
    }
    return
  }

  thumbWidth = Math.max(64, Math.min(width, (target.clientWidth / target.scrollWidth) * width))
  maxThumbOffset = Math.max(0, width - thumbWidth)
  const thumbOffset =
    maxScrollLeft > 0 ? (target.scrollLeft / maxScrollLeft) * maxThumbOffset : 0

  thumbStyle.value = {
    width: `${thumbWidth}px`,
    transform: `translateX(${thumbOffset}px)`,
  }
}

const handleTargetScroll = () => {
  syncMetrics()
}

const applyThumbOffset = (offset: number) => {
  const target = props.target
  if (!target || maxThumbOffset <= 0 || maxScrollLeft <= 0) return

  const clampedOffset = Math.min(Math.max(offset, 0), maxThumbOffset)
  target.scrollLeft = (clampedOffset / maxThumbOffset) * maxScrollLeft
}

const handleThumbPointerDown = (event: PointerEvent) => {
  if (!isVisible.value) return

  pointerId = event.pointerId
  dragStartClientX = event.clientX
  dragStartScrollLeft = props.target?.scrollLeft ?? 0
  thumbRef.value?.setPointerCapture?.(event.pointerId)
}

const handlePointerMove = (event: PointerEvent) => {
  if (pointerId === null || event.pointerId !== pointerId || maxThumbOffset <= 0 || maxScrollLeft <= 0) return

  const deltaX = event.clientX - dragStartClientX
  const scrollDelta = (deltaX / maxThumbOffset) * maxScrollLeft
  const target = props.target
  if (!target) return

  target.scrollLeft = Math.min(Math.max(dragStartScrollLeft + scrollDelta, 0), maxScrollLeft)
}

const clearPointerDrag = (event?: PointerEvent) => {
  if (event && pointerId !== null && event.pointerId !== pointerId) return

  if (pointerId !== null) {
    thumbRef.value?.releasePointerCapture?.(pointerId)
  }

  pointerId = null
}

const handleTrackPointerDown = (event: PointerEvent) => {
  const track = trackRef.value
  const target = props.target
  if (!track || !target || !isVisible.value || maxScrollLeft <= 0) return

  const rect = track.getBoundingClientRect()
  const desiredOffset = event.clientX - rect.left - thumbWidth / 2
  applyThumbOffset(desiredOffset)

  pointerId = event.pointerId
  dragStartClientX = event.clientX
  dragStartScrollLeft = target.scrollLeft
}

const bindTarget = (target: HTMLElement | null, previousTarget?: HTMLElement | null) => {
  previousTarget?.removeEventListener('scroll', handleTargetScroll)
  updateTargetClass(previousTarget ?? null, false)
  resizeObserver?.disconnect()
  resizeObserver = null

  if (!target) {
    isVisible.value = false
    thumbStyle.value = {
      width: '0px',
      transform: 'translateX(0px)',
    }
    return
  }

  target.addEventListener('scroll', handleTargetScroll, { passive: true })

  resizeObserver = new ResizeObserver(() => {
    syncMetrics()
  })
  resizeObserver.observe(target)

  const content = target.firstElementChild
  if (content instanceof HTMLElement) {
    resizeObserver.observe(content)
  }

  nextTick(() => {
    syncMetrics()
  })
}

watch(
  () => props.target,
  (target, previousTarget) => {
    bindTarget(target, previousTarget)
  },
)

onMounted(() => {
  bindTarget(props.target)
  window.addEventListener('resize', syncMetrics)
  window.addEventListener('scroll', syncMetrics, { passive: true })
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('pointerup', clearPointerDrag, { passive: true })
  window.addEventListener('pointercancel', clearPointerDrag, { passive: true })
})

onBeforeUnmount(() => {
  props.target?.removeEventListener('scroll', handleTargetScroll)
  updateTargetClass(props.target, false)
  resizeObserver?.disconnect()
  window.removeEventListener('resize', syncMetrics)
  window.removeEventListener('scroll', syncMetrics)
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', clearPointerDrag)
  window.removeEventListener('pointercancel', clearPointerDrag)
})
</script>

<style scoped>
.sticky-scrollbar-shell {
  position: fixed;
  bottom: max(10px, calc(env(safe-area-inset-bottom) + 6px));
  z-index: 70;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow:
    0 10px 30px rgba(15, 23, 42, 0.16),
    inset 0 0 0 1px rgba(148, 163, 184, 0.22);
  backdrop-filter: blur(10px);
}

.sticky-scrollbar {
  position: relative;
  height: 18px;
  margin: 0.22rem 0.35rem;
  border-radius: 999px;
  background: rgba(226, 232, 240, 0.95);
  cursor: pointer;
}

.sticky-scrollbar__thumb {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  min-width: 64px;
  border-radius: 999px;
  background: linear-gradient(180deg, #2563eb, #1d4ed8);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.24),
    0 5px 12px rgba(37, 99, 235, 0.28);
  cursor: ew-resize;
  touch-action: none;
}

:global(.floating-horizontal-scroll-target) {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

:global(.floating-horizontal-scroll-target::-webkit-scrollbar) {
  width: 0 !important;
  height: 0 !important;
}
</style>
