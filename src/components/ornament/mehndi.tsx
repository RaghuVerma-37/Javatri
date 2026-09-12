import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'

/**
 * Mehndi — henna — drawn across the page the way it is drawn across a bride's hands: a mandala
 * at the centre and vines running out from it, leaf, curl and dot trail.
 *
 * It is on the events page because that is where the weddings are, and it draws itself when it
 * comes into view, from the centre outwards, at roughly the pace a cone of henna is actually
 * worked. Every line is generated from a little geometry rather than traced, so the two vines are
 * true mirror images and the whole thing is a few kilobytes.
 *
 * Fail-safe in the same direction as the rest of the reveal system: without JavaScript, with
 * reduced motion, or before the observer runs, the design is simply there, fully drawn.
 */

const WIDTH = 1200
const HEIGHT = 150
const CX = WIDTH / 2
const CY = HEIGHT / 2

type Point = [number, number]

const n = (value: number) => value.toFixed(1)

function polar(cx: number, cy: number, radius: number, angle: number): Point {
  return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]
}

/** A teardrop from radius r0 to r1 along `angle`, bellied out by `width`. */
function petal(cx: number, cy: number, angle: number, r0: number, r1: number, width: number): string {
  const [bx, by] = polar(cx, cy, r0, angle)
  const [tx, ty] = polar(cx, cy, r1, angle)
  const [mx, my] = polar(cx, cy, r0 + (r1 - r0) * 0.4, angle)
  const px = -Math.sin(angle) * width
  const py = Math.cos(angle) * width
  return `M${n(bx)},${n(by)}Q${n(mx + px)},${n(my + py)} ${n(tx)},${n(ty)}Q${n(mx - px)},${n(my - py)} ${n(bx)},${n(by)}`
}

function line(from: Point, to: Point): string {
  return `M${n(from[0])},${n(from[1])}L${n(to[0])},${n(to[1])}`
}

function timing(delay: number, duration = 700): CSSProperties {
  return { ['--d' as string]: `${Math.round(delay)}ms`, ['--dur' as string]: `${duration}ms` }
}

function Stroke({ d, delay, duration }: { d: string; delay: number; duration?: number }) {
  return <path d={d} pathLength={1} data-draw style={timing(delay, duration)} />
}

function Dot({ at, r, delay }: { at: Point; r: number; delay: number }) {
  return (
    <circle
      cx={n(at[0])}
      cy={n(at[1])}
      r={r}
      fill="currentColor"
      stroke="none"
      data-dot
      style={timing(delay)}
    />
  )
}

function Mandala() {
  const TAU = Math.PI * 2
  const scallop = Array.from({ length: 24 }, (_, i) => {
    const a0 = (i / 24) * TAU
    const a1 = ((i + 1) / 24) * TAU
    const [cx, cy] = polar(CX, CY, 47, (a0 + a1) / 2)
    const [x1, y1] = polar(CX, CY, 40, a1)
    return `Q${n(cx)},${n(cy)} ${n(x1)},${n(y1)}`
  })
  const [sx, sy] = polar(CX, CY, 40, 0)

  return (
    <g>
      <Dot at={[CX, CY]} r={3.2} delay={0} />
      <Stroke d={`M${CX + 9},${CY}a9 9 0 1 0 -18 0a9 9 0 1 0 18 0`} delay={80} duration={600} />

      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * TAU - Math.PI / 2
        return (
          <g key={`petal-${i}`}>
            <Stroke d={petal(CX, CY, angle, 11, 31, 10)} delay={180 + i * 45} duration={650} />
            <Stroke
              d={line(polar(CX, CY, 15, angle), polar(CX, CY, 25, angle))}
              delay={420 + i * 45}
              duration={400}
            />
          </g>
        )
      })}

      {Array.from({ length: 16 }, (_, i) => (
        <Dot key={`ring-${i}`} at={polar(CX, CY, 35.5, (i / 16) * TAU)} r={1.4} delay={560 + i * 18} />
      ))}

      <Stroke d={`M${n(sx)},${n(sy)}${scallop.join('')}`} delay={640} duration={1100} />

      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * TAU - Math.PI / 2
        const between = angle + Math.PI / 12
        return (
          <g key={`outer-${i}`}>
            <Stroke d={petal(CX, CY, angle, 48, 64, 6.5)} delay={1000 + i * 35} duration={550} />
            <Dot at={polar(CX, CY, 68.5, angle)} r={1.7} delay={1250 + i * 30} />
            <Dot at={polar(CX, CY, 52, between)} r={1.1} delay={1250 + i * 30} />
          </g>
        )
      })}
    </g>
  )
}

/** One vine, running right from the mandala. The left one is this, mirrored. */
function Vine() {
  const SEGMENTS = 5
  const SEG = 96
  const AMP = 18
  const x0 = CX + 72

  let stem = `M${x0},${CY}C${x0 + SEG * 0.33},${CY - AMP} ${x0 + SEG * 0.66},${CY - AMP} ${x0 + SEG},${CY}`
  for (let k = 1; k < SEGMENTS; k++) {
    stem += `S${n(x0 + SEG * (k + 0.66))},${CY + (k % 2 ? AMP : -AMP)} ${x0 + SEG * (k + 1)},${CY}`
  }

  const endX = x0 + SEG * SEGMENTS + 11

  return (
    <g>
      <Stroke d={stem} delay={1200} duration={2000} />

      {Array.from({ length: SEGMENTS }, (_, k) => {
        const up = k % 2 === 0
        const at: Point = [x0 + SEG * (k + 0.5), CY + (up ? -13.5 : 13.5)]
        const angle = up ? -Math.PI / 2 + 0.55 : Math.PI / 2 - 0.55
        const delay = 1450 + k * 380
        const tip = (distance: number) => polar(at[0], at[1], distance, angle)

        // The curl sits where the stem crosses the centre line, turning away from the leaf before it.
        const cross: Point = [x0 + SEG * (k + 1), CY]
        const s = up ? 1 : -1
        const curl = `M${cross[0]},${cross[1]}c3,${n(8 * s)} 13,${n(9 * s)} 14,${n(1 * s)}c.5,${n(-5 * s)} -6,${n(-6 * s)} -7,${n(-1.5 * s)}`

        return (
          <g key={k}>
            <Stroke d={petal(at[0], at[1], angle, 0, 27, 11)} delay={delay} duration={600} />
            <Stroke d={line(tip(4), tip(19))} delay={delay + 250} duration={350} />
            <Dot at={tip(33)} r={1.6} delay={delay + 420} />
            <Dot at={tip(38.5)} r={1.2} delay={delay + 500} />
            <Dot at={tip(43)} r={0.9} delay={delay + 580} />
            {k < SEGMENTS - 1 ? <Stroke d={curl} delay={delay + 300} duration={500} /> : null}
          </g>
        )
      })}

      {Array.from({ length: 6 }, (_, i) => (
        <Stroke
          key={`end-${i}`}
          d={petal(endX, CY, (i / 6) * Math.PI * 2, 2.5, 12, 5.5)}
          delay={3300 + i * 60}
          duration={450}
        />
      ))}
      <Dot at={[endX, CY]} r={1.8} delay={3700} />
    </g>
  )
}

export function MehndiBand({ className }: { className?: string }) {
  return (
    <div data-reveal className={cn('mehndi overflow-hidden', className)}>
      <svg
        aria-hidden
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        // Never narrower than 48rem: on a phone the vines run off both edges rather than the
        // whole design shrinking to hairlines.
        className="relative left-1/2 block h-auto w-[max(100%,48rem)] -translate-x-1/2"
      >
        <Mandala />
        <Vine />
        <g transform={`translate(${WIDTH},0) scale(-1,1)`}>
          <Vine />
        </g>
      </svg>
    </div>
  )
}
