'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { ActionResult } from '@/server/admin-actions'

/**
 * A button that runs a server action and says what happened.
 *
 * Restaurant staff are using this on a phone, mid-service, one-handed. So: the button disables
 * itself while the action is in flight (no double-taps marking an order ready twice), and a
 * failure is shown next to the button rather than swallowed — "I pressed it and nothing happened"
 * is the worst possible outcome on a busy Saturday.
 */
export function ActionButton({
  action,
  children,
  variant = 'secondary',
  size = 'sm',
  confirm,
  className,
}: {
  action: () => Promise<ActionResult>
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'quiet'
  size?: 'sm' | 'md' | 'lg'
  confirm?: string
  className?: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = () => {
    if (confirm && !window.confirm(confirm)) return
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <span className={cn('inline-flex flex-col items-start gap-1', className)}>
      <Button variant={variant} size={size} onClick={run} disabled={isPending}>
        {isPending ? 'Working…' : children}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </span>
  )
}
