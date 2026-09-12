import { cn } from '@/lib/cn'

/**
 * A paisley — *buta* in Persian, *ambi* in Hindi, after the mango whose shape it takes.
 *
 * Drawn as one outline with a seed of smaller marks inside it, the way a block-printed buta is
 * built up: the silhouette, a line following it in, and a scatter of dots. Small, single colour,
 * and it inherits `currentColor` so it can sit on cream or on the dark footer without a second
 * version of itself.
 */
export function Paisley({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn('block', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* The silhouette: a teardrop whose tip curls back on itself. */}
      <path d="M12 21.5c-4.4 0-7.5-3.2-7.5-7.4 0-4.6 3.6-8 7.4-10.4 2.6-1.7 5.2-2.3 6.4-1.2 1.3 1.2.6 3.4-1.4 4.6-1.6 1-3.4 1-4.4.2" />
      {/* The line that follows the silhouette in — the inner border of the block. */}
      <path d="M12 18.8c-2.7 0-4.7-2-4.7-4.6 0-2.9 2.2-5.2 4.6-6.8" />
      {/* The seed. */}
      <circle cx="10.6" cy="14" r="1.5" />
      <circle cx="14.6" cy="9.4" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="8.8" cy="10.4" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  )
}
