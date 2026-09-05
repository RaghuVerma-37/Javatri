'use client'

import Link from 'next/link'
import { useRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * A card that leans towards the pointer and lights up under it.
 *
 * The rotation and the glow position are written straight to CSS custom properties on the
 * element — React never re-renders on mousemove, so this costs nothing on the main thread beyond
 * a style write. Touch devices get no pointer events and simply see a static card, which is the
 * correct outcome rather than a fallback.
 */
export function TiltCard({
  href,
  eyebrow,
  title,
  children,
  cta,
  accent = '#d99a2b',
  className,
  ...rest
}: {
  href: string
  eyebrow: string
  title: string
  children: ReactNode
  cta: string
  accent?: string
  className?: string
} & Omit<ComponentPropsWithoutRef<typeof Link>, 'href' | 'title' | 'children' | 'className'>) {
  const ref = useRef<HTMLAnchorElement>(null)

  const onPointerMove = (event: React.PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== 'mouse') return
    const element = ref.current
    if (!element) return
    const rect = element.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height
    element.style.setProperty('--ry', `${(px - 0.5) * 9}deg`)
    element.style.setProperty('--rx', `${(0.5 - py) * 9}deg`)
    element.style.setProperty('--mx', `${px * 100}%`)
    element.style.setProperty('--my', `${py * 100}%`)
    element.style.setProperty('--glow', '1')
  }

  const reset = () => {
    const element = ref.current
    if (!element) return
    element.style.setProperty('--rx', '0deg')
    element.style.setProperty('--ry', '0deg')
    element.style.setProperty('--glow', '0')
  }

  return (
    <Link
      ref={ref}
      href={href}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      onBlur={reset}
      style={{ ['--accent' as string]: accent }}
      className={cn(
        'tilt-card group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-7',
        className,
      )}
      {...rest}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-text">{eyebrow}</p>
      <h3 className="mt-3 text-2xl">{title}</h3>
      <div className="mt-2.5 flex-1 text-[0.9375rem] leading-relaxed text-muted">{children}</div>
      <p className="mt-5 inline-flex items-center gap-2 font-medium text-brand-text">
        {cta}
        <ArrowRight
          aria-hidden
          className="size-4 transition-transform duration-300 group-hover:translate-x-1"
        />
      </p>
    </Link>
  )
}
