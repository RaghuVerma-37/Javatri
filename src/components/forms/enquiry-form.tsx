'use client'

import { useState, type FormEvent } from 'react'
import { PartyPopper, TriangleAlert } from 'lucide-react'
import { Field, TextArea, TextInput, inputClass } from '@/components/checkout/field'
import { Button } from '@/components/ui'

const EVENT_TYPES = [
  'Wedding',
  'Pre-wedding function',
  'Birthday or anniversary',
  'Corporate function',
  'Private party',
  'Meeting or conference',
  'Exhibition',
  'Something else',
] as const

/**
 * The event enquiry form.
 *
 * The most valuable form on the site, so it asks for the least. Name, phone, email and what kind
 * of event; everything else is optional. Every extra required field on a form like this loses
 * enquiries, and a rough date is something the conversation can settle.
 */
export function EnquiryForm() {
  const [values, setValues] = useState({
    name: '',
    email: '',
    phone: '',
    eventType: EVENT_TYPES[0] as string,
    estimatedGuests: '',
    preferredDate: '',
    message: '',
  })
  const [fields, setFields] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [reference, setReference] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const set = (key: keyof typeof values) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFormError(null)
    setFields({})

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          phone: values.phone,
          eventType: values.eventType,
          estimatedGuests: values.estimatedGuests ? Number(values.estimatedGuests) : null,
          preferredDate: values.preferredDate || null,
          message: values.message || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setFormError(data.error ?? 'We could not send that.')
        if (data.fields) setFields(data.fields)
        return
      }
      setReference(data.reference)
    } catch {
      setFormError('We could not reach the enquiry system. Please call us on 01628 825753.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (reference) {
    return (
      <div role="status" className="rounded-2xl border border-ok/25 bg-ok-wash p-6 sm:p-8">
        <PartyPopper aria-hidden className="size-7 text-ok" />
        <h2 className="mt-4 text-2xl">Thank you — we have it</h2>
        <p className="mt-3 leading-relaxed text-ink/85">
          Reference <strong>{reference}</strong>. One of us will be in touch within a day to talk it
          through. If you would rather not wait, call{' '}
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
        <Field label="Phone" required error={fields.phone}>
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

      <Field label="What kind of event?" required error={fields.eventType}>
        {(props) => (
          <select
            {...props}
            className={inputClass}
            value={values.eventType}
            onChange={(e) => set('eventType')(e.target.value)}
          >
            {EVENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Roughly how many guests?" error={fields.estimatedGuests} hint="A guess is fine.">
          {(props) => (
            <TextInput
              {...props}
              type="number"
              min={1}
              max={1000}
              inputMode="numeric"
              value={values.estimatedGuests}
              onChange={(e) => set('estimatedGuests')(e.target.value)}
            />
          )}
        </Field>
        <Field label="Date you have in mind" error={fields.preferredDate} hint="Leave it blank if you are still deciding.">
          {(props) => (
            <TextInput
              {...props}
              type="date"
              value={values.preferredDate}
              onChange={(e) => set('preferredDate')(e.target.value)}
            />
          )}
        </Field>
      </div>

      <Field label="Tell us about it" error={fields.message}>
        {(props) => (
          <TextArea
            {...props}
            rows={4}
            placeholder="Dietary requirements, timings, whether you need the whole hall, anything at all."
            value={values.message}
            onChange={(e) => set('message')(e.target.value)}
          />
        )}
      </Field>

      {formError ? (
        <p role="alert" className="flex gap-2.5 rounded-xl border border-danger/30 bg-danger-wash p-4 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
          <span>{formError}</span>
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? 'Sending…' : 'Send enquiry'}
      </Button>
    </form>
  )
}
