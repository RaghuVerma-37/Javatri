'use client'

import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * A labelled field with an error that is actually announced.
 *
 * `aria-invalid` plus `aria-describedby` pointing at a `role="alert"` is the difference between a
 * form a screen-reader user can complete and one they cannot. It is three attributes, so there is
 * no excuse for the sighted-only version.
 */
export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string
  error?: string
  hint?: ReactNode
  required?: boolean
  children: (props: {
    id: string
    'aria-invalid': boolean | undefined
    'aria-describedby': string | undefined
    required: boolean | undefined
  }) => ReactNode
  className?: string
}) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {required ? null : <span className="ml-1.5 font-normal text-muted">(optional)</span>}
      </label>
      <div className="mt-2">
        {children({
          id,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': describedBy || undefined,
          required,
        })}
      </div>
      {/*
        The hint sits below the input, not between the label and it.
        Above, it made the header of a hinted field taller than an unhinted one, so two fields
        sharing a grid row had their boxes at different heights — Name and Phone on /book, Email
        and Phone at checkout. Below, every field's input is the same distance from the top of its
        cell, so a row lines up whether one field is hinted, both are, or neither. Screen readers
        are unaffected: aria-describedby is what announces it, and that does not care about DOM
        order.
      */}
      {hint ? (
        <p id={hintId} className="mt-1.5 text-xs leading-relaxed text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export const inputClass =
  'min-h-11 w-full rounded-xl border border-line-strong bg-bg px-3.5 placeholder:text-muted/60 aria-[invalid=true]:border-danger'

export function TextInput({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClass, className)} {...props} />
}

export function TextArea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(inputClass, 'min-h-24 py-2.5', className)} {...props} />
}
