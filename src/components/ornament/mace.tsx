import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'

/**
 * Javatri — जावित्री — is mace: the scarlet lace that grows wrapped around a nutmeg, gathered at
 * its base and reaching up over the seed in strands that fork and rejoin. It is the name of the
 * restaurant, and it happens to be a lattice, which is why the jali belongs on this site at all.
 *
 * Drawn on load: the dark seed arrives, the lace gathers at its foot, and the strands climb the
 * seed from the middle outwards, splitting and cross-linking as they go. The whole drawing is
 * generated from a little geometry — each strand follows a meridian of the seed, wandering a
 * touch either side — so it is a few kilobytes and has no seams.
 */

const CX = 50
const CY = 72
const RX = 29
const RY = 38

type Point = [number, number]

const n = (value: number) => value.toFixed(2)
const clamp = (value: number) => Math.max(-0.96, Math.min(0.96, value))

/** A point on the seed: `s` across it from -1 to 1, `u` up it from 0 (base) to 1 (top). */
function onSeed(s: number, u: number): Point {
  return [CX + RX * Math.sin(Math.PI * u) * s, CY + RY * Math.cos(Math.PI * u)]
}

/** A smooth path through the points, using each point as the control for the next midpoint. */
function smooth(points: Point[]): string {
  let d = `M${n(points[0][0])},${n(points[0][1])}`
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i]
    const [nx, ny] = points[i + 1]
    d += `Q${n(x)},${n(y)} ${n((x + nx) / 2)},${n((y + ny) / 2)}`
  }
  const last = points[points.length - 1]
  return `${d}L${n(last[0])},${n(last[1])}`
}

/** In drawing order: the middle strand first, then outwards in pairs. */
const STRANDS = [
  { s: 0, end: 0.93, phase: 0.4 },
  { s: -0.3, end: 0.88, phase: 2.1 },
  { s: 0.3, end: 0.9, phase: 4 },
  { s: -0.6, end: 0.82, phase: 1.2 },
  { s: 0.6, end: 0.85, phase: 5.1 },
  { s: -0.86, end: 0.72, phase: 3.3 },
  { s: 0.86, end: 0.76, phase: 0.9 },
]

function across(strand: (typeof STRANDS)[number], u: number): number {
  return clamp(strand.s + 0.12 * Math.sin(Math.PI * 3 * u + strand.phase) * (1 - Math.abs(strand.s) * 0.5))
}

function sample(from: number, to: number, count: number, at: (u: number) => Point): Point[] {
  return Array.from({ length: count }, (_, i) => at(from + ((to - from) * i) / (count - 1)))
}

function timing(delay: number, duration: number): CSSProperties {
  return { ['--d' as string]: `${Math.round(delay)}ms`, ['--dur' as string]: `${duration}ms` }
}

export function Mace({ className }: { className?: string }) {
  const strands = STRANDS.map((strand, index) => {
    const points = sample(0.03, strand.end, 16, (u) => onSeed(across(strand, u), u))
    // The fingertip reaches a little past where the strand leaves the seed, curling inwards.
    points.push(onSeed(across(strand, strand.end) * 0.65, Math.min(0.99, strand.end + 0.06)))
    return { d: smooth(points), delay: 650 + index * 110 }
  })

  // Four strands split for a stretch and rejoin, which is what makes the holes in the lace.
  const forks = [1, 2, 3, 4].map((index) => {
    const strand = STRANDS[index]
    const from = 0.28 + index * 0.04
    const to = from + 0.28
    const side = Math.sign(strand.s) || 1
    const points = sample(from, to, 9, (u) =>
      onSeed(clamp(across(strand, u) + side * 0.17 * Math.sin((Math.PI * (u - from)) / (to - from))), u),
    )
    return { d: smooth(points), delay: 650 + index * 110 + 450 }
  })

  // Cross-links between neighbouring strands, at staggered heights.
  const bySide = [...STRANDS].sort((a, b) => a.s - b.s)
  const links = bySide.slice(0, -1).flatMap((left, i) => {
    const right = bySide[i + 1]
    // One link per gap, not two: with more, the lace closes up and the seed stops showing through.
    return [0.3 + (i % 3) * 0.16]
      .filter((u) => u < Math.min(left.end, right.end) - 0.04)
      .map((u, j) => {
        const [ax, ay] = onSeed(across(left, u), u)
        const [bx, by] = onSeed(across(right, u), u)
        return {
          d: `M${n(ax)},${n(ay)}Q${n((ax + bx) / 2)},${n((ay + by) / 2 + 2.6)} ${n(bx)},${n(by)}`,
          delay: 1350 + (i + j) * 70,
        }
      })
  })

  return (
    <svg
      aria-hidden
      viewBox="14 24 72 92"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('mace overflow-visible', className)}
    >
      <g className="mace-seed">
        <ellipse cx={CX} cy={CY} rx={RX} ry={RY} className="fill-nutmeg" />
        <ellipse
          cx={CX - 9}
          cy={CY - 13}
          rx="7"
          ry="11"
          fill="#fff"
          opacity="0.12"
          transform={`rotate(-18 ${CX - 9} ${CY - 13})`}
        />
      </g>

      <g className="stroke-mace">
        {strands.map((strand, index) => (
          <path key={`s${index}`} d={strand.d} strokeWidth="2.5" pathLength={1} data-strand style={timing(strand.delay, 1100)} />
        ))}
        {forks.map((fork, index) => (
          <path key={`f${index}`} d={fork.d} strokeWidth="1.8" pathLength={1} data-strand style={timing(fork.delay, 700)} />
        ))}
        {links.map((link, index) => (
          <path key={`l${index}`} d={link.d} strokeWidth="1.5" pathLength={1} data-strand style={timing(link.delay, 380)} />
        ))}
      </g>

      {/* Where the lace gathers at the foot of the seed. */}
      <ellipse className="mace-base fill-mace" cx={CX} cy={CY + RY - 2.5} rx="9" ry="5" />
    </svg>
  )
}
