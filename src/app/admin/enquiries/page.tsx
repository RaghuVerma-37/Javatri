import { Phone } from 'lucide-react'
import { ActionButton } from '@/components/admin/action-button'
import { Badge } from '@/components/ui'
import { prisma } from '@/lib/db'
import { formatInLondon } from '@/lib/hours'
import { setEnquiryStatus } from '@/server/admin-actions'

export const metadata = { title: 'Event enquiries' }
export const dynamic = 'force-dynamic'

const TONE = {
  NEW: 'brand',
  CONTACTED: 'warn',
  QUOTED: 'warn',
  WON: 'ok',
  LOST: 'neutral',
} as const

const NEXT = [
  { from: 'NEW', to: 'CONTACTED', label: 'Mark contacted' },
  { from: 'CONTACTED', to: 'QUOTED', label: 'Quote sent' },
  { from: 'QUOTED', to: 'WON', label: 'Booked' },
] as const

export default async function AdminEnquiriesPage() {
  const enquiries = await prisma.eventEnquiry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Event enquiries</h1>
        <p className="mt-1.5 text-sm text-muted">
          The most valuable thing that arrives through the website. Worth a phone call the same day.
        </p>
      </div>

      {enquiries.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface p-8 text-center text-muted">
          No enquiries yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {enquiries.map((enquiry) => {
            const next = NEXT.find((entry) => entry.from === enquiry.status)
            return (
              <li key={enquiry.id} className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-display text-lg font-semibold">{enquiry.eventType}</span>
                  <Badge tone={TONE[enquiry.status]}>{enquiry.status}</Badge>
                  {enquiry.estimatedGuests ? (
                    <Badge tone="neutral">{enquiry.estimatedGuests} guests</Badge>
                  ) : null}
                  {enquiry.preferredDate ? (
                    <Badge tone="accent">
                      {formatInLondon(enquiry.preferredDate, 'd MMM yyyy')}
                    </Badge>
                  ) : null}
                  <span className="ml-auto font-mono text-xs text-muted">{enquiry.reference}</span>
                </div>

                <p className="mt-3 flex flex-wrap items-center gap-x-3 text-sm">
                  <span className="font-medium">{enquiry.name}</span>
                  <a
                    href={`tel:${enquiry.phone.replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-1.5 text-brand-text underline underline-offset-2"
                  >
                    <Phone aria-hidden className="size-3.5" />
                    {enquiry.phone}
                  </a>
                  <a
                    href={`mailto:${enquiry.email}`}
                    className="text-muted underline underline-offset-2"
                  >
                    {enquiry.email}
                  </a>
                </p>

                {enquiry.message ? (
                  <p className="mt-3 whitespace-pre-line rounded-xl bg-surface-2 p-3.5 text-sm leading-relaxed">
                    {enquiry.message}
                  </p>
                ) : null}

                <p className="mt-3 text-xs text-muted">
                  Received {formatInLondon(enquiry.createdAt, "d MMM yyyy 'at' HH:mm")}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {next ? (
                    <ActionButton
                      variant="primary"
                      action={async () => {
                        'use server'
                        return setEnquiryStatus(enquiry.id, next.to)
                      }}
                    >
                      {next.label}
                    </ActionButton>
                  ) : null}
                  {enquiry.status !== 'LOST' && enquiry.status !== 'WON' ? (
                    <ActionButton
                      variant="quiet"
                      action={async () => {
                        'use server'
                        return setEnquiryStatus(enquiry.id, 'LOST')
                      }}
                    >
                      Not going ahead
                    </ActionButton>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
