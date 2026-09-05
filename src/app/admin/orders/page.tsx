import { Badge } from '@/components/ui'
import { OrderCard } from '@/components/admin/order-card'
import { prisma } from '@/lib/db'
import { requireBranch } from '@/server/branch'

export const metadata = { title: 'Orders' }
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ show?: string }> }

const LIVE = ['PAID', 'ACCEPTED', 'PREPARING', 'READY'] as const

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { show } = await searchParams
  const branch = await requireBranch()

  const showAll = show === 'all'

  const orders = await prisma.order.findMany({
    where: {
      branchId: branch.id,
      status: showAll ? { not: 'PENDING_PAYMENT' } : { in: [...LIVE] },
    },
    orderBy: showAll ? { createdAt: 'desc' } : { requestedFor: 'asc' },
    take: showAll ? 100 : 50,
    include: { items: true },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl">Orders</h1>
          <p className="mt-1.5 text-sm text-muted">
            {showAll
              ? 'Everything that has been paid for, newest first.'
              : 'On the pass now, soonest first. Unpaid baskets are never shown here.'}
          </p>
        </div>
        <nav aria-label="Filter">
          <ul className="flex gap-2">
            <li>
              <a
                href="/admin/orders"
                className={
                  showAll
                    ? 'inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 text-sm'
                    : 'inline-flex min-h-10 items-center rounded-full bg-brand px-4 text-sm text-on-brand'
                }
              >
                Live
              </a>
            </li>
            <li>
              <a
                href="/admin/orders?show=all"
                className={
                  showAll
                    ? 'inline-flex min-h-10 items-center rounded-full bg-brand px-4 text-sm text-on-brand'
                    : 'inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 text-sm'
                }
              >
                All
              </a>
            </li>
          </ul>
        </nav>
      </div>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-8 text-center text-muted">
          {showAll ? 'No orders yet.' : 'Nothing on the pass.'}
        </p>
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} timezone={branch.timezone} />
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted">
        Refunds are done in Stripe, not here — that keeps a record of who refunded what and when.{' '}
        <Badge tone="neutral">by design</Badge>
      </p>
    </div>
  )
}
