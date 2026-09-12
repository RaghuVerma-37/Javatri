/**
 * A jali — the pierced stone lattice screen of Mughal architecture, drawn rather than
 * photographed.
 *
 * It does the cultural work that photography cannot do here: every dish image on this site is a
 * borrowed library photograph, so the Indian-ness of the page has to come from somewhere that is
 * actually ours to draw. A jali is geometry, so it scales to any size, weighs a few hundred
 * bytes, and reads as ornament rather than as a stock texture.
 *
 * The motif is the eight-pointed star (khatam) on a square grid: one star at the centre of each
 * tile and a quarter-star at each corner, which is what makes the pattern repeat seamlessly.
 */

/** An eight-pointed star as a closed path, alternating long and short radii. */
function star(cx: number, cy: number, outer: number, inner: number): string {
  const points = Array.from({ length: 16 }, (_, i) => {
    const radius = i % 2 === 0 ? outer : inner
    const angle = (Math.PI / 8) * i - Math.PI / 2
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`
  })
  return `M${points.join('L')}Z`
}

const CELL = 72
const OUTER = 19
const INNER = 8.5

export function Jali({
  className,
  id = 'jali',
  opacity = 0.5,
}: {
  className?: string
  id?: string
  opacity?: number
}) {
  const half = CELL / 2

  return (
    <svg aria-hidden className={className} width="100%" height="100%">
      <defs>
        <pattern id={id} width={CELL} height={CELL} patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.1" opacity={opacity}>
            <path d={star(half, half, OUTER, INNER)} />
            {/* The corner stars are clipped to quarters by the tile edge, so a star always lands
                whole where four tiles meet. */}
            <path d={star(0, 0, OUTER, INNER)} />
            <path d={star(CELL, 0, OUTER, INNER)} />
            <path d={star(0, CELL, OUTER, INNER)} />
            <path d={star(CELL, CELL, OUTER, INNER)} />
            {/* Bars linking star to star, which is what turns a field of stars into a screen. */}
            <path d={`M${half},0 L${half},${INNER}`} />
            <path d={`M${half},${CELL} L${half},${CELL - INNER}`} />
            <path d={`M0,${half} L${INNER},${half}`} />
            <path d={`M${CELL},${half} L${CELL - INNER},${half}`} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}
