import { penceToDecimalString } from '@/lib/money'
import { formatMinutes } from '@/lib/hours'
import { absoluteUrl, SITE } from '@/lib/site'
import type { BranchWithHours } from '@/server/branch'
import type { MenuWithContent } from '@/server/menu'

/**
 * Structured data.
 *
 * Local search is the single biggest lever this business has — someone in Maidenhead typing
 * "indian near me" at 6pm — so the Restaurant record carries the real address, the real
 * coordinates and the real hours, generated from the database rather than typed into a template
 * where they can drift out of date. That drift is precisely how the old site ended up publishing
 * three different sets of opening hours.
 */

const DAY_URIS = [
  'https://schema.org/Sunday',
  'https://schema.org/Monday',
  'https://schema.org/Tuesday',
  'https://schema.org/Wednesday',
  'https://schema.org/Thursday',
  'https://schema.org/Friday',
  'https://schema.org/Saturday',
]

export function restaurantSchema(branch: BranchWithHours) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    '@id': absoluteUrl('/#restaurant'),
    name: SITE.name,
    alternateName: SITE.legalName,
    description: SITE.description,
    url: SITE.url,
    telephone: branch.phone ?? undefined,
    servesCuisine: SITE.cuisine,
    priceRange: SITE.priceRange,
    currenciesAccepted: 'GBP',
    paymentAccepted: 'Cash, Credit Card, Debit Card',
    address: {
      '@type': 'PostalAddress',
      streetAddress: [branch.addressLine1, branch.addressLine2].filter(Boolean).join(', '),
      addressLocality: branch.city ?? undefined,
      addressRegion: 'Berkshire',
      postalCode: branch.postcode ?? undefined,
      addressCountry: 'GB',
    },
    geo:
      branch.latitude !== null && branch.longitude !== null
        ? { '@type': 'GeoCoordinates', latitude: branch.latitude, longitude: branch.longitude }
        : undefined,
    openingHoursSpecification: branch.openingHours.map((hours) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_URIS[hours.dayOfWeek],
      opens: formatMinutes(hours.opensAt),
      closes: formatMinutes(hours.closesAt),
    })),
    hasMenu: absoluteUrl('/menu'),
    acceptsReservations: branch.acceptsReservations ? absoluteUrl('/book') : 'False',
    sameAs: [SITE.social.facebook, SITE.social.instagram, SITE.social.tripadvisor].filter(Boolean),
    potentialAction: {
      '@type': 'OrderAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: absoluteUrl('/order'),
        inLanguage: 'en-GB',
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform',
        ],
      },
      deliveryMethod: [
        'https://schema.org/OnSitePickup',
        ...(branch.acceptsDelivery ? ['https://schema.org/ParcelService'] : []),
      ],
    },
  }
}

export function menuSchema(menus: MenuWithContent[], url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `${url}#menu`,
    name: menus.length === 1 ? menus[0].name : `${SITE.name} menus`,
    inLanguage: 'en-GB',
    url,
    hasMenuSection: menus.flatMap((menu) =>
      menu.categories.map((category) => ({
        '@type': 'MenuSection',
        name: menus.length === 1 ? category.name : `${menu.name} — ${category.name}`,
        description: category.note ?? undefined,
        hasMenuItem: category.items.map((item) => ({
          '@type': 'MenuItem',
          name: item.name,
          description: item.description || undefined,
          offers: {
            '@type': 'Offer',
            price: penceToDecimalString(item.priceInPence),
            priceCurrency: 'GBP',
            availability: item.isAvailable
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          },
          suitableForDiet: [
            item.isVegan ? 'https://schema.org/VeganDiet' : null,
            item.isVegetarian && !item.isVegan ? 'https://schema.org/VegetarianDiet' : null,
          ].filter(Boolean),
        })),
      })),
    ),
  }
}

export function breadcrumbSchema(trail: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }
}

/**
 * Rendered with dangerouslySetInnerHTML because that is how JSON-LD has to reach the page.
 * The input is our own database, and `<` is escaped so a dish called "Fish < Chips" cannot close
 * the script tag early.
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
