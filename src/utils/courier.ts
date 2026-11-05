import axios from 'axios'
import type { DirectOrder, DTDCTracking } from '@/types'

export function shipmentLocked(order: DirectOrder): boolean {
  return Boolean(order.awb || order.courier_order_id || ['booking_pending', 'booking_review'].includes(order.courier_status || ''))
}

export async function courierError(error: unknown): Promise<string> {
  if (axios.isAxiosError(error)) {
    let data = error.response?.data
    if (data instanceof Blob) {
      try { data = JSON.parse(await data.text()) } catch { data = null }
    }
    if (typeof data?.error === 'string') return data.error
    if (!error.response) return 'The request did not complete. Refresh this order and check its courier status before trying to book again.'
    return error.message
  }
  return error instanceof Error ? error.message : 'Courier operation failed. Please refresh and try again.'
}

export function dtdcTracking(order: DirectOrder): DTDCTracking | null {
  const value = order.courier_payload?.tracking
  if (!value || typeof value !== 'object') return null
  const tracking = value as Partial<DTDCTracking>
  if (!tracking.trackHeader || typeof tracking.trackHeader !== 'object') return null
  return { trackHeader: tracking.trackHeader, trackDetails: Array.isArray(tracking.trackDetails) ? tracking.trackDetails : [] }
}

export function dtdcDate(date?: string, time?: string): string {
  if (!date) return ''
  const formatted = /^\d{8}$/.test(date) ? `${date.slice(0, 2)}/${date.slice(2, 4)}/${date.slice(4)}` : date
  const clock = time && /^\d{4}(\d{2})?$/.test(time) ? [time.slice(0, 2), time.slice(2, 4), time.slice(4)].filter(Boolean).join(':') : time
  return [formatted, clock].filter(Boolean).join(' ')
}

export function courierStatusLabel(status?: string | null): string {
  const labels: Record<string, string> = { booking_pending: 'Booking pending', booking_review: 'Needs review', booking_rejected: 'Booking rejected' }
  return status ? labels[status] || status : 'Booked'
}

export function saveCourierPDF(blob: Blob, awb: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `dtdc-${awb.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
  document.body.appendChild(link); link.click(); link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
