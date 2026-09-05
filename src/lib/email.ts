import 'server-only'
import { Resend } from 'resend'
import { formatInLondon } from '@/lib/hours'
import { formatPence } from '@/lib/money'
import { SITE, absoluteUrl } from '@/lib/site'

/**
 * Transactional email.
 *
 * Without RESEND_API_KEY every send is logged to the console instead. That is on purpose: a
 * developer running this locally, or a staging deploy, should not need a mail provider to place a
 * test order — and should not be able to accidentally email a real customer either.
 *
 * Nothing here throws. A confirmation email that fails to send is annoying; an exception that
 * rolls back a paid order because the mail provider had a bad minute is a disaster.
 */

let resend: Resend | null = null

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!resend) resend = new Resend(key)
  return resend
}

type Mail = { to: string | string[]; subject: string; html: string; replyTo?: string }

export async function sendEmail(mail: Mail): Promise<{ sent: boolean; reason?: string }> {
  const client = getResend()
  const from = process.env.EMAIL_FROM

  if (!client || !from) {
    console.info(
      `[email] not configured — would have sent "${mail.subject}" to ${
        Array.isArray(mail.to) ? mail.to.join(', ') : mail.to
      }`,
    )
    return { sent: false, reason: 'not_configured' }
  }

  try {
    const { error } = await client.emails.send({
      from,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      replyTo: mail.replyTo,
    })
    if (error) {
      console.error('[email] send failed', error)
      return { sent: false, reason: error.message }
    }
    return { sent: true }
  } catch (error) {
    console.error('[email] send threw', error)
    return { sent: false, reason: 'exception' }
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const STYLES = {
  wrap: 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;background:#fbf7f1;padding:24px;color:#1b1714;',
  card: 'max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4d9c9;border-radius:16px;overflow:hidden;',
  head: 'padding:24px 24px 8px;',
  body: 'padding:8px 24px 24px;font-size:15px;line-height:1.6;',
  table: 'width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;',
  th: 'text-align:left;padding:8px 0;border-bottom:1px solid #e4d9c9;color:#6a5e52;font-weight:600;',
  td: 'padding:8px 0;border-bottom:1px solid #f4ece0;vertical-align:top;',
  right: 'text-align:right;white-space:nowrap;',
  foot: 'max-width:560px;margin:16px auto 0;font-size:12px;color:#6a5e52;text-align:center;line-height:1.6;',
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export type OrderEmailData = {
  orderNumber: string
  publicId: string
  type: 'PICKUP' | 'DELIVERY' | 'DINE_IN'
  customerName: string
  customerPhone: string
  customerEmail: string
  requestedFor: Date
  isAsap: boolean
  subtotalInPence: number
  deliveryFeeInPence: number
  totalInPence: number
  allergyNotes: string | null
  notes: string | null
  address: string | null
  items: Array<{ name: string; quantity: number; lineTotalInPence: number; options: string[]; notes: string | null }>
}

const TYPE_LABEL = { PICKUP: 'Collection', DELIVERY: 'Delivery', DINE_IN: 'Eat in' } as const

function itemRows(order: OrderEmailData): string {
  return order.items
    .map(
      (item) => `<tr>
        <td style="${STYLES.td}">
          <strong>${item.quantity}×</strong> ${escapeHtml(item.name)}
          ${item.options.length > 0 ? `<div style="color:#6a5e52;font-size:13px;">${escapeHtml(item.options.join(' · '))}</div>` : ''}
          ${item.notes ? `<div style="color:#6a5e52;font-size:13px;font-style:italic;">“${escapeHtml(item.notes)}”</div>` : ''}
        </td>
        <td style="${STYLES.td}${STYLES.right}">${formatPence(item.lineTotalInPence)}</td>
      </tr>`,
    )
    .join('')
}

function totals(order: OrderEmailData): string {
  return `
    <tr><td style="${STYLES.td}">Subtotal</td><td style="${STYLES.td}${STYLES.right}">${formatPence(order.subtotalInPence)}</td></tr>
    ${order.deliveryFeeInPence > 0 ? `<tr><td style="${STYLES.td}">Delivery</td><td style="${STYLES.td}${STYLES.right}">${formatPence(order.deliveryFeeInPence)}</td></tr>` : ''}
    <tr><td style="${STYLES.td}"><strong>Total paid</strong></td><td style="${STYLES.td}${STYLES.right}"><strong>${formatPence(order.totalInPence)}</strong></td></tr>`
}

export function customerOrderEmail(order: OrderEmailData): { subject: string; html: string } {
  const when = formatInLondon(order.requestedFor, "EEEE d MMMM 'at' HH:mm")
  const verb = order.type === 'DELIVERY' ? 'with you' : order.type === 'PICKUP' ? 'ready' : 'on your table'

  return {
    subject: `${SITE.name} order ${order.orderNumber} — ${TYPE_LABEL[order.type]} ${when}`,
    html: `<div style="${STYLES.wrap}">
  <div style="${STYLES.card}">
    <div style="${STYLES.head}">
      <p style="margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#7a1818;">Order confirmed</p>
      <h1 style="margin:6px 0 0;font-size:24px;">Thank you, ${escapeHtml(order.customerName.split(' ')[0])}</h1>
    </div>
    <div style="${STYLES.body}">
      <p style="margin:0 0 4px;">Your order <strong>${order.orderNumber}</strong> is paid and with the kitchen.</p>
      <p style="margin:0;">${TYPE_LABEL[order.type]} — ${verb} <strong>${when}</strong>.</p>
      ${order.address ? `<p style="margin:12px 0 0;color:#6a5e52;">Delivering to ${escapeHtml(order.address)}</p>` : ''}

      <table style="${STYLES.table}">
        <thead><tr><th style="${STYLES.th}">Your order</th><th style="${STYLES.th}${STYLES.right}"></th></tr></thead>
        <tbody>${itemRows(order)}${totals(order)}</tbody>
      </table>

      ${
        order.allergyNotes
          ? `<p style="margin:0 0 12px;padding:12px;background:#fbf0dc;border-radius:10px;"><strong>Allergy note you gave us:</strong> ${escapeHtml(order.allergyNotes)}</p>`
          : ''
      }

      <p style="margin:0 0 12px;padding:12px;background:#fbf0dc;border-radius:10px;font-size:13px;">
        <strong>Allergies.</strong> Our dishes are prepared in a kitchen that handles all 14 regulated
        allergens, so we cannot guarantee any dish is free from traces. If you have an allergy and
        have not already spoken to us, please call before you eat.
      </p>

      <p style="margin:16px 0 0;">
        <a href="${absoluteUrl(`/order/${order.publicId}`)}" style="display:inline-block;background:#8a1c1c;color:#fff8f0;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:600;">Track your order</a>
      </p>
      <p style="margin:16px 0 0;color:#6a5e52;">
        Something wrong? Call us on <a href="tel:+441628825753" style="color:#7a1818;">01628 825753</a> and ask for order ${order.orderNumber}.
      </p>
    </div>
  </div>
  <p style="${STYLES.foot}">${SITE.legalName} · The Bell and Bottle, Bath Road, Littlewick Green, Maidenhead SL6 3RX</p>
</div>`,
  }
}

export function kitchenOrderEmail(order: OrderEmailData): { subject: string; html: string } {
  const when = formatInLondon(order.requestedFor, 'EEE d MMM HH:mm')

  return {
    subject: `${order.isAsap ? 'ASAP' : when} — ${TYPE_LABEL[order.type]} ${order.orderNumber} — ${formatPence(order.totalInPence)}`,
    html: `<div style="${STYLES.wrap}">
  <div style="${STYLES.card}">
    <div style="${STYLES.head}">
      <h1 style="margin:0;font-size:22px;">${TYPE_LABEL[order.type]} · ${order.orderNumber}</h1>
      <p style="margin:6px 0 0;font-size:18px;"><strong>${order.isAsap ? 'ASAP' : when}</strong></p>
    </div>
    <div style="${STYLES.body}">
      ${
        order.allergyNotes
          ? `<p style="margin:0 0 16px;padding:12px;background:#fbe9e9;border:1px solid #a11b1b;border-radius:10px;"><strong>ALLERGY:</strong> ${escapeHtml(order.allergyNotes)}</p>`
          : ''
      }
      <table style="${STYLES.table}"><tbody>${itemRows(order)}${totals(order)}</tbody></table>
      ${order.notes ? `<p style="margin:0 0 12px;"><strong>Note:</strong> ${escapeHtml(order.notes)}</p>` : ''}
      <p style="margin:0;">
        ${escapeHtml(order.customerName)} · <a href="tel:${order.customerPhone.replace(/\s/g, '')}">${escapeHtml(order.customerPhone)}</a><br>
        ${order.address ? `${escapeHtml(order.address)}<br>` : ''}
        ${escapeHtml(order.customerEmail)}
      </p>
      <p style="margin:16px 0 0;"><a href="${absoluteUrl('/admin/orders')}" style="color:#7a1818;">Open in the admin area</a></p>
    </div>
  </div>
</div>`,
  }
}

export function reservationEmail(reservation: {
  reference: string
  name: string
  partySize: number
  dateTime: Date
  notes: string | null
  allergyNotes: string | null
}): { subject: string; html: string } {
  const when = formatInLondon(reservation.dateTime, "EEEE d MMMM 'at' HH:mm")
  return {
    subject: `Table request ${reservation.reference} — ${reservation.partySize} on ${when}`,
    html: `<div style="${STYLES.wrap}"><div style="${STYLES.card}">
      <div style="${STYLES.head}"><h1 style="margin:0;font-size:22px;">Thank you, ${escapeHtml(reservation.name.split(' ')[0])}</h1></div>
      <div style="${STYLES.body}">
        <p style="margin:0;">We have your request for <strong>${reservation.partySize} ${reservation.partySize === 1 ? 'person' : 'people'}</strong> on <strong>${when}</strong>.</p>
        <p style="margin:12px 0 0;">Reference <strong>${reservation.reference}</strong>. We will call or email to confirm shortly — the table is not held until we do.</p>
        ${reservation.allergyNotes ? `<p style="margin:12px 0 0;padding:12px;background:#fbf0dc;border-radius:10px;"><strong>Allergy note:</strong> ${escapeHtml(reservation.allergyNotes)}</p>` : ''}
        ${reservation.notes ? `<p style="margin:12px 0 0;color:#6a5e52;">${escapeHtml(reservation.notes)}</p>` : ''}
        <p style="margin:16px 0 0;color:#6a5e52;">Need to change it? Call <a href="tel:+441628825753" style="color:#7a1818;">01628 825753</a>.</p>
      </div>
    </div></div>`,
  }
}

export function enquiryEmail(enquiry: {
  reference: string
  name: string
  eventType: string
  estimatedGuests: number | null
  preferredDate: Date | null
}): { subject: string; html: string } {
  return {
    subject: `Event enquiry ${enquiry.reference} — ${enquiry.eventType}`,
    html: `<div style="${STYLES.wrap}"><div style="${STYLES.card}">
      <div style="${STYLES.head}"><h1 style="margin:0;font-size:22px;">Thank you, ${escapeHtml(enquiry.name.split(' ')[0])}</h1></div>
      <div style="${STYLES.body}">
        <p style="margin:0;">We have your enquiry about a <strong>${escapeHtml(enquiry.eventType)}</strong>${
          enquiry.estimatedGuests ? ` for around <strong>${enquiry.estimatedGuests} guests</strong>` : ''
        }${enquiry.preferredDate ? ` on <strong>${formatInLondon(enquiry.preferredDate, 'EEEE d MMMM yyyy')}</strong>` : ''}.</p>
        <p style="margin:12px 0 0;">Reference <strong>${enquiry.reference}</strong>. One of us will be in touch within a day to talk it through.</p>
        <p style="margin:16px 0 0;color:#6a5e52;">In a hurry? Call <a href="tel:+441628825753" style="color:#7a1818;">01628 825753</a>.</p>
      </div>
    </div></div>`,
  }
}
