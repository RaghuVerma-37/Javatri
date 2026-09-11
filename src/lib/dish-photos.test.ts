import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import menuSource from '../../javatri-menu.json'
import { libraryPhotoCredits, dishPhotoKey, resolveDishPhoto } from '@/lib/dish-photos'

type SourceMenu = {
  categories: Array<{ items: Array<{ name: string; image?: string }> }>
}

/** Every dish on the menu, with its own photograph if the PDF import gave it one. */
const dishes = (menuSource.menus as SourceMenu[]).flatMap((menu) =>
  menu.categories.flatMap((category) =>
    category.items.map((item) => ({ name: item.name, imageUrl: item.image ?? null })),
  ),
)

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
 * The guard that matters: no dish may render without a photograph.
 *
 * It can come from either source — Javatri's own, imported from the PDF, or the library
 * stand-in, which is keyed by dish name. That second route is the fragile one: renaming a dish
 * in javatri-menu.json silently drops its stand-in. A dish that has neither fails here, by name,
 * rather than showing up as a hole on the menu.
 */
describe('every dish has a photograph', () => {
  it('resolves one for all of them', () => {
    const missing = dishes.filter((d) => !resolveDishPhoto(d)).map((d) => d.name)
    expect(missing).toEqual([])
  })

  it('uses our own photograph wherever the PDF supplied one', () => {
    const ours = dishes.filter((d) => d.imageUrl)
    expect(ours.length).toBeGreaterThan(0)
    const wrong = ours.filter((d) => resolveDishPhoto(d)?.isLibrary).map((d) => d.name)
    expect(wrong).toEqual([])
  })

  it('has the file on disk for every photograph it claims', () => {
    const root = path.resolve(__dirname, '../..')
    const missing = libraryPhotoCredits(dishes)
      .filter((credit) => !existsSync(path.join(root, 'public', credit.src)))
      .map((credit) => credit.src)
    expect(missing).toEqual([])
  })

  it('credits every photograph to an author and a licence', () => {
    const uncredited = libraryPhotoCredits(dishes)
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
