/**
 * Facts about the business that are not rows in the database.
 *
 * Branch addresses, hours and phone numbers live in Postgres so staff can change them. What is
 * here is the stuff that only changes when someone rebuilds the site.
 */

export const SITE = {
  name: 'Javatri',
  legalName: 'Javatri at The Bell and Bottle',
  tagline: 'Indian kitchen and banqueting hall, Littlewick Green',
  description:
    'Indian restaurant, takeaway and banqueting venue at The Bell and Bottle, Littlewick Green, Maidenhead. Order online for collection or delivery, book a table, or enquire about events for up to 150 guests.',
  /** Overridden by NEXT_PUBLIC_SITE_URL in every real environment. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.javatri.com',
  cuisine: 'Indian',
  priceRange: '££',
  social: {
    facebook: 'https://www.facebook.com/javatrimaidenhead/',
    instagram: 'https://www.instagram.com/the.bell.and.bottle.javatri/',
    tripadvisor:
      'https://www.tripadvisor.co.uk/Restaurant_Review-g186418-d15368084-Reviews-Javatri_Restaurant-Maidenhead_Windsor_and_Maidenhead_Berkshire_England.html',
    // The old site's TikTok icon pointed at a search results page for a misspelling of the brand.
    // Left out entirely rather than shipped broken. See QUESTIONS_FOR_CLIENT.md.
    tiktok: null as string | null,
  },
  banqueting: {
    maxGuests: 150,
    fromPerPersonInPence: 4000,
  },
} as const

export const DEFAULT_BRANCH_SLUG = 'littlewick-green'

export function absoluteUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? SITE.url
  return new URL(path, base).toString()
}
