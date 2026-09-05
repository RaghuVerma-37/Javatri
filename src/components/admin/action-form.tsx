'use client'

import { useActionState, type ReactNode } from 'react'
import { Check, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui'
import type { ActionResult } from '@/server/admin-actions'

/**
 * A form wired to a server action, with the result actually shown.
 *
 * React requires a form's `action` to return void, which quietly encourages throwing away whatever
 * the action had to say. `useActionState` keeps it, so "Saved." and "Enter a price like 12.95"
 * both end up on screen next to the button that caused them — and are announced, because
 * `role="status"` costs nothing and a silent save is indistinguishable from a broken one.
 */
export function ActionForm({
  action,
  children,
  submitLabel = 'Save changes',
  className,
}: {
  action: (formData: FormData) => Promise<ActionResult>
  children: ReactNode
  submitLabel?: string
  className?: string
}) {
  const [result, formAction, isPending] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => action(formData),
    null,
  )

  return (
    <form action={formAction} className={className}>
      {children}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? 'Saving…' : submitLabel}
        </Button>

        {result ? (
          <p
            role="status"
            className={
              result.ok
                ? 'flex items-center gap-1.5 text-sm text-ok'
                : 'flex items-center gap-1.5 text-sm text-danger'
            }
          >
            {result.ok ? (
              <Check aria-hidden className="size-4" />
            ) : (
              <TriangleAlert aria-hidden className="size-4" />
            )}
            {result.ok ? (result.message ?? 'Saved.') : result.error}
          </p>
        ) : null}
      </div>
    </form>
  )
}
