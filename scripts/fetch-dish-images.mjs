/**
 * Downloads one library photograph per dish from Wikimedia Commons.
 *
 *   node scripts/fetch-dish-images.mjs            # only fetches what is missing
 *   node scripts/fetch-dish-images.mjs --force    # re-fetches everything
 *   node scripts/fetch-dish-images.mjs --only "Chicken Biryani"
 *
 * Commons rather than a stock library because every file here has a machine-readable licence and
 * a named author, which is what makes putting it on a commercial restaurant site defensible. We
 * accept only licences that permit commercial use, and we record the author, the licence and the
 * file page for every single image in the generated manifest — /photo-credits renders it.
 *
 * Output: public/dishes/<slug>.webp plus src/lib/dish-photos.generated.ts.
 *
 * These are photographs of the dish type, not of Javatri's food. Replacing them with the real
 * thing means setting MenuItem.imageUrl, which takes priority — see src/lib/dish-photos.ts.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { CATEGORY_QUERIES, DISH_QUERIES } from './dish-image-queries.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = path.join(ROOT, 'public', 'dishes')
const MANIFEST = path.join(ROOT, 'src', 'lib', 'dish-photos.generated.ts')

// Wikimedia blocks generic agents outright. Identify the tool and give them somewhere to shout.
const USER_AGENT = 'JavatriMenuImages/1.0 (https://javatri.co.uk/; build tooling)'
const API = 'https://commons.wikimedia.org/w/api.php'

/**
 * Licences we are willing to put on a page that sells food.
 *
 * Everything here permits commercial use. NC and ND licences are excluded on purpose: a menu is
 * commercial use, and cropping to a card is arguably a derivative. Anything Commons reports
 * outside this list is skipped rather than guessed at.
 */
const ALLOWED_LICENCES = [
  /^cc0/i,
  /^cc[ -]by([ -]sa)?[ -][0-9.]+/i,
  /^public domain/i,
  /^pd/i,
]

const FORCE = process.argv.includes('--force')
const onlyIndex = process.argv.indexOf('--only')
const ONLY = onlyIndex === -1 ? null : process.argv[onlyIndex + 1]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function slugify(input) {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function licenceAllowed(licence) {
  return ALLOWED_LICENCES.some((pattern) => pattern.test(licence))
}

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', ...params })}`
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (response.ok) return response.json()
    if (response.status === 429 || response.status >= 500) {
      await sleep(1500 * (attempt + 1))
      continue
    }
    throw new Error(`Commons ${response.status} for ${params.gsrsearch ?? url}`)
  }
  throw new Error(`Commons kept failing for ${params.gsrsearch ?? url}`)
}

/**
 * Words that mean the photograph is of something near the food rather than of the food: a
 * shopfront, a packet on a shelf, a festival crowd. Commons full-text search finds these because
 * the dish name is in the description, and they are useless on a menu card.
 */
const OFF_SUBJECT = [
  'restaurant',
  'shop',
  'stall',
  'store',
  'market',
  'menu',
  'packet',
  'package',
  'packaging',
  'box',
  'logo',
  'signboard',
  'sign board',
  'poster',
  'festival',
  'map',
  'portrait',
  'building',
  'street view',
  'vase',
  'flower',
  'advert',
  'billboard',
  'trap',
  'garden',
  'plant',
  'wedding',
  'party',
  'waitress',
  'bottle cap',
  'beer ad',
  'vinegar',
]

/** Words too common to prove a file is about the dish we asked for. */
const WEAK_WORDS = new Set(['indian', 'india', 'food', 'dish', 'style', 'cooked', 'fried', 'the', 'and', 'with'])

/**
 * How good a candidate looks for a menu card.
 *
 * Commons relevance alone puts a photograph of a curry house frontage above a photograph of the
 * curry, because both mention the dish. Scoring on the *file name* fixes that: whoever uploads a
 * plate of dal tadka calls the file dal tadka.
 */
function score(candidate, query) {
  const title = candidate.file.toLowerCase()
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !WEAK_WORDS.has(w))

  let value = 0
  const matched = words.filter((word) => title.includes(word))
  value += matched.length * 3
  if (words.length > 0 && matched.length === words.length) value += 3
  if (OFF_SUBJECT.some((word) => title.includes(word))) value -= 5
  if (candidate.width >= 1200) value += 1
  if (candidate.width > candidate.height) value += 1
  return value
}

/**
 * One named Commons file, for the handful of dishes where full-text search never finds the food.
 *
 * "laal maas" matches a scanned 1880s cookbook and a family album before it matches a curry, and
 * no amount of scoring rescues a result set that contains no photograph of the dish. Naming the
 * file is the honest fix.
 */
async function fetchFile(name) {
  const data = await api({
    action: 'query',
    titles: `File:${name}`,
    prop: 'imageinfo',
    iiprop: 'url|mime|size|extmetadata',
    iiurlwidth: '900',
  })
  const page = Object.values(data?.query?.pages ?? {})[0]
  const info = page?.imageinfo?.[0]
  if (!info) return []
  const meta = info.extmetadata ?? {}
  return [
    {
      file: name,
      width: info.width ?? 0,
      height: info.height ?? 0,
      url: info.thumburl ?? info.url,
      descriptionUrl: info.descriptionurl,
      licence: stripHtml(meta.LicenseShortName?.value),
      author: stripHtml(meta.Artist?.value) || 'Unknown author',
      credit: stripHtml(meta.Credit?.value),
    },
  ]
}

/** Candidate photographs for one search, best first, already filtered for licence and size. */
async function search(query) {
  const data = await api({
    action: 'query',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: '20',
    prop: 'imageinfo',
    iiprop: 'url|mime|size|extmetadata',
    iiurlwidth: '900',
  })

  const pages = Object.values(data?.query?.pages ?? {})
  // `generator=search` returns pages in relevance order via `index`; Object.values does not.
  pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))

  const candidates = []
  for (const page of pages) {
    const info = page.imageinfo?.[0]
    if (!info) continue
    if (!['image/jpeg', 'image/png'].includes(info.mime)) continue
    if ((info.width ?? 0) < 640) continue
    const meta = info.extmetadata ?? {}
    const licence = stripHtml(meta.LicenseShortName?.value)
    if (!licenceAllowed(licence)) continue
    candidates.push({
      file: page.title.replace(/^File:/, ''),
      width: info.width ?? 0,
      height: info.height ?? 0,
      url: info.thumburl ?? info.url,
      descriptionUrl: info.descriptionurl,
      licence,
      author: stripHtml(meta.Artist?.value) || 'Unknown author',
      credit: stripHtml(meta.Credit?.value),
    })
  }
  // Stable within a score band, so Commons relevance still decides between equals.
  return candidates
    .map((candidate, index) => ({ candidate, index, value: score(candidate, query) }))
    .sort((a, b) => b.value - a.value || a.index - b.index)
    .map((entry) => entry.candidate)
}

async function download(candidate, slug) {
  const response = await fetch(candidate.url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`download ${response.status} for ${candidate.file}`)
  const input = Buffer.from(await response.arrayBuffer())

  // 3:2 at 900px wide covers the largest slot the card ever renders on a 2x screen, and webp at
  // 72 keeps the whole set to a few megabytes rather than a few hundred.
  const output = await sharp(input)
    .rotate()
    .resize(900, 600, { fit: 'cover', position: 'attention' })
    .webp({ quality: 72 })
    .toBuffer()

  await writeFile(path.join(OUT_DIR, `${slug}.webp`), output)
  return output.length
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const source = JSON.parse(await readFile(path.join(ROOT, 'javatri-menu.json'), 'utf8'))
  const dishes = []
  const seenName = new Set()
  for (const menu of source.menus) {
    for (const category of menu.categories) {
      for (const item of category.items) {
        if (seenName.has(item.name)) continue
        seenName.add(item.name)
        dishes.push({ name: item.name, category: category.name })
      }
    }
  }

  const existing = await loadManifest()
  const entries = new Map(Object.entries(existing))
  const usedFiles = new Set(
    Object.values(existing).map((entry) => entry.file).filter(Boolean),
  )

  const failures = []
  let fetched = 0

  for (const dish of dishes) {
    if (ONLY && dish.name !== ONLY) continue
    const slug = slugify(dish.name)
    const file = path.join(OUT_DIR, `${slug}.webp`)
    if (!FORCE && entries.has(slug) && existsSync(file)) continue

    const query = DISH_QUERIES[dish.name] ?? CATEGORY_QUERIES[dish.category] ?? dish.name
    try {
      const candidates = query.startsWith('file:')
        ? await fetchFile(query.slice('file:'.length))
        : await search(query)
      // Two dishes asking Commons similar questions get the same top hit; taking the next unused
      // candidate is what stops the paneer section rendering six copies of one photograph.
      const pick = query.startsWith('file:')
        ? candidates[0]
        : candidates.find((c) => !usedFiles.has(c.file)) ?? candidates[0]
      if (!pick) {
        failures.push({ dish: dish.name, query, reason: 'no usable result' })
        continue
      }
      const bytes = await download(pick, slug)
      usedFiles.add(pick.file)
      entries.set(slug, {
        slug,
        dish: dish.name,
        src: `/dishes/${slug}.webp`,
        file: pick.file,
        author: pick.author,
        licence: pick.licence,
        sourceUrl: pick.descriptionUrl,
      })
      fetched++
      console.log(`  ${dish.name} -> ${pick.file} (${pick.licence}, ${Math.round(bytes / 1024)}kB)`)
    } catch (error) {
      failures.push({ dish: dish.name, query, reason: error.message })
    }
    await sleep(250)
  }

  await writeManifest(entries)

  console.log(`\n${fetched} downloaded, ${entries.size} in the manifest.`)
  if (failures.length > 0) {
    console.log(`\n${failures.length} without a photograph:`)
    for (const f of failures) console.log(`  ${f.dish} ("${f.query}") — ${f.reason}`)
  }
}

/** Re-reads the generated file so a re-run keeps images it already has. */
async function loadManifest() {
  if (!existsSync(MANIFEST)) return {}
  const text = await readFile(MANIFEST, 'utf8')
  const match = text.match(/DISH_PHOTOS = (\{[\s\S]*?\n\}) as const/)
  if (!match) return {}
  return new Function(`return ${match[1]}`)()
}

async function writeManifest(entries) {
  const sorted = [...entries.entries()].sort(([a], [b]) => a.localeCompare(b))
  const body = sorted
    .map(([slug, entry]) => `  ${JSON.stringify(slug)}: ${JSON.stringify(entry)},`)
    .join('\n')

  const contents = `/**
 * Generated by \`node scripts/fetch-dish-images.mjs\` — do not edit by hand.
 *
 * One library photograph per dish, downloaded from Wikimedia Commons under a licence that
 * permits commercial use. The author, licence and source page travel with every entry because
 * CC BY and CC BY-SA require attribution; /photo-credits is where we discharge that.
 *
 * These are photographs of the dish type. They are not Javatri's food, and a real photograph on
 * MenuItem.imageUrl beats anything in here — see src/lib/dish-photos.ts.
 */
export type DishPhoto = {
  slug: string
  dish: string
  src: string
  file: string
  author: string
  licence: string
  sourceUrl: string
}

export const DISH_PHOTOS = {
${body}
} as const satisfies Record<string, DishPhoto>
`
  await writeFile(MANIFEST, contents)
}

await main()
