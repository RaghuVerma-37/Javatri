import { cn } from '@/lib/cn'

const MAX_TIERS = 3
const TIER_HEIGHT = 4.4
const TIER_GAP = 1
const BOTTOM = 22.5
const TIER_X = 6.5
const TIER_WIDTH = 11

/**
 * The basket, drawn as a tiffin carrier — the stacked steel lunch tins, clamped between two rails
 * with a handle on top, that carry a cooked meal from one kitchen to somebody else's table.
 *
 * It grows with the order: one tin while the basket is empty, a second when there is something in
 * it, a third after that. Each new tin drops onto the stack, and the lid gives a small hop on every
 * addition — including past three, when the stack stops growing — so pressing "Add" is answered up
 * in the header wherever you are on the menu.
 *
 * The count itself is never carried by the drawing; the number beside it does that.
 */
export function Tiffin({ count, className }: { count: number; className?: string }) {
  const tiers = Math.min(MAX_TIERS, Math.max(1, count))
  const tierTops = Array.from({ length: tiers }, (_, i) => BOTTOM - TIER_HEIGHT - i * (TIER_HEIGHT + TIER_GAP))
  const top = tierTops[tiers - 1]
  const lid = top - 1.9
  const bar = lid - 1.4
  const railLeft = 4.5
  const railRight = 19.5

  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4 shrink-0 overflow-visible', className)}
    >
      {/* The rails and the clamp bar across the top. */}
      <path d={`M${railLeft} ${BOTTOM - 1.4}V${bar}H${railRight}V${BOTTOM - 1.4}`} />
      {/* The carrying loop. */}
      <path d={`M9.5 ${bar}v-1.2a2.5 2.5 0 0 1 5 0v1.2`} />

      {/* Keyed on the count so it remounts, and so replays its hop, on every change. */}
      <g key={count} className="tiffin-lid">
        <path d={`M7.4 ${lid}h9.2`} strokeWidth="1.8" />
      </g>

      {tierTops.map((y, index) => (
        <g key={index} className="tiffin-tier">
          <rect x={TIER_X} y={y} width={TIER_WIDTH} height={TIER_HEIGHT} rx="1.3" />
          {/* The lugs each tin hangs from. */}
          <path
            d={`M${TIER_X} ${y + TIER_HEIGHT / 2}H${railLeft}M${TIER_X + TIER_WIDTH} ${y + TIER_HEIGHT / 2}H${railRight}`}
            strokeWidth="1"
          />
        </g>
      ))}
    </svg>
  )
}
