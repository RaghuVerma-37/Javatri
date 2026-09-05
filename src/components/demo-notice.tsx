import { Database } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Shown when the site is running without a database.
 *
 * The point is to be specific about what does and does not work. "Demo mode" on its own tells a
 * visitor nothing; being told the menu and prices are real, and that payment is the part that is
 * switched off, tells them exactly where they stand.
 */
export function DemoNotice({
  className,
  context = 'site',
}: {
  className?: string
  context?: 'site' | 'order' | 'checkout' | 'form'
}) {
  const body = {
    site: 'This site is running without a database, so it is showing the real menu and prices from the imported data but cannot yet take orders or bookings.',
    order:
      'You can browse, filter, build a basket and see exactly what it would cost — all of that is priced on the server, for real. What is switched off is payment, because an order needs somewhere to be stored before anyone should be charged for it.',
    checkout:
      'This deployment has no database, so there is nowhere to record your order. Nothing has been charged and nothing has been kept. Please call us and we will take it over the phone.',
    form: 'This deployment has no database yet, so there is nowhere to record your request. Please call us instead — we will pick up.',
  }[context]

  return (
    <aside
      className={cn('flex gap-3 rounded-2xl border border-accent/30 bg-accent-wash p-4 sm:p-5', className)}
    >
      <Database aria-hidden className="mt-0.5 size-5 shrink-0 text-accent" />
      <div className="text-sm leading-relaxed">
        <p className="font-semibold text-ink">Preview — not taking orders yet</p>
        <p className="mt-1 text-ink/85">{body}</p>
        <p className="mt-2 text-ink/85">
          To order or book right now, call{' '}
          <a href="tel:+441628825753" className="font-medium underline underline-offset-2">
            01628 825753
          </a>
          .
        </p>
      </div>
    </aside>
  )
}
