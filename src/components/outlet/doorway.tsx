import Image from 'next/image'
import type { CSSProperties } from 'react'
import { Jali } from '@/components/home/jali'
import { cn } from '@/lib/cn'

/**
 * An outlet, as a doorway you are invited through.
 *
 * An arch with a pair of carved lattice doors standing ajar, and a toran of mango leaves hung
 * across it — the garland strung over a doorway in India to welcome guests on an auspicious day.
 * Pointing at the doorway (or focusing it) swings the doors wide and the room behind comes forward.
 *
 * The doors open on arrival rather than sitting there: they start shut and ease ajar a moment
 * after the page paints, using `@starting-style`, so a browser without it just shows them ajar.
 * On a touch screen there is no hover to open them with, so they are open from the start.
 *
 * Must sit inside an element with the `group` class — the card is what gets hovered, not the arch.
 */
export function Doorway({
  id,
  src,
  sizes,
  ratio = [4, 5],
  priority = false,
  delayMs = 0,
  className,
}: {
  /** Unique per doorway on the page: the lattice patterns are SVG ids. */
  id: string
  src: string
  sizes: string
  /** Width to height. The arch is always a true semicircle across the width. */
  ratio?: [number, number]
  priority?: boolean
  delayMs?: number
  className?: string
}) {
  const [w, h] = ratio

  return (
    <span
      className={cn('doorway relative block', className)}
      style={{ aspectRatio: `${w} / ${h}`, ['--door-delay' as string]: `${delayMs}ms` } as CSSProperties}
    >
      <span className="absolute inset-0 overflow-hidden rounded-t-full rounded-b-md bg-forest">
        <Image
          src={src}
          alt=""
          aria-hidden
          fill
          priority={priority}
          sizes={sizes}
          className="doorway-room object-cover"
        />
      </span>

      {/* The doors are clipped to the arch as well, so their tops follow its curve. */}
      <span className="absolute inset-0 overflow-hidden rounded-t-full rounded-b-md [perspective:1100px]">
        <DoorLeaf side="left" id={`${id}-left`} />
        <DoorLeaf side="right" id={`${id}-right`} />
      </span>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-t-full rounded-b-md ring-1 ring-inset ring-forest/30"
      />

      {/* The frame the toran is hung on. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-[7px] rounded-t-full rounded-b-lg border border-olive/45"
      />

      <Toran ratio={ratio} />
    </span>
  )
}

function DoorLeaf({ side, id }: { side: 'left' | 'right'; id: string }) {
  return (
    <span
      aria-hidden
      data-side={side}
      className={cn(
        'doorway-leaf absolute inset-y-0 w-1/2 overflow-hidden bg-forest text-lime/40',
        side === 'left' ? 'left-0 origin-left border-r border-pear/30' : 'right-0 origin-right border-l border-pear/30',
      )}
    >
      <Jali id={id} opacity={0.9} className="absolute inset-0 size-full" />
      {/* A plain panel low on the door, the way a carved door is solid below and pierced above. */}
      <span className="absolute inset-x-[14%] bottom-[5%] top-[62%] rounded-[3px] border border-lime/25 bg-forest" />
      {/* The ring pull. */}
      <span
        className={cn(
          'absolute top-[52%] size-2.5 rounded-full border-[1.5px] border-pear/80',
          side === 'left' ? 'right-2' : 'left-2',
        )}
      />
    </span>
  )
}

/**
 * The garland: a cord looped in swags along the frame, just outside the arch, with a mango leaf
 * hanging from every nail and every swag so the leaves fall across the top of the doorway. Outside
 * rather than inside, because green leaves hung over dark green doors simply disappear.
 *
 * Drawn in a viewBox with the arch's own proportions, so the arc it follows is the arch's actual
 * curve at any size.
 */
function Toran({ ratio }: { ratio: [number, number] }) {
  const [w, h] = ratio
  const viewHeight = (100 * h) / w
  const R = 54
  const NAILS = 9
  const start = Math.PI * 1.1
  const end = Math.PI * 1.9

  const nails = Array.from({ length: NAILS }, (_, i) => {
    const angle = start + ((end - start) * i) / (NAILS - 1)
    return [50 + R * Math.cos(angle), 50 + R * Math.sin(angle)] as const
  })

  // Each swag sags toward the centre of the arch, and the leaf between two nails hangs from its
  // lowest point.
  const swags = nails.slice(1).map((to, i) => {
    const from = nails[i]
    const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2] as const
    const pull = 0.16
    const control = [mid[0] + (50 - mid[0]) * pull, mid[1] + (50 - mid[1]) * pull + 2.2] as const
    const low = [
      0.25 * from[0] + 0.5 * control[0] + 0.25 * to[0],
      0.25 * from[1] + 0.5 * control[1] + 0.25 * to[1],
    ] as const
    return { from, to, control, low }
  })

  const cord =
    `M${nails[0][0].toFixed(2)},${nails[0][1].toFixed(2)}` +
    swags.map((s) => `Q${s.control[0].toFixed(2)},${s.control[1].toFixed(2)} ${s.to[0].toFixed(2)},${s.to[1].toFixed(2)}`).join('')

  const leaves = [
    ...nails.map((p) => ({ x: p[0], y: p[1], length: 7.5 })),
    ...swags.map((s) => ({ x: s.low[0], y: s.low[1], length: 10.5 })),
  ].sort((a, b) => a.x - b.x)

  return (
    <svg
      aria-hidden
      viewBox={`0 0 100 ${viewHeight.toFixed(2)}`}
      className="pointer-events-none absolute inset-0 size-full overflow-visible"
    >
      <path d={cord} fill="none" className="stroke-forest" strokeWidth="0.7" />
      {leaves.map((leaf, index) => {
        const half = leaf.length * 0.24
        const { x, y, length } = leaf
        return (
          <path
            key={index}
            className={cn(
              'toran-leaf stroke-forest',
              index % 2 === 0 ? 'fill-pistachio' : 'fill-pear',
            )}
            style={{ ['--i' as string]: index } as CSSProperties}
            strokeWidth="0.45"
            d={`M${x.toFixed(2)},${y.toFixed(2)}Q${(x + half).toFixed(2)},${(y + length * 0.42).toFixed(2)} ${x.toFixed(2)},${(y + length).toFixed(2)}Q${(x - half).toFixed(2)},${(y + length * 0.42).toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)}Z`}
          />
        )
      })}
      {nails.map((p, index) => (
        <circle key={index} cx={p[0].toFixed(2)} cy={p[1].toFixed(2)} r="0.9" className="fill-forest" />
      ))}
    </svg>
  )
}
