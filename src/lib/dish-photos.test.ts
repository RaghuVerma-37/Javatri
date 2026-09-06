import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import menuSource from '../../javatri-menu.json'
import { allDishPhotoCredits, dishPhotoKey, resolveDishPhoto } from '@/lib/dish-photos'

type SourceMenu = {
  categories: Array<{ items: Array<{ name: string }> }>
}

const dishNames = [
  ...new Set(
    (menuSource.menus as SourceMenu[]).flatMap((menu) =>
      menu.categories.flatMap((category) => category.items.map((item) => item.name)),
    ),
  ),
]

describe('resolveDishPhoto', () => {
  it("prefers Javatri's own photograph over the library one", () => {
    const resolved = resolveDishPhoto({ name: 'Chicken Biryani', imageUrl: '/uploads/ours.jpg' })
    expect(resolved).toEqual({ src: '/uploads/ours.jpg', isLibrary: false, credit: null })
  })

  it('falls back to the library photograph, and flags it as one', () => {
    const resolved = resolveDishPhoto({ name: 'Chicken Biryani', imageUrl: null })
    expect(resolved?.isLibrary).toBe(true)
    expect(resolved?.src).toBe('/dishes/chicken-biryani.webp')
    // The licence obliges us to name the photographer; without this the card is a breach.
    expect(resolved?.credit?.author).toBeTruthy()
    expect(resolved?.credit?.licence).toBeTruthy()
  })

  it('ignores a remote URL rather than letting next/image take the menu page down', () => {
    const resolved = resolveDishPhoto({
      name: 'Chicken Biryani',
      imageUrl: 'https://example.com/biryani.jpg',
    })
    expect(resolved?.isLibrary).toBe(true)
    expect(resolved?.src).toBe('/dishes/chicken-biryani.webp')
  })

  it('returns nothing rather than a broken image for a dish it has never seen', () => {
    expect(resolveDishPhoto({ name: 'Something Nobody Has Cooked', imageUrl: null })).toBeNull()
  })
})

/**
 * The guard that matters. Dish photographs are keyed by name, so renaming a dish in
 * javatri-menu.json silently drops its photograph — this fails instead, and names the dish that
 * needs `node scripts/fetch-dish-images.mjs`.
 */
describe('the library covers the menu', () => {
  it('has a photograph for every dish', () => {
    const missing = dishNames.filter((name) => !resolveDishPhoto({ name, imageUrl: null }))
    expect(missing).toEqual([])
  })

  it('has the file on disk for every photograph it claims', () => {
    const root = path.resolve(__dirname, '../..')
    const missing = allDishPhotoCredits()
      .filter((credit) => !existsSync(path.join(root, 'public', credit.src)))
      .map((credit) => credit.src)
    expect(missing).toEqual([])
  })

  it('credits every photograph to an author and a licence', () => {
    const uncredited = allDishPhotoCredits()
      .filter((credit) => !credit.author || !credit.licence || !credit.sourceUrl)
      .map((credit) => credit.dish)
    expect(uncredited).toEqual([])
  })
})

describe('dishPhotoKey', () => {
  it('matches the slug the seed builds from the same name', () => {
    expect(dishPhotoKey('Okra Fries / Kurkuri Bhindi')).toBe('okra-fries-kurkuri-bhindi')
    expect(dishPhotoKey('Café Latte')).toBe('cafe-latte')
    expect(dishPhotoKey('Mushroom & Garlic Rice')).toBe('mushroom-and-garlic-rice')
    expect(dishPhotoKey("Bailey's")).toBe('bailey-s')
  })
})
