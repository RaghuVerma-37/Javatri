import { cn } from '@/lib/cn'

/**
 * The curved edge of a full-bleed band.
 *
 * Two of these top and tail the Pistachio strip so it meets the cream page on a soft line rather
 * than a ruled one. `preserveAspectRatio="none"` is the point: the path is drawn once in a 1440
 * box and then stretched to whatever the viewport is, so the curve keeps its proportions at any
 * width without a media query.
 *
 * It is `currentColor`, so the band sets the fill and the two edges can never drift out of step
 * with it.
 */
export function Wave({
  flip = false,
  className,
}: {
  /** Curve the other way, for the bottom edge of a band. */
  flip?: boolean
  className?: string
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 56"
      preserveAspectRatio="none"
      className={cn('block h-8 w-full sm:h-12', flip && 'rotate-180', className)}
    >
      <path
        d="M0,56 L0,30 C180,2 360,0 620,14 C880,28 1080,44 1260,34 C1340,30 1396,20 1440,8 L1440,56 Z"
        fill="currentColor"
      />
    </svg>
  )
}
