'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, MapPin } from 'lucide-react'
import { useOutlet } from '@/components/outlet/outlet-context'
import { outletAddress, outletLocality } from '@/lib/outlet'
import { cn } from '@/lib/cn'

/**
 * The outlet you are looking at, and a way to change it.
 *
 * Renders nothing when there is only one outlet switched on — a control that offers a single
 * choice is furniture, not navigation. It appears on its own the moment a second outlet goes
 * live in /admin.
 *
 * A plain button and list rather than a <select>: the options carry two lines each (name and
 * address) and a select cannot do that on any platform worth relying on.
 */
export function OutletSwitcher({ className }: { className?: string }) {
  const outlet = useOutlet()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!outlet || outlet.outlets.length < 2 || !outlet.current) return null

  const shortName = outletLocality(outlet.current)

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-sm text-ink transition-colors hover:bg-surface-2 lg:min-h-9"
      >
        <MapPin aria-hidden className="size-4 text-olive" />
        <span className="max-w-[9rem] truncate">{shortName}</span>
        <ChevronDown
          aria-hidden
          className={cn('size-4 transition-transform duration-200', open && 'rotate-180')}
        />
        <span className="sr-only">Change outlet</span>
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Choose an outlet"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-[0_24px_50px_-28px_rgba(28,36,20,0.6)]"
        >
          {outlet.outlets.map((item) => {
            const isCurrent = item.slug === outlet.current?.slug
            return (
              <li key={item.slug} role="option" aria-selected={isCurrent}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    if (!isCurrent) outlet.choose(item.slug)
                  }}
                  className={cn(
                    'flex w-full items-start gap-2.5 rounded-xl px-3 py-3 text-left transition-colors',
                    isCurrent ? 'bg-brand-wash' : 'hover:bg-surface-2',
                  )}
                >
                  <Check
                    aria-hidden
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      isCurrent ? 'text-brand-text' : 'text-transparent',
                    )}
                  />
                  <span>
                    <span className="block text-[0.9375rem] font-medium text-ink">
                      {outletLocality(item)}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                      {outletAddress(item) || item.name}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
