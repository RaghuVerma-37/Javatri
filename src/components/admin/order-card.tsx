import { Phone, TriangleAlert } from 'lucide-react'
import { formatPhone, telHref } from '@/lib/site'
import { ActionButton } from '@/components/admin/action-button'
import { Badge } from '@/components/ui'
import { formatInLondon } from '@/lib/hours'
import { formatPence } from '@/lib/money'
import { setOrderStatus } from '@/server/admin-actions'

type OrderItem = {
  id: string
  nameSnapshot: string
  quantity: number
  lineTotalInPence: number
  selectedVariants: unknown
  selectedModifiers: unknown
  notes: string | null
}

type Order = {
  id: string
  orderNumber: string
  status: string
  type: string
  customerName: string
  customerPhone: string
  addressLine1: string | null
  city: string | null
  postcode: string | null
  deliveryNotes: string | null
  requestedFor: Date
  isAsap: boolean
  totalInPence: number
  allergyNotes: string | null
  notes: string | null
  items: OrderItem[]
}

const NEXT_STATUS: Record<string, { label: string; status: 'ACCEPTED' | 'PREPARING' | 'READY' | 'COMPLETED' }> = {
  PAID: { label: 'Accept', status: 'ACCEPTED' },
  ACCEPTED: { label: 'Start cooking', status: 'PREPARING' },
  PREPARING: { label: 'Mark ready', status: 'READY' },
  READY: { label: 'Mark done', status: 'COMPLETED' },
}

const TONE: Record<string, 'brand' | 'warn' | 'ok' | 'neutral' | 'danger'> = {
  PAID: 'brand',
  ACCEPTED: 'warn',
  PREPARING: 'warn',
  READY: 'ok',
  COMPLETED: 'neutral',
  CANCELLED: 'danger',
  REFUNDED: 'danger',
}

function optionNames(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((entry) =>
        typeof entry === 'object' && entry !== null && 'name' in entry
          ? [String((entry as { name: unknown }).name)]
          : [],
      )
    : []
}

/**
 * A kitchen ticket.
 *
 * Laid out for someone reading it in a hurry: the time and the order type are the biggest things
 * on it, the allergy note is impossible to miss, and there is exactly one button for "what happens
 * next" rather than a status dropdown to think about.
 */
export function OrderCard({ order, timezone }: { order: Order; timezone: string }) {
  const next = NEXT_STATUS[order.status]

  return (
    <article className="rounded-2xl border border-line bg-surface">
      <header className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <span className="font-display text-2xl font-semibold tabular-nums">
          {order.isAsap && order.status === 'PAID'
            ? 'ASAP'
            : formatInLondon(order.requestedFor, 'HH:mm', timezone)}
        </span>
        <Badge tone={TONE[order.status] ?? 'neutral'}>{order.type.replace('_', ' ')}</Badge>
        <Badge tone="neutral">{order.status}</Badge>
        <span className="font-mono text-sm text-muted">{order.orderNumber}</span>
        <span className="ml-auto font-medium tabular-nums">{formatPence(order.totalInPence)}</span>
      </header>

      {order.allergyNotes ? (
        <p className="flex gap-2.5 border-b border-danger/25 bg-danger-wash px-5 py-3.5 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
          <span>
            <strong className="font-semibold">Allergy:</strong> {order.allergyNotes}
          </span>
        </p>
      ) : null}

      <ul className="divide-y divide-line">
        {order.items.map((item) => {
          const options = [...optionNames(item.selectedVariants), ...optionNames(item.selectedModifiers)]
          return (
            <li key={item.id} className="flex gap-3 px-5 py-3 text-sm">
              <span className="w-8 shrink-0 font-semibold tabular-nums">{item.quantity}×</span>
              <span className="min-w-0 flex-1">
                {item.nameSnapshot}
                {options.length > 0 ? (
                  <span className="block text-xs text-muted">{options.join(' · ')}</span>
                ) : null}
                {item.notes ? (
                  <span className="block text-xs italic text-brand-text">“{item.notes}”</span>
                ) : null}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="space-y-1 border-t border-line px-5 py-3.5 text-sm">
        <p className="flex flex-wrap items-center gap-x-3">
          <span className="font-medium">{order.customerName}</span>
          <a
            href={telHref(order.customerPhone)}
            className="inline-flex items-center gap-1.5 text-brand-text underline underline-offset-2"
          >
            <Phone aria-hidden className="size-3.5" />
            {formatPhone(order.customerPhone)}
          </a>
        </p>
        {order.type === 'DELIVERY' ? (
          <p className="text-muted">
            {[order.addressLine1, order.city, order.postcode].filter(Boolean).join(', ')}
            {order.deliveryNotes ? ` — ${order.deliveryNotes}` : ''}
          </p>
        ) : null}
        {order.notes ? <p className="text-muted">{order.notes}</p> : null}
      </div>

      {next ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-4">
          <ActionButton
            variant="primary"
            size="md"
            action={async () => {
              'use server'
              return setOrderStatus(order.id, next.status)
            }}
          >
            {next.label}
          </ActionButton>

          <ActionButton
            variant="quiet"
            confirm={`Cancel ${order.orderNumber}? This does NOT refund the customer — do that in Stripe.`}
            action={async () => {
              'use server'
              return setOrderStatus(order.id, 'CANCELLED')
            }}
          >
            Cancel
          </ActionButton>
        </div>
      ) : null}
    </article>
  )
}
