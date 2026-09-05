import Link from 'next/link'
import { CalendarDays, PartyPopper, Receipt, TriangleAlert } from 'lucide-react'
import { PauseOrders } from '@/components/admin/pause-orders'
import { Badge } from '@/components/ui'
import { prisma } from '@/lib/db'
import { formatInLondon, localDateKey, zonedTimeToInstant } from '@/lib/hours'
import { formatPence } from '@/lib/money'
import { getServiceState, requireBranch } from '@/server/branch'

export const metadata = { title: 'Today' }
export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const branch = await requireBranch()
  const now = new Date()
  const state = getServiceState(branch, now)

  const todayKey = localDateKey(now, branch.timezone)
  const dayStart = zonedTimeToInstant(todayKey, 0, branch.timezone)
  const dayEnd = zonedTimeToInstant(todayKey, 1440, branch.timezone)

  const [liveOrders, todayOrders, newReservations, newEnquiries, unconfirmedAllergens, soldOut] =
    await Promise.all([
      prisma.order.findMany({
        where: { branchId: branch.id, status: { in: ['PAID', 'ACCEPTED', 'PREPARING', 'READY'] } },
        orderBy: { requestedFor: 'asc' },
        take: 8,
        include: { items: { select: { id: true } } },
      }),
      prisma.order.aggregate({
        where: {
          branchId: branch.id,
          paidAt: { gte: dayStart, lt: dayEnd },
          status: { notIn: ['CANCELLED', 'PENDING_PAYMENT'] },
        },
        _sum: { totalInPence: true },
        _count: true,
      }),
      prisma.reservation.count({ where: { status: 'REQUESTED' } }),
      prisma.eventEnquiry.count({ where: { status: 'NEW' } }),
      prisma.menuItem.count({ where: { allergensConfirmed: false } }),
      prisma.menuItem.count({ where: { isAvailable: false } }),
    ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl">Today</h1>
        <p className="mt-1.5 text-sm text-muted">
          {formatInLondon(now, 'EEEE d MMMM', branch.timezone)} ·{' '}
          {state.isOpen && state.closesAt
            ? `open until ${formatInLondon(state.closesAt, 'HH:mm', branch.timezone)}`
            : state.nextOpensAt
              ? `closed, opens ${formatInLondon(state.nextOpensAt, "EEEE 'at' HH:mm", branch.timezone)}`
              : 'no hours set'}
        </p>
      </div>

      <PauseOrders branchId={branch.id} acceptsOrders={branch.acceptsOrders} />

      {unconfirmedAllergens > 0 ? (
        <div className="flex gap-3 rounded-2xl border border-warn/30 bg-warn-wash p-5">
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-warn" />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold text-ink">
              {unconfirmedAllergens} dishes have no confirmed allergen information
            </p>
            <p className="mt-1 text-ink/85">
              Until they do, the website tells customers the information is unconfirmed and asks
              them to call. This is a legal requirement, not a nice-to-have.{' '}
              <Link href="/admin/menu?filter=unconfirmed" className="font-medium underline underline-offset-2">
                Work through the list
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Paid today" value={String(todayOrders._count)} icon={Receipt} />
        <Stat label="Taken today" value={formatPence(todayOrders._sum.totalInPence ?? 0)} icon={Receipt} />
        <Stat
          label="Booking requests"
          value={String(newReservations)}
          icon={CalendarDays}
          href="/admin/reservations"
        />
        <Stat label="New event enquiries" value={String(newEnquiries)} icon={PartyPopper} href="/admin/enquiries" />
      </div>

      <section aria-labelledby="live-orders">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="live-orders" className="text-xl">
            In the kitchen
          </h2>
          <Link href="/admin/orders" className="text-sm text-brand-text underline underline-offset-4">
            All orders
          </Link>
        </div>

        {liveOrders.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-line bg-surface p-6 text-sm text-muted">
            Nothing on the pass.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
            {liveOrders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span className="font-mono text-sm">{order.orderNumber}</span>
                <Badge tone={order.status === 'PAID' ? 'brand' : 'neutral'}>{order.status}</Badge>
                <span className="text-sm text-muted">
                  {order.type} · {order.items.length} items ·{' '}
                  {formatInLondon(order.requestedFor, 'HH:mm', branch.timezone)}
                </span>
                <span className="ml-auto text-sm tabular-nums">{formatPence(order.totalInPence)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {soldOut > 0 ? (
        <p className="text-sm text-muted">
          {soldOut} {soldOut === 1 ? 'dish is' : 'dishes are'} marked sold out.{' '}
          <Link href="/admin/menu?filter=soldout" className="underline underline-offset-2">
            Review them
          </Link>
          .
        </p>
      ) : null}
    </div>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string
  value: string
  icon: typeof Receipt
  href?: string
}) {
  const body = (
    <>
      <Icon aria-hidden className="size-4 text-accent" />
      <p className="mt-3 font-display text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-sm text-muted">{label}</p>
    </>
  )

  return href ? (
    <Link href={href} className="rounded-2xl border border-line bg-surface p-5 transition-colors hover:bg-surface-2">
      {body}
    </Link>
  ) : (
    <div className="rounded-2xl border border-line bg-surface p-5">{body}</div>
  )
}
