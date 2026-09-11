/**
 * Seeds the database from javatri-menu.json.
 *
 * Idempotent, and deliberately conservative about what a re-run overwrites.
 *
 * By default a re-run refreshes *structure* — menus, categories, dish names, descriptions,
 * ordering, staff notes — and leaves *operational* fields alone: price, availability, and
 * allergens. That is not laziness. Once this site is live, the kitchen will have marked things
 * sold out and spent an afternoon filling in ALLERGEN_TODO.md. A seed script that quietly undoes
 * that work the next time someone runs `npm run db:seed` is a hazard, not a convenience.
 *
 * Pass --force to overwrite everything from the JSON, which is what you want on a fresh database
 * or when the client sends a corrected menu.
 *
 *   npm run db:seed
 *   npm run db:seed -- --force
 */
import { randomBytes } from 'node:crypto'
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/db'
import { loadSourceFile, transform, type SeedBranch, type SeedMenu } from './source-data'

const FORCE = process.argv.includes('--force')

async function main() {
  const source = loadSourceFile()
  const result = transform(source)

  console.log(
    `Seeding from javatri-menu.json — ${result.counts.menus} menus, ${result.counts.categories} categories, ${result.counts.items} dishes.`,
  )
  if (!FORCE) {
    console.log('Mode: preserve. Prices, availability and allergens already in the database are kept.')
    console.log('      Re-run with `-- --force` to overwrite them from the JSON.')
  } else {
    console.log('Mode: FORCE. Prices, availability and allergens will be overwritten from the JSON.')
  }

  for (const branch of result.branches) {
    await seedBranch(branch)
  }

  await seedAdminUser()

  await warnAboutStrandedDishes(result)

  const dishes = await prisma.menuItem.count()
  const unconfirmed = await prisma.menuItem.count({ where: { allergensConfirmed: false } })
  console.log(`\nDone. ${dishes} dishes in the database.`)
  if (unconfirmed > 0) {
    console.log(
      `${unconfirmed} of them still have no confirmed allergen information. See ALLERGEN_TODO.md — this is a legal blocker, not a nice-to-have.`,
    )
  }
}

/**
 * Names any dish still in the database that the source file no longer lists.
 *
 * The seed only ever upserts — it has no business deleting a restaurant's menu because a JSON
 * file changed shape. But that means removing a dish from javatri-menu.json, or renaming one
 * without pinning its slug, leaves the old row behind and still on sale. Silently. This says so
 * rather than leaving someone to find out from a customer's order.
 */
async function warnAboutStrandedDishes(result: ReturnType<typeof transform>) {
  const expected = new Set<string>()
  for (const branch of result.branches) {
    for (const menu of branch.menus) {
      for (const category of menu.categories) {
        for (const item of category.items) expected.add(`${menu.slug}/${category.slug}/${item.slug}`)
      }
    }
  }

  const live = await prisma.menuItem.findMany({
    select: { name: true, slug: true, category: { select: { slug: true, menu: { select: { slug: true } } } } },
  })
  const stranded = live.filter(
    (item) => !expected.has(`${item.category.menu.slug}/${item.category.slug}/${item.slug}`),
  )
  if (stranded.length === 0) return

  console.log(`\n${stranded.length} dish(es) in the database are no longer in javatri-menu.json:`)
  for (const item of stranded) console.log(`  ${item.category.menu.slug}/${item.category.slug}/${item.slug} — "${item.name}"`)
  console.log('They are still on sale. Delete them deliberately, or put them back in the source file.')
}

async function seedBranch(branch: SeedBranch) {
  const { menus, openingHours, ...fields } = branch

  const record = await prisma.branch.upsert({
    where: { slug: branch.slug },
    create: fields,
    // Operational switches a manager may have flipped — acceptsOrders above all, which is the
    // "we're slammed, pause the tickets" button — are never reset by a re-seed.
    update: FORCE
      ? fields
      : {
          name: fields.name,
          addressLine1: fields.addressLine1,
          addressLine2: fields.addressLine2,
          city: fields.city,
          postcode: fields.postcode,
          phone: fields.phone,
          latitude: fields.latitude,
          longitude: fields.longitude,
          notes: fields.notes,
          sortOrder: fields.sortOrder,
        },
  })

  console.log(`\n${record.name} (${record.slug})`)

  await seedOpeningHours(record.id, openingHours)

  for (const menu of menus) {
    await seedMenu(record.id, menu)
  }
}

async function seedOpeningHours(branchId: string, hours: SeedBranch['openingHours']) {
  const existing = await prisma.openingHours.count({ where: { branchId } })

  // Hours are the one thing the client is most likely to correct first, and the seed has no way
  // to tell a staff correction from a stale row. So they are written once and then left alone.
  if (existing > 0 && !FORCE) {
    console.log(`  hours: ${existing} rows already present, left untouched`)
    return
  }

  await prisma.openingHours.deleteMany({ where: { branchId } })
  if (hours.length === 0) {
    console.log('  hours: none published for this branch')
    return
  }
  await prisma.openingHours.createMany({
    data: hours.map((h) => ({ branchId, ...h })),
  })
  console.log(`  hours: ${hours.length} service windows`)
}

async function seedMenu(branchId: string, menu: SeedMenu) {
  const { categories, ...fields } = menu

  const menuRecord = await prisma.menu.upsert({
    where: { branchId_slug: { branchId, slug: menu.slug } },
    create: { branchId, ...fields },
    update: FORCE
      ? fields
      : {
          name: fields.name,
          description: fields.description,
          serviceNote: fields.serviceNote,
          staffNote: fields.staffNote,
          sortOrder: fields.sortOrder,
        },
  })

  let itemCount = 0

  for (const category of categories) {
    const { items, ...categoryFields } = category
    const categoryRecord = await prisma.menuCategory.upsert({
      where: { menuId_slug: { menuId: menuRecord.id, slug: category.slug } },
      create: { menuId: menuRecord.id, ...categoryFields },
      update: categoryFields,
    })

    for (const item of items) {
      const { variants, modifierGroups, ...itemFields } = item

      const itemRecord = await prisma.menuItem.upsert({
        where: { categoryId_slug: { categoryId: categoryRecord.id, slug: item.slug } },
        create: { categoryId: categoryRecord.id, ...itemFields },
        update: FORCE
          ? itemFields
          : {
              // Structure refreshes; price, isAvailable, allergens and allergensConfirmed do not.
              name: itemFields.name,
              description: itemFields.description,
              imageUrl: itemFields.imageUrl,
              spiceLevel: itemFields.spiceLevel,
              isVegetarian: itemFields.isVegetarian,
              isVegan: itemFields.isVegan,
              containsAlcohol: itemFields.containsAlcohol,
              isOrderable: itemFields.isOrderable,
              staffNote: itemFields.staffNote,
              sortOrder: itemFields.sortOrder,
            },
      })
      itemCount++

      for (const variant of variants) {
        await prisma.menuItemVariant.upsert({
          where: { itemId_slug: { itemId: itemRecord.id, slug: variant.slug } },
          create: { itemId: itemRecord.id, ...variant },
          update: FORCE ? variant : { name: variant.name, sortOrder: variant.sortOrder },
        })
      }

      for (const group of modifierGroups) {
        const { modifiers, ...groupFields } = group
        const groupRecord = await prisma.modifierGroup.upsert({
          where: { itemId_slug: { itemId: itemRecord.id, slug: group.slug } },
          create: { itemId: itemRecord.id, ...groupFields },
          update: groupFields,
        })
        for (const modifier of modifiers) {
          await prisma.menuItemModifier.upsert({
            where: { groupId_slug: { groupId: groupRecord.id, slug: modifier.slug } },
            create: { groupId: groupRecord.id, ...modifier },
            update: FORCE ? modifier : { name: modifier.name, sortOrder: modifier.sortOrder },
          })
        }
      }
    }
  }

  const state = menu.isPublished ? 'published' : 'UNPUBLISHED — content lost on the old site'
  console.log(`  menu: ${menu.name} — ${categories.length} categories, ${itemCount} dishes (${state})`)
}

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL
  if (!email) {
    console.log('\nadmin: ADMIN_EMAIL not set — no staff account created. See README.md.')
    return
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } })
  if (existing) {
    console.log(`\nadmin: ${email} already exists, left untouched`)
    return
  }

  // A password is never committed to a repository or hard-coded in a seed. If the operator did
  // not supply one, generate a strong one and print it exactly once.
  const supplied = process.env.ADMIN_PASSWORD
  const password = supplied ?? randomBytes(12).toString('base64url')

  await prisma.adminUser.create({
    data: {
      email,
      name: process.env.ADMIN_NAME ?? 'Javatri',
      passwordHash: await bcrypt.hash(password, 12),
      role: 'OWNER',
    },
  })

  console.log(`\nadmin: created ${email} (role OWNER)`)
  if (!supplied) {
    console.log(`admin: generated password — ${password}`)
    console.log('admin: this is shown once. Save it now, and change it after first sign-in.')
  }
}

main()
  .catch((error) => {
    console.error('\nSeed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    // Guarded: if the failure was "no DATABASE_URL", there is no client to disconnect and
    // touching the proxy here would replace a clear error message with a confusing one.
    try {
      await prisma.$disconnect()
    } catch {
      /* nothing to disconnect */
    }
  })
