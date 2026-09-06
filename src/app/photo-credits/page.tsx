import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { allDishPhotoCredits } from '@/lib/dish-photos'
import { absoluteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Photo credits',
  description:
    'The photographers behind the dish photographs on the Javatri menu, and the licence each photograph is used under.',
  alternates: { canonical: '/photo-credits' },
  openGraph: { title: 'Photo credits · Javatri', url: absoluteUrl('/photo-credits') },
  // Attribution, not marketing. It should be reachable and indexed, but it is not a landing page.
  robots: { index: true, follow: true },
}

/**
 * Where we discharge the attribution the licences require.
 *
 * The dish photographs are library images from Wikimedia Commons, and nearly all of them are CC
 * BY or CC BY-SA, which means using them obliges us to name the author and the licence. Burying
 * that in a comment would be a licence breach; a page that names every one is the cheap, honest
 * way to comply. It doubles as the list of what to delete once the kitchen sends real photographs.
 */
export default function PhotoCreditsPage() {
  const credits = allDishPhotoCredits()

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-text">
          Credits
        </p>
        <h1 className="mt-2 text-4xl sm:text-5xl">Photo credits</h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          The photographs beside each dish on our{' '}
          <Link href="/menu" className="underline underline-offset-2 hover:text-brand-text">
            menu
          </Link>{' '}
          are library photographs of that kind of dish, not photographs of the plate we will bring
          you. They are here to show you what a dish is while we photograph our own. Every one is
          used under a licence that permits it, and the photographer is named below.
        </p>
        <p className="mt-3 text-sm text-muted">
          {credits.length} photographs, all from Wikimedia Commons.
        </p>
      </header>

      <ul className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {credits.map((credit) => (
          <li key={credit.slug} className="flex gap-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-surface-2">
              <Image
                src={credit.src}
                alt=""
                aria-hidden
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 text-sm">
              <p className="font-medium text-ink">{credit.dish}</p>
              <p className="mt-0.5 text-muted">
                {credit.author} · {credit.licence}
              </p>
              <a
                href={credit.sourceUrl}
                rel="noreferrer noopener"
                target="_blank"
                className="mt-0.5 inline-block break-words text-xs text-muted underline underline-offset-2 hover:text-brand-text"
              >
                {credit.file}
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
