import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import { ActionButton } from '@/components/admin/action-button'
import { Badge } from '@/components/ui'
import { TextInput } from '@/components/checkout/field'
import { Button } from '@/components/ui'
import { prisma } from '@/lib/db'
import { formatPence } from '@/lib/money'
import { requireBranch } from '@/server/branch'
import { toggleItemAvailability } from '@/server/admin-actions'

export const metadata = { title: 'Menu' }
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ filter?: string; q?: string }> }

export default async function AdminMenuPage({ searchParams }: Props) {
  const { filter, q } = await searchParams
  const branch = await requireBranch()

  const items = await prisma.menuItem.findMany({
    where: {
      category: { menu: { branchId: branch.id } },
      ...(filter === 'unconfirmed' ? { allergensConfirmed: false } : {}),
      ...(filter === 'soldout' ? { isAvailable: false } : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
    },
    orderBy: [{ category: { menu: { sortOrder: 'asc' } } }, { category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    include: { category: { include: { menu: { select: { name: true, slug: true } } } } },
  })

  const unconfirmed = await prisma.menuItem.count({
    where: { category: { menu: { branchId: branch.id } }, allergensConfirmed: false },
  })

  // Group for display so the list reads like the menu rather than a database table.
  const groups = new Map<string, typeof items>()
  for (const item of items) {
    const key = `${item.category.menu.name} — ${item.category.name}`
    groups.set(key, [...(groups.get(key) ?? []), item])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Menu</h1>
        <p className="mt-1.5 text-sm text-muted">
          Change a price, mark something sold out, or fill in allergens. Changes are live within
          five minutes.
        </p>
      </div>

      {unconfirmed > 0 ? (
        <div className="flex gap-3 rounded-2xl border border-warn/30 bg-warn-wash p-4 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
          <p>
            <strong className="font-semibold">{unconfirmed} dishes still need allergens.</strong> Until
            a dish is confirmed the website tells customers the information is unconfirmed and asks
            them to call — which is honest, but it is not what the law wants long-term.
          </p>
        </div>
      ) : null}

      <form className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label htmlFor="q" className="block text-sm font-medium">
            Search dishes
          </label>
          <TextInput id="q" name="q" defaultValue={q ?? ''} placeholder="butter chicken" className="mt-2" />
        </div>
        <input type="hidden" name="filter" value={filter ?? ''} />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <nav aria-label="Filter">
        <ul className="flex flex-wrap gap-2">
          {[
            { key: '', label: `All (${items.length})` },
            { key: 'unconfirmed', label: 'Needs allergens' },
            { key: 'soldout', label: 'Sold out' },
          ].map((entry) => (
            <li key={entry.key}>
              <Link
                href={entry.key ? `/admin/menu?filter=${entry.key}` : '/admin/menu'}
                className={
                  (filter ?? '') === entry.key
                    ? 'inline-flex min-h-10 items-center rounded-full bg-brand px-4 text-sm text-on-brand'
                    : 'inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 text-sm'
                }
              >
                {entry.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-8 text-center text-muted">
          Nothing matches.
        </p>
      ) : (
        <div className="space-y-8">
          {[...groups.entries()].map(([heading, groupItems]) => (
            <section key={heading}>
              <h2 className="text-lg">{heading}</h2>
              <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-surface">
                {groupItems.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <Link
                      href={`/admin/menu/${item.id}`}
                      className="min-w-0 flex-1 font-medium hover:text-brand-text"
                    >
                      {item.name}
                    </Link>

                    <span className="tabular-nums text-muted">{formatPence(item.priceInPence)}</span>

                    {!item.allergensConfirmed ? <Badge tone="warn">no allergens</Badge> : null}
                    {!item.isAvailable ? <Badge tone="danger">sold out</Badge> : null}
                    {item.staffNote ? <Badge tone="accent">note</Badge> : null}

                    <ActionButton
                      action={async () => {
                        'use server'
                        return toggleItemAvailability(item.id, !item.isAvailable)
                      }}
                    >
                      {item.isAvailable ? 'Sold out' : 'Back on'}
                    </ActionButton>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
