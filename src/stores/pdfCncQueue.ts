import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { ordersApi } from '@/api/orders'
import type { OrderedAmazonOrderResult } from '@/types'

const STORAGE_KEY = 'pdf_cnc_queue_v1'

export type PdfQueueStoredEntry = {
  entryKey: string
  pageNumber: number
  amazonOrderId: string
}

export type PdfQueueItem = {
  fileKey: string
  fileName: string
  uploadedAt: string
  entries: PdfQueueStoredEntry[]
}

export type PdfQueueExtractedEntry = PdfQueueStoredEntry & {
  fileKey: string
  fileName: string
  sequenceIndex: number
}

export type PdfQueueRedundantEntry = {
  removedEntryKey: string
  amazonOrderId: string
  keptFileKey: string
  keptFileName: string
  keptPageNumber: number
  removedFileKey: string
  removedFileName: string
  removedPageNumber: number
}

type StoredQueuePayload = {
  queueItems?: PdfQueueItem[]
}

function createFileKey(fileName: string, index: number) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 10)}-${fileName}`
}

function normalizeFileName(fileName: string) {
  return fileName.trim().toLowerCase()
}

function loadStoredQueueItems(): PdfQueueItem[] {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as StoredQueuePayload
    if (!Array.isArray(parsed.queueItems)) {
      return []
    }

    return parsed.queueItems
      .filter((item): item is PdfQueueItem => {
        return (
          item != null &&
          typeof item.fileKey === 'string' &&
          typeof item.fileName === 'string' &&
          typeof item.uploadedAt === 'string' &&
          Array.isArray(item.entries)
        )
      })
      .map((item) => ({
        ...item,
        entries: item.entries.filter((entry): entry is PdfQueueStoredEntry => {
          return (
            entry != null &&
            typeof entry.entryKey === 'string' &&
            typeof entry.pageNumber === 'number' &&
            typeof entry.amazonOrderId === 'string'
          )
        }),
      }))
  } catch {
    return []
  }
}

function persistQueueItems(queueItems: PdfQueueItem[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      queueItems,
    } satisfies StoredQueuePayload),
  )
}

export const usePdfCncQueueStore = defineStore('pdfCncQueue', () => {
  const queueItems = ref<PdfQueueItem[]>(loadStoredQueueItems())
  const lookupResults = shallowRef<OrderedAmazonOrderResult[]>([])
  const missingOrderIds = ref<string[]>([])
  const lastSuccessfulSyncAt = ref('')

  const queuedOrderIdCount = computed(() =>
    queueItems.value.reduce((total, item) => total + item.entries.length, 0),
  )

  const redundantOrderEntries = computed<PdfQueueRedundantEntry[]>(() => {
    const firstSeenByOrderId = new Map<
      string,
      {
        fileKey: string
        fileName: string
        pageNumber: number
      }
    >()
    const duplicates: PdfQueueRedundantEntry[] = []

    for (const item of queueItems.value) {
      for (const entry of item.entries) {
        const firstSeen = firstSeenByOrderId.get(entry.amazonOrderId)
        if (!firstSeen) {
          firstSeenByOrderId.set(entry.amazonOrderId, {
            fileKey: item.fileKey,
            fileName: item.fileName,
            pageNumber: entry.pageNumber,
          })
          continue
        }

        duplicates.push({
          removedEntryKey: entry.entryKey,
          amazonOrderId: entry.amazonOrderId,
          keptFileKey: firstSeen.fileKey,
          keptFileName: firstSeen.fileName,
          keptPageNumber: firstSeen.pageNumber,
          removedFileKey: item.fileKey,
          removedFileName: item.fileName,
          removedPageNumber: entry.pageNumber,
        })
      }
    }

    return duplicates
  })

  const extractedEntries = computed<PdfQueueExtractedEntry[]>(() => {
    let sequenceIndex = 0
    const seenOrderIds = new Set<string>()

    return queueItems.value.flatMap((item) =>
      item.entries
        .filter((entry) => {
          if (seenOrderIds.has(entry.amazonOrderId)) {
            return false
          }
          seenOrderIds.add(entry.amazonOrderId)
          return true
        })
        .map((entry) => ({
          ...entry,
          fileKey: item.fileKey,
          fileName: item.fileName,
          sequenceIndex: sequenceIndex++,
        })),
    )
  })

  const fileSummaries = computed(() => {
    const redundantEntryKeys = new Set(redundantOrderEntries.value.map((entry) => entry.removedEntryKey))

    return queueItems.value.map((item) => {
      const redundantIds = item.entries.filter((entry) => redundantEntryKeys.has(entry.entryKey)).length
      const totalIds = item.entries.length

      return {
        fileKey: item.fileKey,
        fileName: item.fileName,
        totalIds,
        activeIds: totalIds - redundantIds,
        redundantIds,
        orderIds: item.entries.map((entry) => entry.amazonOrderId),
      }
    })
  })

  const uploadedFileNames = computed(() => queueItems.value.map((item) => item.fileName))

  const appendFiles = (files: Array<{ fileName: string; entries: Array<{ pageNumber: number; amazonOrderId: string }> }>) => {
    const seenFileNames = new Set(queueItems.value.map((item) => normalizeFileName(item.fileName)))
    const duplicateFileNames: string[] = []
    const nextItems = files
      .filter((file) => {
        const normalizedFileName = normalizeFileName(file.fileName)
        if (seenFileNames.has(normalizedFileName)) {
          duplicateFileNames.push(file.fileName)
          return false
        }
        seenFileNames.add(normalizedFileName)
        return file.entries.length > 0
      })
      .map((file, fileIndex) => {
        const fileKey = createFileKey(file.fileName, fileIndex)
        return {
          fileKey,
          fileName: file.fileName,
          uploadedAt: new Date().toISOString(),
          entries: file.entries.map((entry, entryIndex) => ({
            entryKey: `${fileKey}:${entryIndex}`,
            pageNumber: entry.pageNumber,
            amazonOrderId: entry.amazonOrderId,
          })),
        } satisfies PdfQueueItem
      })

    if (!nextItems.length) {
      return {
        addedFileNames: [] as string[],
        duplicateFileNames,
      }
    }

    queueItems.value = [...queueItems.value, ...nextItems]
    persistQueueItems(queueItems.value)

    return {
      addedFileNames: nextItems.map((item) => item.fileName),
      duplicateFileNames,
    }
  }

  const removeFile = (fileKey: string) => {
    queueItems.value = queueItems.value.filter((item) => item.fileKey !== fileKey)
    if (queueItems.value.length === 0) {
      lookupResults.value = []
      missingOrderIds.value = []
      lastSuccessfulSyncAt.value = ''
    }
    persistQueueItems(queueItems.value)
  }

  const clearQueue = () => {
    queueItems.value = []
    lookupResults.value = []
    missingOrderIds.value = []
    lastSuccessfulSyncAt.value = ''
    persistQueueItems(queueItems.value)
  }

  const refreshLookupResults = async () => {
    const orderIds = extractedEntries.value.map((entry) => entry.amazonOrderId)

    if (!orderIds.length) {
      lookupResults.value = []
      missingOrderIds.value = []
      lastSuccessfulSyncAt.value = ''
      return
    }

    const response = await ordersApi.getByIDs(orderIds)
    lookupResults.value = response.results
    missingOrderIds.value = response.missing_amazon_order_ids
    lastSuccessfulSyncAt.value = new Date().toISOString()
  }

  return {
    queueItems,
    queuedOrderIdCount,
    redundantOrderEntries,
    extractedEntries,
    lookupResults,
    missingOrderIds,
    lastSuccessfulSyncAt,
    fileSummaries,
    uploadedFileNames,
    appendFiles,
    removeFile,
    clearQueue,
    refreshLookupResults,
  }
})
