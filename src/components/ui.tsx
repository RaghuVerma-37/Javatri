import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * The handful of primitives the whole site is built from.
 *
 * Every interactive element here is a real <button> or <a>. Nothing is a clickable <div>: the
 * cart, the filters and the slot picker all have to work from a keyboard, and the quickest way
 * to guarantee that is to never leave the elements that already do.
 */

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55'

const BUTTON_VARIANTS = {
  primary: 'bg-brand text-on-brand hover:bg-brand-hover',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-2',
  ghost: 'text-brand-text hover:bg-brand-wash',
  quiet: 'text-ink/80 hover:text-ink hover:bg-surface-2',
} as const

const BUTTON_SIZES = {
  sm: 'min-h-9 px-3.5 text-sm',
  // 44px is the smallest target that reliably works with a thumb, which is how nearly all of
  // this site's traffic will be operated.
  md: 'min-h-11 px-5 text-[0.9375rem]',
  lg: 'min-h-13 px-7 text-base',
} as const

type ButtonStyleProps = {
  variant?: keyof typeof BUTTON_VARIANTS
  size?: keyof typeof BUTTON_SIZES
}

export function buttonClass({ variant = 'primary', size = 'md' }: ButtonStyleProps = {}): string {
  return cn(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size])
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<'button'> & ButtonStyleProps) {
  return <button className={cn(buttonClass({ variant, size }), className)} {...props} />
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & ButtonStyleProps) {
  return <Link className={cn(buttonClass({ variant, size }), className)} {...props} />
}

const BADGE_TONES = {
  neutral: 'bg-surface-2 text-muted border-line',
  brand: 'bg-brand-wash text-brand-text border-brand-text/20',
  ok: 'bg-ok-wash text-ok border-ok/25',
  warn: 'bg-warn-wash text-warn border-warn/25',
  danger: 'bg-danger-wash text-danger border-danger/25',
  accent: 'bg-accent-wash text-accent border-accent/25',
} as const

export function Badge({
  tone = 'neutral',
  className,
  children,
  ...props
}: ComponentProps<'span'> & { tone?: keyof typeof BADGE_TONES }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        BADGE_TONES[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-2xl border border-line bg-surface', className)}
      {...props}
    />
  )
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  id,
  className,
}: {
  eyebrow?: string
  title: ReactNode
  lead?: ReactNode
  id?: string
  className?: string
}) {
  return (
    <div className={cn('max-w-2xl', className)}>
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-text">
          {eyebrow}
        </p>
      ) : null}
      <h2 id={id} className="text-2xl sm:text-3xl">
        {title}
      </h2>
      {lead ? <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">{lead}</p> : null}
    </div>
  )
}

/** A short rule used to separate sections without shouting. */
export function Rule({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-line', className)} />
}
