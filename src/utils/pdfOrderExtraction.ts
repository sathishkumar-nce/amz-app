import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'

GlobalWorkerOptions.workerPort = new Worker(
  new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url),
  { type: 'module' },
)

const AMAZON_ORDER_ID_PATTERN = /\b\d{3}-\d{7}-\d{7}\b/g

type PositionedTextItem = {
  str: string
  x: number
  y: number
}

export type ExtractedPdfOrderId = {
  amazonOrderId: string
  pageNumber: number
}

export async function extractAmazonOrderIdsFromPdf(file: File): Promise<ExtractedPdfOrderId[]> {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = getDocument({ data })
  const pdf = await loadingTask.promise
  const extracted: ExtractedPdfOrderId[] = []

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const pageText = sortTextItems(textContent.items)
        .map((item) => item.str)
        .join(' ')

      for (const match of pageText.matchAll(AMAZON_ORDER_ID_PATTERN)) {
        extracted.push({
          amazonOrderId: match[0],
          pageNumber,
        })
      }
    }
  } finally {
    try {
      await pdf.cleanup()
    } catch {
      // Best-effort cleanup only.
    }
    try {
      if (data.byteLength > 0) {
        data.fill(0)
      }
    } catch {
      // pdf.js may detach the underlying buffer during processing.
    }
    await loadingTask.destroy()
  }

  return extracted
}

function sortTextItems(items: unknown[]): PositionedTextItem[] {
  return items
    .map((item) => normalizeTextItem(item))
    .filter((item): item is PositionedTextItem => item != null)
    .sort((left, right) => {
      if (Math.abs(left.y - right.y) > 2) {
        return right.y - left.y
      }
      return left.x - right.x
    })
}

function normalizeTextItem(item: unknown): PositionedTextItem | null {
  if (!item || typeof item !== 'object') return null

  const candidate = item as { str?: unknown; transform?: unknown }
  if (typeof candidate.str !== 'string' || !Array.isArray(candidate.transform) || candidate.transform.length < 6) {
    return null
  }

  const [x, y] = [Number(candidate.transform[4]), Number(candidate.transform[5])]
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null
  }

  return {
    str: candidate.str,
    x,
    y,
  }
}
