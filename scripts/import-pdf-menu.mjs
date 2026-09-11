/**
 * Folds "Javatri Food Items (2).pdf" into javatri-menu.json.
 *
 *   node scripts/import-pdf-menu.mjs           # show what would change
 *   node scripts/import-pdf-menu.mjs --write   # write it
 *
 * Reads two committed files rather than the PDF itself, so the result is reviewable and the
 * import is reproducible without a PDF toolchain:
 *
 *   scripts/pdf-dishes.json    every page's name, price and description, as extracted
 *   scripts/pdf-menu-map.json  which page is which dish, decided by hand
 *
 * The photographs are a separate step — scripts/extract-pdf-images.py — because they need the
 * PDF and pymupdf.
 *
 * The rule that shapes everything here: a matched dish keeps its slug. Slugs are derived from
 * names, ids are derived from slugs, and the seed upserts on slug — so renaming "Methi Murgh" to
 * "Methi Chicken" without pinning the slug would not rename anything, it would insert a second
 * dish and strand the first. Pinning is what makes a rename a rename.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WRITE = process.argv.includes('--write')

const read = (p) => JSON.parse(readFileSync(path.join(ROOT, p), 'utf8'))
const menu = read('javatri-menu.json')
const pages = read('scripts/pdf-dishes.json')
const map = read('scripts/pdf-menu-map.json')

/** Mirrors slugify() in prisma/source-data.ts. */
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[‘’ʼ']/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const corrections = map.name_corrections ?? {}
/** The dish name to use: the PDF's, unless it misspelled a word and the owner corrected it. */
const nameFor = (page) => corrections[String(page.page)] ?? page.name

const byPage = new Map(pages.map((p) => [p.page, p]))
const itemSlug = (item) => item.slug ?? slugify(item.name)

/** Every item in the menu, with the category it lives in. */
const allItems = []
for (const m of menu.menus) {
  for (const c of m.categories) {
    for (const item of c.items) allItems.push({ item, category: c, menu: m })
  }
}

const report = { matched: [], renamed: [], priced: [], added: [], missing: [], untouched: 0 }

// --- 1. Dishes the PDF and the site share -----------------------------------
for (const [pageStr, siteName] of Object.entries(map.match)) {
  const page = byPage.get(Number(pageStr))
  const slug = slugify(siteName)
  const found = allItems.find((e) => itemSlug(e.item) === slug)
  if (!found) {
    report.missing.push(`page ${pageStr} -> "${siteName}" (no such dish)`)
    continue
  }
  const { item } = found
  const before = { name: item.name, price: item.price, description: item.description }
  const price = page.priceInPence / 100

  // Pin the slug before the name moves, so the id survives the rename.
  item.slug = slug
  item.name = nameFor(page)
  item.price = price
  item.description = page.description
  item.image = `/dishes/pdf/${slug}.webp`

  if (before.name !== item.name) report.renamed.push(`${before.name} -> ${item.name}`)
  if (before.price !== price) report.priced.push(`${item.name}: £${before.price.toFixed(2)} -> £${price.toFixed(2)}`)
  report.matched.push(item.name)
}

// --- 2. A duplicate page whose text beat the page we matched ----------------
for (const [pageStr, info] of Object.entries(map.duplicates)) {
  if (info.use !== 'description') continue
  const siteName = map.match[String(info.sameAs)]
  const target = allItems.find((e) => itemSlug(e.item) === slugify(siteName))
  if (target) target.item.description = byPage.get(Number(pageStr)).description
}

// --- 3. Dishes the site does not have ---------------------------------------
for (const [pageStr, spec] of Object.entries(map.new)) {
  const page = byPage.get(Number(pageStr))
  const slug = slugify(nameFor(page))
  if (allItems.some((e) => itemSlug(e.item) === slug)) continue // already imported

  let category = null
  for (const m of menu.menus) {
    const hit = m.categories.find((c) => c.name === spec.category)
    if (hit) { category = hit; break }
  }
  if (!category) {
    report.missing.push(`page ${pageStr} -> category "${spec.category}" not found`)
    continue
  }

  category.items.push({
    name: nameFor(page),
    price: page.priceInPence / 100,
    description: page.description,
    // Left empty on purpose. Tags drive the vegetarian/vegan filter, and this codebase treats a
    // wrong dietary label as seriously as a wrong allergen. The PDF states none, so neither do we.
    tags: [],
    image: `/dishes/pdf/${slug}.webp`,
  })
  report.added.push(`${nameFor(page)} (£${(page.priceInPence / 100).toFixed(2)}) -> ${spec.category}`)
}

report.untouched = allItems.filter((e) => !e.item.image).length

console.log(`matched   ${report.matched.length}`)
console.log(`renamed   ${report.renamed.length}`)
for (const r of report.renamed) console.log(`    ${r}`)
console.log(`repriced  ${report.priced.length}`)
for (const r of report.priced) console.log(`    ${r}`)
console.log(`added     ${report.added.length}`)
for (const r of report.added) console.log(`    ${r}`)
console.log(`left alone ${report.untouched} dishes that the PDF does not mention`)
if (report.missing.length) {
  console.log(`\nPROBLEMS (${report.missing.length}):`)
  for (const r of report.missing) console.log(`    ${r}`)
}

if (WRITE) {
  writeFileSync(path.join(ROOT, 'javatri-menu.json'), `${JSON.stringify(menu, null, 2)}\n`)
  console.log('\njavatri-menu.json written.')
} else {
  console.log('\nDry run. Pass --write to apply.')
}
