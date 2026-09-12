import type { Metadata, Viewport } from 'next'
import { Karla, Newsreader } from 'next/font/google'
import { CartProvider } from '@/components/cart/cart-context'
import { OutletProvider } from '@/components/outlet/outlet-context'
import { OutletPrompt } from '@/components/outlet/outlet-prompt'
import { getActiveBranches, getSelectedBranchSlug } from '@/server/branch'
import { OUTLET_COOKIE } from '@/lib/outlet'
import { cookies } from 'next/headers'
import { RevealOnScroll } from '@/components/reveal-on-scroll'
import { SiteFooter } from '@/components/site-footer'
import { SiteChrome } from '@/components/site-chrome'
import { SiteHeader } from '@/components/site-header'
import { SITE } from '@/lib/site'
import './globals.css'

/*
  Newsreader for display, Karla for everything else.

  Newsreader carries a real optical-size axis, so a 5rem headline and a 15px caption can be the
  same face without the headline looking inflated or the caption spindly. That suits a page built
  on restraint: the type does the work the colour used to.

  Karla is the counterweight — a grotesque with flat terminals, quiet at 15px and audibly not the
  default UI sans. Both are variable, so the whole range costs two files.
*/
const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  display: 'swap',
  axes: ['opsz'],
})

const karla = Karla({
  variable: '--font-karla',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Indian restaurant & banqueting, Littlewick Green, Maidenhead`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    'Indian restaurant Maidenhead',
    'Indian takeaway Littlewick Green',
    'Indian food Berkshire',
    'banqueting hall Maidenhead',
    'Asian wedding venue Berkshire',
    'The Bell and Bottle',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    siteName: SITE.name,
    title: `${SITE.name} — Indian restaurant & banqueting, Maidenhead`,
    description: SITE.description,
    url: SITE.url,
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
}

export const viewport: Viewport = {
  // One colour: the site is light only.
  themeColor: '#f8f4ed',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  /*
    Read once, here, and handed down — every page under this layout then shares the same answer
    without each one querying for it.

    `cookies()` is only reached when two or more outlets are switched on (see
    getSelectedBranchSlug), so with one outlet this layout still renders statically and the
    chooser never mounts.
  */
  const active = await getActiveBranches()
  const selectedSlug = await getSelectedBranchSlug()
  const hasChosen = active.length < 2 || Boolean((await cookies()).get(OUTLET_COOKIE)?.value)
  const outlets = active.map((branch) => ({
    slug: branch.slug,
    name: branch.name,
    addressLine1: branch.addressLine1,
    addressLine2: branch.addressLine2,
    city: branch.city,
    postcode: branch.postcode,
    phone: branch.phone,
    acceptsOrders: branch.acceptsOrders,
    acceptsDelivery: branch.acceptsDelivery,
    deliveryRadiusMiles: branch.deliveryRadiusMiles,
  }))

  return (
    <html lang="en-GB" className={`${karla.variable} ${newsreader.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <OutletProvider outlets={outlets} selectedSlug={selectedSlug} hasChosen={hasChosen}>
          <CartProvider>
            <a href="#main" className="skip-link">
              Skip to main content
            </a>
            <RevealOnScroll />
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteChrome>
              <SiteFooter />
              <OutletPrompt />
            </SiteChrome>
          </CartProvider>
        </OutletProvider>
      </body>
    </html>
  )
}
