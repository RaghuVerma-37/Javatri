'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { cn } from '@/lib/cn'

const POINTER_QUERY = '(hover: hover) and (pointer: fine)'

/**
 * Whether this device has a real pointer, read the way React wants external state read.
 *
 * Not an effect that calls setState: that renders once with the wrong answer and again with the
 * right one, which the react-hooks rules flag and which would flash the wrong interaction model.
 * The server snapshot is `false`, so the markup React sends matches touch behaviour and hydrates
 * without a mismatch.
 */
function usePointerDevice(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const query = window.matchMedia(POINTER_QUERY)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(POINTER_QUERY).matches,
    () => false,
  )
}

/**
 * The dish thumbnail, and the enlarged view behind it.
 *
 * Three things shape this component.
 *
 * The large image is only rendered once the preview opens. A menu carries nearly two hundred
 * dishes; mounting a full-size photograph for each one, hidden, would download megabytes nobody
 * asked for. Closed, this costs exactly the thumbnail it always cost.
 *
 * Hover and tap are different gestures, so they are handled differently rather than pretending
 * one is the other. On a device with a real pointer, hovering opens a panel beside the dish and
 * leaving closes it — no click, no dismissing. On a touch screen there is no hover, so the
 * thumbnail is a button that opens a centred overlay with a backdrop and a close control.
 *
 * The watermark goes on Javatri's own photographs only. The rest are other people's work, used
 * under licences that require attributing *them*; stamping a restaurant's logo across someone
 * else's photograph would claim it as ours, which is both rude and a licence breach.
 */
export function DishPhoto({
  src,
  name,
  isOwnPhotograph,
  soldOut,
}: {
  src: string
  name: string
  isOwnPhotograph: boolean
  soldOut: boolean
}) {
  const [open, setOpen] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)
  const hasPointer = usePointerDevice()

  // Escape closes the tap overlay. Only bound while it is open.
  useEffect(() => {
    if (!open || hasPointer) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, hasPointer])

  const alt = isOwnPhotograph ? `${name} at Javatri` : ''

  const enlarged = (
    <>
      <Image
        src={src}
        alt={alt}
        aria-hidden={isOwnPhotograph ? undefined : true}
        width={640}
        height={640}
        sizes="(min-width: 640px) 420px, 88vw"
        className="h-auto w-full rounded-xl bg-white object-contain"
      />
      {isOwnPhotograph ? (
        <Image
          src="/javatri-logo.webp"
          alt=""
          aria-hidden
          width={313}
          height={113}
          className="pointer-events-none absolute bottom-3 right-3 w-24 opacity-90 sm:w-28"
        />
      ) : null}
    </>
  )

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={hasPointer ? () => setOpen(true) : undefined}
      onMouseLeave={hasPointer ? () => setOpen(false) : undefined}
    >
      <button
        type="button"
        // On a pointer device the hover panel has already done the job, so the button is not a
        // second way in — it is the keyboard's only way in, and focus opens the same panel.
        onClick={hasPointer ? undefined : () => setOpen(true)}
        onFocus={hasPointer ? () => setOpen(true) : undefined}
        onBlur={hasPointer ? () => setOpen(false) : undefined}
        aria-label={`See a larger photograph of ${name}`}
        aria-expanded={open}
        className={cn(
          'relative block size-20 overflow-hidden rounded-lg bg-white transition-opacity sm:size-28',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
          soldOut && 'grayscale',
        )}
      >
        <Image
          src={src}
          alt={alt}
          aria-hidden={isOwnPhotograph ? undefined : true}
          fill
          sizes="(min-width: 640px) 112px, 80px"
          className="object-cover"
        />
      </button>

      {open && hasPointer ? (
        /*
          Anchored to the thumbnail and allowed to cover the dish text. A preview that dodges the
          text would have to be small enough to fit beside it, which defeats the point.
        */
        <div
          role="presentation"
          className="absolute left-0 top-0 z-50 w-[26rem] max-w-[80vw] rounded-2xl border border-line-strong bg-surface p-3 shadow-2xl"
        >
          <div className="relative">{enlarged}</div>
          <p className="mt-2 px-1 text-sm font-medium text-ink">{name}</p>
        </div>
      ) : null}

      {open && !hasPointer ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={name}
            className="w-full max-w-md rounded-2xl border border-line-strong bg-surface p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative">{enlarged}</div>
            <div className="mt-2 flex items-center justify-between gap-3 px-1">
              <p className="text-sm font-medium text-ink">{name}</p>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 rounded-full px-4 text-sm text-muted hover:text-ink"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
