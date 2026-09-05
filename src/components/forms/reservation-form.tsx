'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { CalendarCheck, TriangleAlert } from 'lucide-react'
import { Field, TextArea, TextInput, inputClass } from '@/components/checkout/field'
import { Button } from '@/components/ui'

type Time = { iso: string; label: string }

/**
 * Table booking.
 *
 * Times are fetched for the chosen date rather than shipped for the next ninety days, and a day
 * the restaurant is closed says so instead of offering times nobody will honour. The submission is
 * re-checked on the server against the same rules — the dropdown is a convenience, not the guard.
 */
export function ReservationForm({ minDate, maxDate }: { minDate: string; maxDate: string }) {
  const [date, setDate] = useState('')
  const [loaded, setLoaded] = useState<{ date: string; times: Time[]; closed: boolean } | null>(null)

  // Derived from what came back, so clearing the date needs no effect and no second state update.
  // `loaded.date === date` also means a slow response for a previously chosen day can never be
  // shown against the day the customer has since picked.
  const times = loaded?.date === date ? loaded.times : []
  const isClosedThatDay = loaded?.date === date && loaded.closed
  const isLoadingTimes = Boolean(date) && loaded?.date !== date

  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    partySize: '2',
    dateTime: '',
    occasion: '',
    allergyNotes: '',
    notes: '',
  })
  const [fields, setFields] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const set = (key: keyof typeof values) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }))

  useEffect(() => {
    if (!date) return
    const controller = new AbortController()

    fetch(`/api/reservations/times?date=${date}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: { times: Time[]; closed: boolean }) => {
        setLoaded({ date, times: data.times ?? [], closed: Boolean(data.closed) })
        setValues((current) => ({ ...current, dateTime: data.times?.[0]?.iso ?? '' }))
      })
      .catch(() => undefined)

    return () => controller.abort()
  }, [date])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFormError(null)
    setFields({})

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          phone: values.phone,
          partySize: Number(values.partySize),
          dateTime: values.dateTime,
          occasion: values.occasion || null,
          allergyNotes: values.allergyNotes || null,
          notes: values.notes || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setFormError(data.error ?? 'We could not save that.')
        if (data.fields) setFields(data.fields)
        return
      }
      setReference(data.reference)
    } catch {
      setFormError('We could not reach the booking system. Please call us on 01628 825753.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (reference) {
    return (
      <div role="status" className="rounded-2xl border border-ok/25 bg-ok-wash p-6 sm:p-8">
        <CalendarCheck aria-hidden className="size-7 text-ok" />
        <h2 className="mt-4 text-2xl">We have your request</h2>
        <p className="mt-3 leading-relaxed text-ink/85">
          Reference <strong>{reference}</strong>. We will call or email to confirm shortly —
          the table is not held until we do, so if it is urgent please ring us on{' '}
          <a href="tel:+441628825753" className="font-medium underline underline-offset-2">
            01628 825753
          </a>
          .
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" required error={fields.name}>
          {(props) => (
            <TextInput
              {...props}
              autoComplete="name"
              value={values.name}
              onChange={(e) => set('name')(e.target.value)}
            />
          )}
        </Field>

        <Field label="Phone" required error={fields.phone} hint="We confirm bookings by phone.">
          {(props) => (
            <TextInput
              {...props}
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={values.phone}
              onChange={(e) => set('phone')(e.target.value)}
            />
          )}
        </Field>
      </div>

      <Field label="Email" required error={fields.email}>
        {(props) => (
          <TextInput
            {...props}
            type="email"
            autoComplete="email"
            inputMode="email"
            value={values.email}
            onChange={(e) => set('email')(e.target.value)}
          />
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="How many?" required error={fields.partySize}>
          {(props) => (
            <TextInput
              {...props}
              type="number"
              min={1}
              max={30}
              inputMode="numeric"
              value={values.partySize}
              onChange={(e) => set('partySize')(e.target.value)}
            />
          )}
        </Field>

        <Field label="Date" required>
          {(props) => (
            <TextInput
              {...props}
              type="date"
              min={minDate}
              max={maxDate}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
        </Field>

        <Field label="Time" required error={fields.dateTime}>
          {(props) => (
            <select
              {...props}
              className={inputClass}
              disabled={!date || times.length === 0}
              value={values.dateTime}
              onChange={(e) => set('dateTime')(e.target.value)}
            >
              {!date ? <option value="">Pick a date first</option> : null}
              {date && isLoadingTimes ? <option value="">Loading…</option> : null}
              {date && !isLoadingTimes && times.length === 0 ? (
                <option value="">Closed that day</option>
              ) : null}
              {times.map((time) => (
                <option key={time.iso} value={time.iso}>
                  {time.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      {isClosedThatDay && date && !isLoadingTimes ? (
        <p role="status" className="flex gap-2.5 rounded-xl border border-warn/30 bg-warn-wash p-4 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
          <span>
            We are closed that day, or the last sitting has passed. Please choose another date — our
            hours are at the bottom of every page.
          </span>
        </p>
      ) : null}

      <Field label="Occasion" error={fields.occasion} hint="Birthday, anniversary, first date — we like to know.">
        {(props) => (
          <TextInput
            {...props}
            value={values.occasion}
            onChange={(e) => set('occasion')(e.target.value)}
          />
        )}
      </Field>

      <Field
        label="Allergies or dietary requirements"
        error={fields.allergyNotes}
        hint="Tell us now and the kitchen can plan. If an allergy is serious, please also call us."
      >
        {(props) => (
          <TextArea
            {...props}
            value={values.allergyNotes}
            onChange={(e) => set('allergyNotes')(e.target.value)}
          />
        )}
      </Field>

      <Field label="Anything else?" error={fields.notes}>
        {(props) => (
          <TextArea {...props} value={values.notes} onChange={(e) => set('notes')(e.target.value)} />
        )}
      </Field>

      {formError ? (
        <p role="alert" className="flex gap-2.5 rounded-xl border border-danger/30 bg-danger-wash p-4 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
          <span>{formError}</span>
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting || !values.dateTime}>
        {isSubmitting ? 'Sending…' : 'Request this table'}
      </Button>
    </form>
  )
}
