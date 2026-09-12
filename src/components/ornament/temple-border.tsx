import { cn } from '@/lib/cn'

/**
 * A temple border — the scalloped edge that runs along a sari's hem, a block-printed cloth, and
 * the parapet of a mandir.
 *
 * Drawn rather than fetched, for the same reason the jali is: the photography on this site is
 * stock, so anything that carries the culture has to be geometry we own. It is a hairline and a
 * row of cusps at 10% opacity — the brief was minimal and cultural, and a heavy version of this
 * motif reads as a takeaway menu from 1985.
 *
 * A `<pattern>` in userSpaceOnUse tiles horizontally, so one definition stretches to any width
 * without the scallops distorting the way a stretched `viewBox` would.
 */
export function TempleBorder({
  className,
  id = 'temple-border',
  /** Point the cusps downwards, for the top edge of a block. */
  flip = false,
}: {
  className?: string
  id?: string
  flip?: boolean
}) {
  const W = 34
  const H = 18

  return (
    <svg
      aria-hidden
      width="100%"
      height={H}
      className={cn('block', flip && 'rotate-180', className)}
    >
      <defs>
        <pattern id={id} width={W} height={H} patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
            {/* The rail the cusps hang from. */}
            <path d={`M0,1.5 H${W}`} />
            {/* One cusp: up the shoulder, over the point, down the other side. */}
            <path d={`M0,1.5 Q${W / 2},${H - 2} ${W},1.5`} />
            {/* The bead that sits in the throat of every scallop in a printed border. */}
            <circle cx={W / 2} cy={5.5} r="1.1" fill="currentColor" stroke="none" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height={H} fill={`url(#${id})`} />
    </svg>
  )
}
