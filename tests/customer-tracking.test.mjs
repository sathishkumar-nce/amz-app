import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import ts from 'typescript'

const source = await readFile(new URL('../src/utils/customerTracking.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
const { whatsappPhone, whatsappWebURL, buildTrackingMessage, officialTrackingURL, savedTracking, trackingDate } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const order = { order_id: 'DO-1001', customer_name: 'Alice & Family', order_status: 'forwarded', mobile: '9345266494', courier_type: 'dtdc', awb: 'D123', items: [{ item: 'Table cover', quantity: 2 }] }

test('recipient normalization accepts Indian formatting and rejects malformed recipients', () => {
  for (const phone of ['9345266494', '+91 93452 66494', '(+91) 93452-66494', '09345266494']) assert.equal(whatsappPhone(phone), '919345266494')
  for (const phone of ['', 'abc9345266494', '00000000000', '12345', '1234567890123456']) assert.equal(whatsappPhone(phone), '')
  assert.equal(whatsappWebURL('bad', 'Hello'), '')
  assert.equal(whatsappWebURL(order.mobile, ' '), '')
})

test('WhatsApp URL preserves message text and only opens the Web compose screen', () => {
  const message = 'Hello Alice & Family,\nStatus: In transit\nhttps://www.dtdc.com/?awb=D123'
  const url = new URL(whatsappWebURL(order.mobile, message))
  assert.equal(url.origin + url.pathname, 'https://web.whatsapp.com/send')
  assert.equal(url.searchParams.get('phone'), '919345266494')
  assert.equal(url.searchParams.get('text'), message)
})

test('tracked order messages include live details and official courier links', () => {
  const tracking = { status: 'In Transit', current_location: 'Salem Hub', destination: 'Chennai', expected_delivery: '2026-11-07', checked_at: '2026-11-05T06:30:00Z', remarks: 'Arrived at hub' }
  const message = buildTrackingMessage(order, tracking)
  for (const expected of ['Alice & Family', 'DO-1001', 'Table cover × 2', 'Tracking ID: D123', 'In Transit', 'Salem Hub', 'Chennai', 'Arrived at hub', 'Last checked:', officialTrackingURL('dtdc', 'D123')]) assert(message.includes(expected), expected)
  assert.equal(officialTrackingURL('delhivery', 'DL123'), 'https://www.delhivery.com/track-v2/package/DL123')
  assert.equal(officialTrackingURL('manual', 'ID'), '')
  assert(!trackingDate('2026-11-07').includes('am'))
  assert(!trackingDate('2026-11-07').includes('pm'))
})

test('unshipped orders have no invented tracking ID or URL', () => {
  const message = buildTrackingMessage({ ...order, awb: null, courier_type: null }, null)
  assert(message.includes('not been assigned'))
  assert(!message.includes('Track your shipment:'))
  assert(!message.includes('Tracking ID:'))
})

test('cached tracking cannot be attached to another AWB or courier', () => {
  const snapshot = { courier: 'dtdc', awb: 'D123', status: 'In Transit', events: [] }
  assert.equal(savedTracking({ ...order, courier_payload: { tracking_summary: { ...snapshot, awb: 'OTHER' } } }), null)
  assert.equal(savedTracking({ ...order, courier_payload: { tracking_summary: { ...snapshot, courier: 'delhivery' } } }), null)
  assert.deepEqual(savedTracking({ ...order, courier_payload: { tracking_summary: snapshot } }), snapshot)
})
