/**
 * Squares and watermarks the library photographs in public/dishes.
 *
 *   node scripts/watermark-library-images.mjs
 *
 * Two changes, both so these sit beside Javatri's own photographs instead of looking like a
 * different menu:
 *
 *   Square. They arrive 3:2 and the dish card is square, so the card crops their sides — which
 *   would slice a bottom-right watermark in half. Cropping to square here means the card shows
 *   the whole frame and the mark survives.
 *
 *   Watermark. Same wordmark, same corner, same proportion of the frame as the PDF set.
 *
 * Idempotent: an image that is already square has been through this, and is skipped. That check
 * is why the squaring has to happen here rather than in the card's CSS.
 *
 * A NOTE ON LICENSING. These are other people's photographs, used under CC BY and CC BY-SA.
 * Watermarking one makes it an adaptation, which those licences permit — but only while the
 * photographer and licence stay credited, and for the share-alike ones the adaptation inherits
 * share-alike. /photo-credits carries that, and must keep carrying it. Done on the owner's
 * explicit instruction after the trade-off was put to them.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIR = path.join(ROOT, 'public', 'dishes')
const LOGO = path.join(ROOT, 'public', 'javatri-logo.webp')

/** The wordmark occupies this share of the frame's width, matching the PDF set (190/800). */
const LOGO_SHARE = 190 / 800
const MARGIN_SHARE = 26 / 800

async function main() {
  const logo = await readFile(LOGO)
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.webp'))

  let done = 0
  let skipped = 0
  for (const file of files) {
    const full = path.join(DIR, file)
    const image = sharp(await readFile(full))
    const { width = 0, height = 0 } = await image.metadata()

    if (width === height) {
      skipped++
      continue
    }

    const size = Math.min(width, height)
    const logoWidth = Math.round(size * LOGO_SHARE)
    const margin = Math.round(size * MARGIN_SHARE)

    const badge = await sharp(logo).resize({ width: logoWidth }).toBuffer()
    const badgeHeight = (await sharp(badge).metadata()).height ?? 0

    const squared = await sharp(await readFile(full))
      .resize(size, size, { fit: 'cover', position: 'attention' })
      .toBuffer()

    const out = await sharp(squared)
      .composite([
        { input: badge, left: size - logoWidth - margin, top: size - badgeHeight - margin },
      ])
      .webp({ quality: 78 })
      .toBuffer()

    await writeFile(full, out)
    done++
  }

  console.log(`${done} library photographs squared and watermarked, ${skipped} already done`)
}

await main()
