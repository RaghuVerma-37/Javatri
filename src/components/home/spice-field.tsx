'use client'

import { useEffect, useRef } from 'react'

/**
 * Embers.
 *
 * A canvas of warm motes drifting up through the hero, like spice caught in the light over a
 * tandoor. It is generative rather than photographic because the restaurant has no usable
 * photography — and it stays out of the way of the things that matter:
 *
 *   • It never runs at all under `prefers-reduced-motion`.
 *   • It pauses when the tab is hidden or the hero scrolls out of view, so it cannot quietly
 *     drain a phone battery while someone reads the menu.
 *   • Particle count scales with viewport area and is capped, so a phone draws about 26 of them
 *     and a desktop about 70.
 *   • It is purely decorative: aria-hidden, and the hero reads identically without it.
 */
export function SpiceField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width = 0
    let height = 0
    let frame = 0
    let running = true

    type Mote = { x: number; y: number; r: number; vx: number; vy: number; a: number; hue: number }
    let motes: Mote[] = []

    const seed = () => {
      const count = Math.min(70, Math.max(22, Math.round((width * height) / 26000)))
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 0.6 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 0.16,
        vy: -(0.08 + Math.random() * 0.34),
        a: 0.16 + Math.random() * 0.5,
        // Saffron through to ember red.
        hue: 22 + Math.random() * 22,
      }))
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    const draw = () => {
      if (!running) return
      context.clearRect(0, 0, width, height)

      for (const mote of motes) {
        mote.x += mote.vx
        mote.y += mote.vy

        // Wrap rather than respawn, so the field never visibly thins out.
        if (mote.y < -8) {
          mote.y = height + 8
          mote.x = Math.random() * width
        }
        if (mote.x < -8) mote.x = width + 8
        if (mote.x > width + 8) mote.x = -8

        const gradient = context.createRadialGradient(mote.x, mote.y, 0, mote.x, mote.y, mote.r * 4)
        gradient.addColorStop(0, `hsla(${mote.hue}, 92%, 66%, ${mote.a})`)
        gradient.addColorStop(1, `hsla(${mote.hue}, 92%, 58%, 0)`)
        context.fillStyle = gradient
        context.beginPath()
        context.arc(mote.x, mote.y, mote.r * 4, 0, Math.PI * 2)
        context.fill()
      }

      frame = requestAnimationFrame(draw)
    }

    const start = () => {
      if (running) return
      running = true
      frame = requestAnimationFrame(draw)
    }

    const stop = () => {
      running = false
      cancelAnimationFrame(frame)
    }

    resize()
    frame = requestAnimationFrame(draw)

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0 },
    )
    intersectionObserver.observe(canvas)

    const onVisibility = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-[1] size-full"
    />
  )
}
