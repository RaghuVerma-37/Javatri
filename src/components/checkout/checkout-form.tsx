'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { Lock, TriangleAlert } from 'lucide-react'
import { useCart } from '@/components/cart/cart-context'
import { Field, TextArea, TextInput } from '@/components/checkout/field'
import { Button } from '@/components/ui'
import { formatPence } from '@/lib/money'
import type { SlotOption } from '@/components/order/slot-picker'

/**
 * Checkout, in two steps: details, then card.
 *
 * The Payment Element cannot mount until there is a client secret, and a client secret cannot
 * exist until the server has priced the order — which is exactly the right order of events. By the
 * time a card field appears on screen, the amount has already been computed from the database and
 * handed to Stripe. Nothing the customer can edit is between those two facts.
 */

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

type Details = {
  customerName: string
  customerEmail: string
  customerPhone: string
  addressLine1: string
  addressLine2: string
  city: string
  postcode: string
  deliveryNotes: string
  partySize: string
  allergyNotes: string
  notes: string
}

const EMPTY: Details = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postcode: '',
  deliveryNotes: '',
  partySize: '2',
  allergyNotes: '',
  notes: '',
}

type Created = { clientSecret: string; publicId: string; orderNumber: string; totalInPence: number }

export function CheckoutForm({ slots }: { slots: Record<string, SlotOption[]> }) {
  const { state, pricing, isPricing } = useCart()
  const [details, setDetails] = useState<Details>({ ...EMPTY, postcode: state.postcode ?? '' })
  const [fields, setFields] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [created, setCreated] = useState<Created | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedSlot = useMemo(() => {
    const list = slots[state.orderType] ?? []
    return list.find((slot) => slot.iso === state.requestedFor) ?? list[0] ?? null
  }, [slots, state.orderType, state.requestedFor])

  const set = (key: keyof Details) => (value: string) =>
    setDetails((current) => ({ ...current, [key]: value }))

  const submitDetails = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setFormError(null)
    setFields({})

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orderType: state.orderType,
          lines: state.lines,
          requestedFor: state.requestedFor,
          isAsap: state.requestedFor === null,
          customerName: details.customerName,
          customerEmail: details.customerEmail,
          customerPhone: details.customerPhone,
          addressLine1: state.orderType === 'DELIVERY' ? details.addressLine1 : null,
          addressLine2: state.orderType === 'DELIVERY' ? details.addressLine2 || null : null,
          city: state.orderType === 'DELIVERY' ? details.city || null : null,
          postcode: state.orderType === 'DELIVERY' ? details.postcode : null,
          deliveryNotes: state.orderType === 'DELIVERY' ? details.deliveryNotes || null : null,
          partySize: state.orderType === 'DINE_IN' ? Number(details.partySize) || null : null,
          allergyNotes: details.allergyNotes || null,
          notes: details.notes || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setFormError(data.error ?? 'We could not take that order.')
        if (data.fields) setFields(data.fields)
        return
      }

      setCreated(data as Created)
    } catch {
      setFormError('We could not reach the payment system. Nothing has been charged.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!stripePromise) {
    return (
      <div className="rounded-2xl border border-warn/30 bg-warn-wash p-5">
        <p className="font-semibold text-ink">Card payment is not switched on yet</p>
        <p className="mt-1.5 text-sm text-ink/85">
          This deployment has no Stripe key. Please{' '}
          <a href="tel:+441628825753" className="font-medium underline underline-offset-2">
            call us on 01628 825753
          </a>{' '}
          to place your order.
        </p>
      </div>
    )
  }

  if (created) {
    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret: created.clientSecret,
          appearance: {
            theme: 'flat',
            variables: {
              colorPrimary: '#8a1c1c',
              colorBackground: '#ffffff',
              colorText: '#1b1714',
              borderRadius: '12px',
              fontFamily: 'system-ui, sans-serif',
            },
          },
        }}
      >
        <PaymentStep created={created} slotLabel={selectedSlot} />
      </Elements>
    )
  }

  const isDelivery = state.orderType === 'DELIVERY'

  return (
    <form onSubmit={submitDetails} noValidate className="space-y-8">
      <section aria-labelledby="your-details" className="space-y-4">
        <h2 id="your-details" className="text-xl">
          Your details
        </h2>

        <Field label="Name" required error={fields.customerName}>
          {(props) => (
            <TextInput
              {...props}
              name="name"
              autoComplete="name"
              value={details.customerName}
              onChange={(e) => set('customerName')(e.target.value)}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" required error={fields.customerEmail} hint="For your receipt.">
            {(props) => (
              <TextInput
                {...props}
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={details.customerEmail}
                onChange={(e) => set('customerEmail')(e.target.value)}
              />
            )}
          </Field>

          <Field
            label="Phone"
            required
            error={fields.customerPhone}
            hint="So the kitchen or driver can reach you."
          >
            {(props) => (
              <TextInput
                {...props}
                type="tel"
                name="tel"
                autoComplete="tel"
                inputMode="tel"
                value={details.customerPhone}
                onChange={(e) => set('customerPhone')(e.target.value)}
              />
            )}
          </Field>
        </div>
      </section>

      {isDelivery ? (
        <section aria-labelledby="delivery-address" className="space-y-4">
          <h2 id="delivery-address" className="text-xl">
            Delivery address
          </h2>

          <Field label="Address" required error={fields.addressLine1}>
            {(props) => (
              <TextInput
                {...props}
                autoComplete="address-line1"
                value={details.addressLine1}
                onChange={(e) => set('addressLine1')(e.target.value)}
              />
            )}
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Town" error={fields.city}>
              {(props) => (
                <TextInput
                  {...props}
                  autoComplete="address-level2"
                  value={details.city}
                  onChange={(e) => set('city')(e.target.value)}
                />
              )}
            </Field>

            <Field label="Postcode" required error={fields.postcode}>
              {(props) => (
                <TextInput
                  {...props}
                  autoComplete="postal-code"
                  className="uppercase"
                  value={details.postcode}
                  onChange={(e) => set('postcode')(e.target.value)}
                />
              )}
            </Field>
          </div>

          <Field label="Anything the driver should know" error={fields.deliveryNotes}>
            {(props) => (
              <TextInput
                {...props}
                placeholder="Second gate, buzzer broken, park on the road"
                value={details.deliveryNotes}
                onChange={(e) => set('deliveryNotes')(e.target.value)}
              />
            )}
          </Field>
        </section>
      ) : null}

      {state.orderType === 'DINE_IN' ? (
        <Field label="How many of you?" required error={fields.partySize}>
          {(props) => (
            <TextInput
              {...props}
              type="number"
              min={1}
              max={30}
              inputMode="numeric"
              className="max-w-28"
              value={details.partySize}
              onChange={(e) => set('partySize')(e.target.value)}
            />
          )}
        </Field>
      ) : null}

      {/*
        The FSA notice, again, at the point of sale. For distance selling the information has to be
        available before the order is placed as well as with the food, and a box to tell us has to
        actually reach the kitchen — it goes on the ticket in red.
      */}
      <section aria-labelledby="allergies" className="rounded-2xl border border-warn/30 bg-warn-wash p-4 sm:p-5">
        <h2 id="allergies" className="flex items-center gap-2 text-base font-semibold text-ink">
          <TriangleAlert aria-hidden className="size-4 text-warn" />
          Allergies and intolerances
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/85">
          Our dishes are prepared in a kitchen where all 14 regulated allergens are handled, so we
          cannot guarantee any dish is free from traces. If your allergy is serious, please{' '}
          <a href="tel:+441628825753" className="font-medium underline underline-offset-2">
            call us on 01628 825753
          </a>{' '}
          as well as writing it here.
        </p>
        <Field
          label="Tell the kitchen about any allergies"
          error={fields.allergyNotes}
          className="mt-4"
        >
          {(props) => (
            <TextArea
              {...props}
              placeholder="e.g. severe nut allergy — no cashew or almond in anything"
              value={details.allergyNotes}
              onChange={(e) => set('allergyNotes')(e.target.value)}
            />
          )}
        </Field>
      </section>

      <Field label="Anything else?" error={fields.notes}>
        {(props) => (
          <TextArea
            {...props}
            placeholder="e.g. extra napkins, we'll be a few minutes late"
            value={details.notes}
            onChange={(e) => set('notes')(e.target.value)}
          />
        )}
      </Field>

      {formError ? (
        <p role="alert" className="flex gap-2.5 rounded-xl border border-danger/30 bg-danger-wash p-4 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
          <span>{formError}</span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || isPricing || !pricing?.isOrderable}
        >
          {isSubmitting ? 'Just a moment…' : 'Continue to payment'}
        </Button>
        <Link href="/order" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
          Back to the menu
        </Link>
      </div>

      {!pricing?.isOrderable && !isPricing ? (
        <p role="status" className="text-sm text-warn">
          There is something wrong with your basket — check it on the right before continuing.
        </p>
      ) : null}
    </form>
  )
}

function PaymentStep({ created, slotLabel }: { created: Created; slotLabel: SlotOption | null }) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [isPaying, setIsPaying] = useState(false)

  const pay = async (event: FormEvent) => {
    event.preventDefault()
    if (!stripe || !elements) return

    setIsPaying(true)
    setError(null)

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // The order is confirmed by the webhook, not by this redirect. This page is where the
        // customer lands, not where the order becomes real.
        return_url: `${window.location.origin}/order/${created.publicId}`,
      },
    })

    if (result.error) {
      setError(result.error.message ?? 'Your card was not accepted. Nothing has been charged.')
      setIsPaying(false)
    }
  }

  return (
    <form onSubmit={pay} className="space-y-6">
      <div>
        <h2 className="text-xl">Payment</h2>
        <p className="mt-1.5 text-sm text-muted">
          Order {created.orderNumber}
          {slotLabel ? ` · ${slotLabel.dayLabel}, ${slotLabel.time}` : ''}
        </p>
      </div>

      <PaymentElement options={{ layout: 'tabs' }} />

      {error ? (
        <p role="alert" className="flex gap-2.5 rounded-xl border border-danger/30 bg-danger-wash p-4 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
          <span>{error}</span>
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={!stripe || isPaying} className="w-full">
        <Lock aria-hidden className="size-4" />
        {isPaying ? 'Taking payment…' : `Pay ${formatPence(created.totalInPence)}`}
      </Button>

      <p className="text-center text-xs text-muted">
        Payment is handled by Stripe. We never see your card details.
      </p>
    </form>
  )
}
