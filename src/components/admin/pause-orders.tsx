'use client'

import { useState, useTransition } from 'react'
import { Pause, Play } from 'lucide-react'
import { Button } from '@/components/ui'
import { toggleOrders } from '@/server/admin-actions'

/**
 * The pause button.
 *
 * The most important control in the admin area, so it is the largest thing on the dashboard and
 * states plainly what happens to a customer when it is off — the old site's silent "Not Accepting
 * Orders" is exactly what this is designed to never be.
 */
export function PauseOrders({
  branchId,
  acceptsOrders,
}: {
  branchId: string
  acceptsOrders: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const toggle = () => {
    setError(null)
    startTransition(async () => {
      const result = await toggleOrders(branchId, !acceptsOrders)
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <div
      className={
        acceptsOrders
          ? 'rounded-2xl border border-ok/25 bg-ok-wash p-5 sm:p-6'
          : 'rounded-2xl border border-warn/30 bg-warn-wash p-5 sm:p-6'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-display text-xl font-semibold">
            {acceptsOrders ? 'Taking online orders' : 'Online orders paused'}
          </p>
          <p className="mt-1 text-sm text-ink/85">
            {acceptsOrders
              ? 'Customers can order and pay right now, during opening hours.'
              : 'Customers see “we have paused online orders” and are asked to call instead. Bookings and event enquiries still work.'}
          </p>
        </div>

        <Button
          size="lg"
          variant={acceptsOrders ? 'secondary' : 'primary'}
          onClick={toggle}
          disabled={isPending}
        >
          {acceptsOrders ? (
            <>
              <Pause aria-hidden className="size-4" /> Pause orders
            </>
          ) : (
            <>
              <Play aria-hidden className="size-4" /> Start taking orders
            </>
          )}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
