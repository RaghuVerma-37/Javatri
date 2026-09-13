import type { Metadata } from 'next'
import { NotConfigured } from '@/components/not-configured'
import { DemoNotice } from '@/components/demo-notice'
import { isDatabaseConfigured } from '@/server/static-data'
import { ReservationForm } from '@/components/forms/reservation-form'
import { OpenStatus } from '@/components/open-status'
import { breadcrumbSchema, JsonLd } from '@/lib/jsonld'
import { localDateKey, addDaysToDateKey, summariseWeek } from '@/lib/hours'
import { absoluteUrl, formatPhone, telHref } from '@/lib/site'
import { getBranchSafe, getSelectedBranchSlug, getServiceState } from '@/server/branch'
import { RESERVATION_HORIZON_DAYS } from '@/server/ordering'

export const metadata: Metadata = {
  title: 'Book a table',
  description:
    'Book a table at Javatri, The Bell and Bottle, Littlewick Green, Maidenhead. Tell us when and how many and we will confirm by phone.',
  alternates: { canonical: '/book' },
  openGraph: { title: 'Book a table · Javatri', url: absoluteUrl('/book') },
}

export const dynamic = 'force-dynamic'

export default async function BookPage() {
  const branch = await getBranchSafe(await getSelectedBranchSlug())
  if (!branch) return <NotConfigured />
  const now = new Date()
  const today = localDateKey(now, branch.timezone)

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Book a table', path: '/book' },
        ])}
      />

      <div className="container-page py-10 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
          <div className="min-w-0 max-w-2xl">
            <header>
              <p className="text-sm font-medium text-brand-text">
                Littlewick Green
              </p>
              <h1 className="mt-2 text-4xl sm:text-5xl">Book a table</h1>
              <p className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
                Tell us when, and how many, and we will come back to you to confirm. For tonight,
                or for a party of more than ten, it is quicker to ring us.
              </p>
              <div className="mt-5">
                <OpenStatus branch={branch} state={getServiceState(branch, now)} />
              </div>
            </header>

            <div className="mt-10">
              {isDatabaseConfigured() ? (
                <ReservationForm
                  minDate={today}
                  maxDate={addDaysToDateKey(today, RESERVATION_HORIZON_DAYS)}
                />
              ) : (
                <DemoNotice context="form" />
              )}
            </div>
          </div>

          <aside className="h-max space-y-6 rounded-2xl border border-line bg-surface p-6">
            <div>
              <h2 className="text-lg">Opening hours</h2>
              <dl className="mt-3 space-y-2 text-sm">
                {summariseWeek(branch.openingHours).map((row) => (
                  <div key={row.label} className="flex justify-between gap-4">
                    <dt className="text-muted">{row.label}</dt>
                    <dd className="tabular-nums">{row.hours}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="border-t border-line pt-5">
              <h2 className="text-lg">Prefer to call?</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                We answer the phone during service.
              </p>
              <a
                href={telHref(branch.phone)}
                className="mt-2 inline-block font-display text-xl font-semibold text-brand-text underline underline-offset-4"
              >
                {formatPhone(branch.phone)}
              </a>
            </div>

            <div className="border-t border-line pt-5">
              <h2 className="text-lg">Larger groups</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                We seat up to 150 in the banqueting hall. For anything over about twenty people,{' '}
                <a href="/events" className="underline underline-offset-2 hover:text-brand-text">
                  start on the events page
                </a>{' '}
                instead.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
