import { DISH_PHOTOS, type DishPhoto } from '@/lib/dish-photos.generated'

/**
 * The photograph to show for a dish.
 *
 * Two sources, in this order:
 *
 *  1. `MenuItem.imageUrl` — a real photograph of Javatri's food, set by the kitchen through the
 *     admin. Always wins.
 *  2. The library set in dish-photos.generated.ts — a Commons photograph of the dish *type*,
 *     downloaded by scripts/fetch-dish-images.mjs.
 *
 * The second is a stand-in and the site says so out loud: the card marks these photographs as
 * serving suggestions, and /photo-credits names the photographer of every one. Nobody should be
 * able to look at this menu and conclude they are being shown the plate they will be served.
 * QUESTIONS_FOR_CLIENT.md #16 is the ask that makes them unnecessary.
 */
export type ResolvedDishPhoto = {
  src: string
  /** True when this is a library photograph rather than one of Javatri's own. */
  isLibrary: boolean
  credit: DishPhoto | null
}

/** Matches the slug the seed builds from a dish name, so the manifest keys line up. */
export function dishPhotoKey(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Only a path we serve ourselves.
 *
 * next/image throws on a remote src whose host is not in next.config's `remotePatterns`, and it
 * throws while rendering the dish card — so one pasted https:// URL in one row would take out the
 * whole menu page for everybody. Until there is an upload path and a configured host, an absolute
 * URL falls through to the library photograph instead of breaking the page.
 */
function isServableHere(url: string): boolean {
  return url.startsWith('/')
}

export function resolveDishPhoto(item: {
  name: string
  imageUrl?: string | null
}): ResolvedDishPhoto | null {
  if (item.imageUrl && isServableHere(item.imageUrl)) {
    return { src: item.imageUrl, isLibrary: false, credit: null }
  }

  const photo = (DISH_PHOTOS as Record<string, DishPhoto | undefined>)[dishPhotoKey(item.name)]
  if (!photo) return null
  return { src: photo.src, isLibrary: true, credit: photo }
}

/** Every library photograph in use, for the credits page. */
export function allDishPhotoCredits(): DishPhoto[] {
  return Object.values(DISH_PHOTOS as Record<string, DishPhoto>).sort((a, b) =>
    a.dish.localeCompare(b.dish),
  )
}
