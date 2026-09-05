import type { Metadata, Viewport } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import { CartProvider } from '@/components/cart/cart-context'
import { RevealOnScroll } from '@/components/reveal-on-scroll'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { SITE } from '@/lib/site'
import './globals.css'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
})

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  display: 'swap',
  axes: ['SOFT', 'WONK', 'opsz'],
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbf7f1' },
    { media: '(prefers-color-scheme: dark)', color: '#14110f' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <CartProvider>
          <a href="#main" className="skip-link">
            Skip to main content
          </a>
          <RevealOnScroll />
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  )
}
