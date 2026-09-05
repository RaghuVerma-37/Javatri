import { ActionButton } from '@/components/admin/action-button'
import { ActionForm } from '@/components/admin/action-form'
import { TextInput, inputClass } from '@/components/checkout/field'
import { DAY_NAMES, formatMinutes } from '@/lib/hours'
import { requireBranch } from '@/server/branch'
import { addHoliday, deleteHoliday, updateOpeningHours } from '@/server/admin-actions'

export const metadata = { title: 'Opening hours' }
export const dynamic = 'force-dynamic'

/** Monday first, because that is how a British rota reads. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

export default async function AdminHoursPage() {
  const branch = await requireBranch()

  const byDay = new Map<number, { opensAt: number; closesAt: number }>()
  for (const row of branch.openingHours) {
    if (!byDay.has(row.dayOfWeek)) byDay.set(row.dayOfWeek, row)
  }

  return (
    <div className="max-w-2xl space-y-10">
      <div>
        <h1 className="text-3xl">Opening hours</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          These hours decide when the website takes orders and bookings, so they need to be right.
          Everything is in 24-hour time. A closing time earlier than the opening time means you close
          after midnight — 23:00 to 01:00 works.
        </p>
      </div>

      <section aria-labelledby="week-heading">
        <h2 id="week-heading" className="text-xl">
          The usual week
        </h2>

        <ActionForm action={updateOpeningHours} className="mt-4">
          <input type="hidden" name="branchId" value={branch.id} />

          <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {WEEK_ORDER.map((day) => {
              const hours = byDay.get(day)
              return (
                <li key={day} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className="w-24 shrink-0 font-medium">{DAY_NAMES[day]}</span>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`closed-${day}`}
                      defaultChecked={!hours}
                      className="size-4 accent-[var(--brand)]"
                    />
                    Closed
                  </label>

                  <span className="ml-auto flex items-center gap-2">
                    <label className="sr-only" htmlFor={`opens-${day}`}>
                      {DAY_NAMES[day]} opening time
                    </label>
                    <input
                      id={`opens-${day}`}
                      name={`opens-${day}`}
                      type="time"
                      defaultValue={hours ? formatMinutes(hours.opensAt) : '15:00'}
                      className={`${inputClass} w-32`}
                    />
                    <span aria-hidden className="text-muted">
                      to
                    </span>
                    <label className="sr-only" htmlFor={`closes-${day}`}>
                      {DAY_NAMES[day]} closing time
                    </label>
                    <input
                      id={`closes-${day}`}
                      name={`closes-${day}`}
                      type="time"
                      defaultValue={hours ? formatMinutes(hours.closesAt) : '22:00'}
                      className={`${inputClass} w-32`}
                    />
                  </span>
                </li>
              )
            })}
          </ul>
        </ActionForm>
      </section>

      <section aria-labelledby="holiday-heading">
        <h2 id="holiday-heading" className="text-xl">
          Closures and one-off hours
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Bank holidays, a family wedding, a late licence. These beat the usual week for that date.
        </p>

        {branch.holidays.length > 0 ? (
          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
            {branch.holidays.map((holiday) => (
              <li key={holiday.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="font-medium tabular-nums">
                  {holiday.date.toISOString().slice(0, 10)}
                </span>
                <span className="text-muted">
                  {holiday.isClosed
                    ? 'Closed all day'
                    : `${formatMinutes(holiday.opensAt ?? 0)}–${formatMinutes(holiday.closesAt ?? 0)}`}
                  {holiday.note ? ` · ${holiday.note}` : ''}
                </span>
                <span className="ml-auto">
                  <ActionButton
                    variant="quiet"
                    action={async () => {
                      'use server'
                      return deleteHoliday(holiday.id)
                    }}
                  >
                    Remove
                  </ActionButton>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
            None set. The usual week applies every day.
          </p>
        )}

        <ActionForm action={addHoliday} submitLabel="Add closure" className="mt-6 space-y-4">
          <input type="hidden" name="branchId" value={branch.id} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="date" className="block text-sm font-medium">
                Date
              </label>
              <TextInput id="date" name="date" type="date" required className="mt-2" />
            </div>

            <div>
              <label htmlFor="note" className="block text-sm font-medium">
                Note
              </label>
              <TextInput id="note" name="note" placeholder="Christmas Day" className="mt-2" />
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              name="isClosed"
              defaultChecked
              className="size-4 accent-[var(--brand)]"
            />
            Closed all day
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="opensAt" className="block text-sm font-medium">
                Or open from
              </label>
              <TextInput id="opensAt" name="opensAt" type="time" className="mt-2" />
            </div>
            <div>
              <label htmlFor="closesAt" className="block text-sm font-medium">
                until
              </label>
              <TextInput id="closesAt" name="closesAt" type="time" className="mt-2" />
            </div>
          </div>
          <p className="text-xs text-muted">
            Leave &ldquo;closed all day&rdquo; ticked to shut completely, or untick it and give the
            special hours.
          </p>
        </ActionForm>
      </section>
    </div>
  )
}
