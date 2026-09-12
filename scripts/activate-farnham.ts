/**
 * Switch Javatri Farnham Common on.
 *
 * Narrow on purpose. `npm run db:seed` re-upserts all 187 menu items and every opening hour
 * alongside the branch row, which on a live database risks overwriting a price or an allergen a
 * member of staff has since corrected in /admin. This touches one branch row and that branch's
 * hours, and nothing else.
 *
 * What it sets, and why:
 *
 *   phone      Javatri publishes one number and both outlets share it (owner's instruction).
 *   hours      Copied from Littlewick Green (owner's instruction).
 *   orders     On — collection needs only hours and a lead time.
 *   dine-in    On, with reservations.
 *   delivery   OFF, and not by oversight. checkDelivery measures a radius from the branch's
 *              latitude/longitude, which comes from a postcode, and no postcode has been
 *              published for this outlet. With delivery on and no coordinate, every postcode a
 *              customer typed would answer "we cannot check right now, please call us" — a dead
 *              end of exactly the kind this rebuild exists to remove. Publish a postcode and
 *              this becomes one field.
 *   menu       None of its own: it serves Littlewick Green's by fallback, so the two lists cannot
 *              drift apart. See resolveMenuBranchId in src/server/menu.ts.
 *
 * Re-runnable. Run with: npm run db:activate-farnham
 */
import 'dotenv/config'
import { prisma } from '../src/lib/db'

const MAIN = 'littlewick-green'
const TARGET = 'farnham-common'

async function main() {
  const mainBranch = await prisma.branch.findUnique({
    where: { slug: MAIN },
    include: { openingHours: { orderBy: [{ dayOfWeek: 'asc' }, { opensAt: 'asc' }] } },
  })
  if (!mainBranch) throw new Error(`"${MAIN}" is not in the database. Run \`npm run db:seed\` first.`)

  const before = await prisma.branch.findUnique({ where: { slug: TARGET } })
  if (!before) throw new Error(`"${TARGET}" is not in the database. Run \`npm run db:seed\` first.`)

  console.log('before:', {
    isActive: before.isActive,
    acceptsOrders: before.acceptsOrders,
    acceptsDelivery: before.acceptsDelivery,
    acceptsReservations: before.acceptsReservations,
    phone: before.phone,
  })

  const after = await prisma.branch.update({
    where: { slug: TARGET },
    data: {
      phone: mainBranch.phone,
      isActive: true,
      acceptsOrders: true,
      acceptsDineIn: true,
      acceptsReservations: true,
      acceptsDelivery: false,
      notes:
        'Street address and postcode still to come. Delivery stays off until there is a postcode to measure a radius from.',
    },
  })

  // Replaced rather than added to, so a re-run cannot double the week up.
  await prisma.openingHours.deleteMany({ where: { branchId: after.id } })
  if (mainBranch.openingHours.length > 0) {
    await prisma.openingHours.createMany({
      data: mainBranch.openingHours.map((hour) => ({
        branchId: after.id,
        dayOfWeek: hour.dayOfWeek,
        opensAt: hour.opensAt,
        closesAt: hour.closesAt,
      })),
    })
  }

  console.log('after: ', {
    isActive: after.isActive,
    acceptsOrders: after.acceptsOrders,
    acceptsDelivery: after.acceptsDelivery,
    acceptsReservations: after.acceptsReservations,
    phone: after.phone,
    hoursCopied: mainBranch.openingHours.length,
  })
  console.log('\nFarnham Common is live. Delivery stays off until a postcode is published.')
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
