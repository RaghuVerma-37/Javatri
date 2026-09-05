import { Phone, TriangleAlert } from 'lucide-react'
import { ActionButton } from '@/components/admin/action-button'
import { Badge } from '@/components/ui'
import { prisma } from '@/lib/db'
import { formatInLondon } from '@/lib/hours'
import { requireBranch } from '@/server/branch'
import { setReservationStatus } from '@/server/admin-actions'

export const metadata = { title: 'Bookings' }
export const dynamic = 'force-dynamic'

const TONE = {
  REQUESTED: 'brand',
  CONFIRMED: 'ok',
  SEATED: 'neutral',
  COMPLETED: 'neutral',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
} as const

export default async function AdminReservationsPage() {
  const branch = await requireBranch()

  // Yesterday onward: last night's covers are still useful at the start of a shift.
  const from = new Date()
  from.setUTCDate(from.getUTCDate() - 1)

  const reservations = await prisma.reservation.findMany({
    where: { branchId: branch.id, dateTime: { gte: from } },
    orderBy: { dateTime: 'asc' },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Table bookings</h1>
        <p className="mt-1.5 text-sm text-muted">
          Requests come in unconfirmed — the customer has been told the table is not held until you
          confirm it.
        </p>
      </div>

      {reservations.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-8 text-center text-muted">
          No upcoming bookings.
        </p>
      ) : (
        <ul className="space-y-3">
          {reservations.map((reservation) => (
            <li key={reservation.id} className="rounded-2xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-xl font-semibold tabular-nums">
                  {formatInLondon(reservation.dateTime, 'EEE d MMM · HH:mm', branch.timezone)}
                </span>
                <Badge tone={TONE[reservation.status]}>{reservation.status.replace('_', ' ')}</Badge>
                <Badge tone="neutral">
                  {reservation.partySize} {reservation.partySize === 1 ? 'person' : 'people'}
                </Badge>
                <span className="ml-auto font-mono text-xs text-muted">{reservation.reference}</span>
              </div>

              <p className="mt-3 flex flex-wrap items-center gap-x-3 text-sm">
                <span className="font-medium">{reservation.name}</span>
                <a
                  href={`tel:${reservation.phone.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-1.5 text-brand-text underline underline-offset-2"
                >
                  <Phone aria-hidden className="size-3.5" />
                  {reservation.phone}
                </a>
                <a href={`mailto:${reservation.email}`} className="text-muted underline underline-offset-2">
                  {reservation.email}
                </a>
              </p>

              {reservation.occasion ? (
                <p className="mt-1.5 text-sm text-muted">Occasion: {reservation.occasion}</p>
              ) : null}
              {reservation.notes ? (
                <p className="mt-1.5 text-sm text-muted">{reservation.notes}</p>
              ) : null}

              {reservation.allergyNotes ? (
                <p className="mt-3 flex gap-2.5 rounded-xl border border-danger/25 bg-danger-wash p-3 text-sm">
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
                  <span>
                    <strong className="font-semibold">Allergy:</strong> {reservation.allergyNotes}
                  </span>
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {reservation.status === 'REQUESTED' ? (
                  <ActionButton
                    variant="primary"
                    action={async () => {
                      'use server'
                      return setReservationStatus(reservation.id, 'CONFIRMED')
                    }}
                  >
                    Confirm
                  </ActionButton>
                ) : null}
                {reservation.status === 'CONFIRMED' ? (
                  <ActionButton
                    action={async () => {
                      'use server'
                      return setReservationStatus(reservation.id, 'SEATED')
                    }}
                  >
                    Seated
                  </ActionButton>
                ) : null}
                {reservation.status === 'SEATED' ? (
                  <ActionButton
                    action={async () => {
                      'use server'
                      return setReservationStatus(reservation.id, 'COMPLETED')
                    }}
                  >
                    Finished
                  </ActionButton>
                ) : null}
                {reservation.status !== 'CANCELLED' && reservation.status !== 'COMPLETED' ? (
                  <>
                    <ActionButton
                      variant="quiet"
                      confirm="Cancel this booking? Remember to tell the customer."
                      action={async () => {
                        'use server'
                        return setReservationStatus(reservation.id, 'CANCELLED')
                      }}
                    >
                      Cancel
                    </ActionButton>
                    <ActionButton
                      variant="quiet"
                      action={async () => {
                        'use server'
                        return setReservationStatus(reservation.id, 'NO_SHOW')
                      }}
                    >
                      No show
                    </ActionButton>
                  </>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
