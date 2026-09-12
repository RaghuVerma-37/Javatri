/**
 * Writes menu-hidden.json — the record of every dish the menu is currently hiding.
 *
 * Nothing here changes anything. It reads the database, applies the same rule
 * src/lib/menu-visibility.ts applies, and writes down what that rule is keeping off the menu, so
 * the list survives outside my head and outside a chat log.
 *
 * Run with: npm run menu:hidden
 */
import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { prisma } from '../src/lib/db'
import { HIDE_DISHES_WITHOUT_OWN_PHOTO, OWN_PHOTO_PREFIX } from '../src/lib/menu-visibility'

async function main() {
  const items = await prisma.menuItem.findMany({
    include: { category: { include: { menu: true } } },
    orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
  })

  const hidden = items.filter((item) => !item.imageUrl?.startsWith(OWN_PHOTO_PREFIX))

  const payload = {
    generatedAt: new Date().toISOString(),
    rule: `Hidden when MenuItem.imageUrl does not start with "${OWN_PHOTO_PREFIX}" — i.e. the dish has no photograph of Javatri's own.`,
    currentlyHiding: HIDE_DISHES_WITHOUT_OWN_PHOTO,
    howToRestore:
      'Set HIDE_DISHES_WITHOUT_OWN_PHOTO to false in src/lib/menu-visibility.ts and redeploy. Every dish below returns to its original category and sort order — nothing was deleted or moved.',
    totals: { onMenu: items.length - hidden.length, hidden: hidden.length, total: items.length },
    hidden: hidden.map((item) => ({
      name: item.name,
      slug: item.slug,
      menu: item.category.menu.name,
      category: item.category.name,
      priceInPence: item.priceInPence,
      sortOrder: item.sortOrder,
      // The library stand-in it was using, so it is obvious which dishes need a photograph.
      libraryPhoto: item.imageUrl ?? null,
    })),
  }

  const out = join(process.cwd(), 'menu-hidden.json')
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(`Wrote ${out}`)
  console.log(`  on the menu: ${payload.totals.onMenu}`)
  console.log(`  hidden:      ${payload.totals.hidden}`)
}

main().finally(() => prisma.$disconnect())
