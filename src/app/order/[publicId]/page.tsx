import type { Metadata } from 'next'
import { formatPhone, telHref } from '@/lib/site'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, Clock, CookingPot, MapPin, Package, TriangleAlert } from 'lucide-react'
import { OrderStatusLive } from '@/components/order/order-status-live'
import { Badge, ButtonLink } from '@/components/ui'
import { prisma } from '@/lib/db'
import { formatInLondon } from '@/lib/hours'
import { formatPence } from '@/lib/money'
import { outletAddress } from '@/lib/outlet'

export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ publicId: string }> }

const TYPE_LABEL = { PICKUP: 'Collection', DELIVERY: 'Delivery', DINE_IN: 'Eat in' } as const

/**
 * Progress the kitchen actually drives, in the customer's language.
 * "PREPARING" is what the database calls it; "in the kitchen" is what a person understands.
 */
const STEPS = [
  { status: 'PAID', label: 'Order received', icon: Check },
  { status: 'ACCEPTED', label: 'Accepted by the kitchen', icon: Check },
  { status: 'PREPARING', label: 'Being cooked', icon: CookingPot },
  { status: 'READY', label: 'Ready', icon: Package },
  { status: 'COMPLETED', label: 'Done', icon: Check },
] as const

const ORDER_OF_STATUS: Record<string, number> = {
  PENDING_PAYMENT: -1,
  PAID: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 3,
  COMPLETED: 4,
}

export default async function OrderStatusPage({ params }: Params) {
  const { publicId } = await params

  const order = await prisma.order.findUnique({
    where: { publicId },
    include: {
      items: true,
      branch: {
        select: {
          phone: true,
          timezone: true,
          slug: true,
          name: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          postcode: true,
        },
      },
    },
  })

  if (!order) notFound()

  const step = ORDER_OF_STATUS[order.status] ?? -1
  const when = formatInLondon(order.requestedFor, "EEEE d MMMM 'at' HH:mm", order.branch.timezone)

  return (
    <div className="container-page max-w-3xl py-10 sm:py-16">
      <OrderStatusLive status={order.status} />

      {order.status === 'PENDING_PAYMENT' ? (
        <header className="rounded-2xl border border-warn/30 bg-warn-wash p-5 sm:p-6">
          <h1 className="text-2xl">Waiting for your payment to clear</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink/85">
            This page updates itself — there is no need to reload. If it is still saying this in a
            minute, your card was probably declined and nothing has been charged. Give us a call on{' '}
            <a href={telHref(order.branch.phone)} className="font-medium underline underline-offset-2">
              {formatPhone(order.branch.phone)}
            </a>{' '}
            and quote {order.orderNumber}.
          </p>
        </header>
      ) : order.status === 'CANCELLED' ? (
        <header className="rounded-2xl border border-danger/30 bg-danger-wash p-5 sm:p-6">
          <h1 className="flex items-center gap-2 text-2xl">
            <TriangleAlert aria-hidden className="size-5 text-danger" />
            This order did not go through
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink/85">
            {order.cancellationReason ?? 'The payment was not completed.'} Nothing has been charged.
          </p>
          <ButtonLink href="/order" size="sm" className="mt-4">
            Try again
          </ButtonLink>
        </header>
      ) : (
        <header>
          <Badge tone="ok">Paid</Badge>
          <h1 className="mt-3 text-4xl sm:text-5xl">Thank you, {order.customerName.split(' ')[0]}</h1>
          <p className="mt-3 text-lg text-muted">
            {TYPE_LABEL[order.type]} · <span className="text-ink">{when}</span>
          </p>
          <p className="mt-1.5 text-sm text-muted">
            Order <span className="font-medium text-ink">{order.orderNumber}</span> — quote this if
            you call.
          </p>
        </header>
      )}

      {step >= 0 ? (
        <ol className="mt-10 space-y-0">
          {STEPS.map((entry, index) => {
            const done = step >= index
            const current = step === index
            const Icon = entry.icon
            return (
              <li key={entry.status} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <span
                    className={
                      done
                        ? 'flex size-9 items-center justify-center rounded-full bg-brand text-on-brand'
                        : 'flex size-9 items-center justify-center rounded-full border border-line text-muted'
                    }
                  >
                    <Icon aria-hidden className="size-4" />
                  </span>
                  {index < STEPS.length - 1 ? (
                    <span
                      aria-hidden
                      className={done ? 'w-px flex-1 bg-brand' : 'w-px flex-1 bg-line'}
                    />
                  ) : null}
                </div>
                <p className={`pb-8 pt-1.5 ${current ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-muted'}`}>
                  {entry.label}
                  {current ? <span className="sr-only"> — current status</span> : null}
                </p>
              </li>
            )
          })}
        </ol>
      ) : null}

      <section aria-labelledby="order-items" className="mt-4 rounded-2xl border border-line bg-surface">
        <h2 id="order-items" className="border-b border-line px-5 py-4 font-display text-lg font-semibold">
          What you ordered
        </h2>
        <ul className="divide-y divide-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3 px-5 py-3.5 text-sm">
              <span className="shrink-0 tabular-nums text-muted">{item.quantity}×</span>
              <span className="min-w-0 flex-1">
                {item.nameSnapshot}
                {item.notes ? (
                  <span className="block text-xs italic text-muted">&ldquo;{item.notes}&rdquo;</span>
                ) : null}
              </span>
              <span className="shrink-0 tabular-nums">{formatPence(item.lineTotalInPence)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-line px-5 py-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatPence(order.subtotalInPence)}</dd>
          </div>
          {order.deliveryFeeInPence > 0 ? (
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd className="tabular-nums">{formatPence(order.deliveryFeeInPence)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPence(order.totalInPence)}</dd>
          </div>
        </dl>
      </section>

      {order.type === 'DELIVERY' ? (
        <p className="mt-4 flex gap-2.5 text-sm text-muted">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
          Delivering to {[order.addressLine1, order.city, order.postcode].filter(Boolean).join(', ')}
        </p>
      ) : order.type === 'PICKUP' ? (
        <p className="mt-4 flex gap-2.5 text-sm text-muted">
          <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
          {/* The kitchen the order was placed with. Without a street, the trading name leads so
              "Collect from" never points at a whole village. */}
          Collect from{' '}
          {order.branch.addressLine1
            ? outletAddress(order.branch)
            : [order.branch.name, outletAddress(order.branch)].filter(Boolean).join(', ')}
        </p>
      ) : null}

      {order.allergyNotes ? (
        <p className="mt-4 rounded-xl border border-warn/30 bg-warn-wash p-4 text-sm">
          <span className="font-semibold">Allergy note passed to the kitchen:</span>{' '}
          {order.allergyNotes}
        </p>
      ) : null}

      <p className="mt-8 text-sm text-muted">
        Something not right?{' '}
        <a href={telHref(order.branch.phone)} className="underline underline-offset-4 hover:text-brand-text">
          Call us on {formatPhone(order.branch.phone)}
        </a>{' '}
        or{' '}
        <Link href="/menu" className="underline underline-offset-4 hover:text-brand-text">
          look at the menu again
        </Link>
        .
      </p>
    </div>
  )
}
