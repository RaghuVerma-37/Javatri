import { Database } from 'lucide-react'

/**
 * Shown when the database is unreachable or has not been seeded.
 *
 * Two audiences, one page. A visitor gets a phone number and an apology; whoever deployed it gets
 * the two commands that fix it. Neither gets a stack trace.
 */
export function NotConfigured() {
  return (
    <div className="container-page flex min-h-[60svh] max-w-xl flex-col justify-center py-20">
      <Database aria-hidden className="size-7 text-accent" />
      <h1 className="mt-5 text-3xl">We are just setting things up</h1>
      <p className="mt-4 leading-relaxed text-muted">
        Our website is not quite ready. In the meantime, please call us on{' '}
        <a
          href="tel:+441628825753"
          className="font-medium text-brand-text underline underline-offset-4"
        >
          01628 825753
        </a>{' '}
        — we are at The Bell and Bottle, Bath Road, Littlewick Green, Maidenhead SL6 3RX.
      </p>

      <div className="mt-10 rounded-2xl border border-line bg-surface p-5 text-sm">
        <p className="font-medium">If you are the developer</p>
        <p className="mt-2 leading-relaxed text-muted">
          The database is unreachable or has not been seeded. Check <code>DATABASE_URL</code>, then:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-surface-2 p-3.5 text-xs">
          <code>
            npm run db:deploy{'\n'}
            npm run db:seed
          </code>
        </pre>
        <p className="mt-3 text-muted">See README.md.</p>
      </div>
    </div>
  )
}
