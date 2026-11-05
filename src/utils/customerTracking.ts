import type { DirectOrder, ShipmentTracking } from '@/types'

export function officialTrackingURL(courier?: string | null, awb?: string | null): string {
  if (!awb) return ''
  if (courier?.toLowerCase() === 'dtdc') return `https://www.dtdc.com/track-your-shipment/?${new URLSearchParams({ awb })}`
  if (courier?.toLowerCase() === 'delhivery') return `https://www.delhivery.com/track-v2/package/${encodeURIComponent(awb)}`
  return ''
}
export function savedTracking(order: DirectOrder): ShipmentTracking | null {
  const snapshot = order.courier_payload?.tracking_summary as ShipmentTracking | undefined
  if (!snapshot || snapshot.awb !== order.awb || snapshot.courier !== order.courier_type) return null
  return { ...snapshot, events: Array.isArray(snapshot.events) ? snapshot.events : [] }
}
export function whatsappPhone(value: string): string {
  if (!/^[+0-9().\s-]+$/.test(value.trim())) return ''
  let phone = value.replace(/[^0-9]/g, '')
  if (phone.length === 11 && phone.startsWith('0')) phone = phone.slice(1)
  if (phone.length === 10) {
    if (!/^[6-9]\d{9}$/.test(phone)) return ''
    phone = `91${phone}`
  }
  if (phone.length === 12 && phone.startsWith('91') && !/^91[6-9]\d{9}$/.test(phone)) return ''
  if (phone.length < 11 || phone.length > 15 || phone.startsWith('0')) return ''
  return phone
}
export function trackingDate(value?: string): string {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00+05:30`).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium' })
  let candidate = value
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(value)) candidate = `${value.replace(' ', 'T')}+05:30`
  const date = new Date(candidate)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
}
export function buildTrackingMessage(order: DirectOrder, tracking: ShipmentTracking | null): string {
  const lines = [`Hello${order.customer_name ? ` ${order.customer_name}` : ''},`, '', `Order: ${order.order_id}`, `Order status: ${order.order_status}`]
  if (order.items.length) lines.push(`Items: ${order.items.slice(0, 3).map(item => `${item.item || 'Item'} × ${item.quantity}`).join(', ')}${order.items.length > 3 ? ` (+${order.items.length - 3} more)` : ''}`)
  if (order.awb) {
    lines.push(`Courier: ${(order.courier_name || order.courier_type || 'Courier').toUpperCase()}`, `Tracking ID: ${order.awb}`)
    if (tracking) {
      lines.push(`Shipment status: ${tracking.status}`)
      if (tracking.current_location) lines.push(`Current location: ${tracking.current_location}`)
      if (tracking.destination) lines.push(`Destination: ${tracking.destination}`)
      if (tracking.last_event_at) lines.push(`Latest update: ${trackingDate(tracking.last_event_at)}`)
      if (tracking.expected_delivery) lines.push(`Expected delivery: ${trackingDate(tracking.expected_delivery)}`)
      if (tracking.remarks) lines.push(`Details: ${tracking.remarks.slice(0, 300)}`)
      lines.push(`Last checked: ${trackingDate(tracking.checked_at)}`)
    } else if (order.courier_status) lines.push(`Saved shipment status: ${order.courier_status}`)
    const url = officialTrackingURL(order.courier_type, order.awb)
    if (url) lines.push(`Track your shipment: ${url}`)
  } else lines.push('A tracking ID has not been assigned to this order yet.')
  lines.push('', 'Thank you,', 'Tekgien Softwares')
  return lines.join('\n')
}
export function whatsappWebURL(phone: string, message: string): string {
  const normalized = whatsappPhone(phone)
  if (!normalized || !message.trim()) return ''
  return `https://web.whatsapp.com/send?${new URLSearchParams({ phone: normalized, text: message })}`
}
