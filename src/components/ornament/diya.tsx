import { cn } from '@/lib/cn'

/**
 * A diya — the small clay oil lamp — standing in for the green "open" dot.
 *
 * Lit while the kitchen is cooking, with a flame that never quite holds still; unlit when it is
 * closed, with the thread of smoke a lamp leaves when it has just gone out. It reads the same
 * `state.isOpen` the badge text does, so the lamp and the words can never disagree.
 *
 * The flicker is the only ambient motion outside the hero, and it is small enough to sit at text
 * size. Reduced motion stops it on a steady flame.
 */
export function Diya({ lit, className }: { lit: boolean; className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      className={cn('size-4 shrink-0 overflow-visible', className)}
    >
      {lit ? (
        <g className="diya-flame">
          <circle className="diya-glow fill-flame" cx="10" cy="7.6" r="6.2" opacity="0.22" />
          <path
            className="fill-flame"
            d="M10 1.6c2 2.5 3.1 4.4 3.1 6.1a3.1 3.1 0 0 1-6.2 0c0-1.7 1.1-3.6 3.1-6.1Z"
          />
          <path
            className="fill-flame-core"
            d="M10 5.1c.9 1.2 1.4 2.1 1.4 2.9a1.4 1.4 0 0 1-2.8 0c0-.8.5-1.7 1.4-2.9Z"
          />
        </g>
      ) : (
        <path
          d="M10 9.4c-.8-1.2.8-2-.1-3.3-.6-.9.3-1.7.1-2.7"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.4"
        />
      )}
      {/* The wick. */}
      <path d="M10 9.3v1.9" stroke="#3a2a1a" strokeWidth="0.9" strokeLinecap="round" />
      {/* The bowl, pinched into a spout on the right, with a painted rim and three dots. */}
      <path
        className="fill-clay"
        d="M1.8 11.1h12.8l3.7-1.4c-.4 1.5-1.2 2.4-2.3 2.8-1 3-3.6 5-6.6 5-3.9 0-7.1-2.6-7.6-6.4Z"
      />
      <path d="M3 11.2h11.4" stroke="#c98a55" strokeWidth="0.8" strokeLinecap="round" />
      <g fill="#f3dcb8">
        <circle cx="6" cy="13.9" r="0.7" />
        <circle cx="9" cy="14.7" r="0.7" />
        <circle cx="12" cy="13.9" r="0.7" />
      </g>
    </svg>
  )
}
