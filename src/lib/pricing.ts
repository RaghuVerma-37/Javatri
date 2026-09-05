/**
 * Server-authoritative cart pricing.
 *
 * The client cart holds ids and quantities and nothing else — no prices. This module is handed
 * the current catalogue rows straight out of the database and recomputes every line from
 * scratch. The number that reaches Stripe is produced here, on the server, from database rows.
 * A price that arrived in a request body is never trusted, never echoed back, never charged.
 *
 * Pure functions, no Prisma import, so the tests can enumerate the awkward cases directly.
 */

export const MAX_QUANTITY_PER_LINE = 50

export type CartLineInput = {
  /** Stable identity for the line, so two "Chicken Tikka Masala" with different extras stay apart. */
  lineId: string
  itemId: string
  quantity: number
  variantIds: string[]
  modifierIds: string[]
  notes?: string | null
}

export type CatalogueVariant = {
  id: string
  name: string
  priceDeltaInPence: number
  isAvailable: boolean
}

export type CatalogueModifier = {
  id: string
  name: string
  priceInPence: number
  isAvailable: boolean
}

export type CatalogueModifierGroup = {
  id: string
  name: string
  minSelect: number
  maxSelect: number
  isRequired: boolean
  modifiers: CatalogueModifier[]
}

export type CatalogueItem = {
  id: string
  name: string
  description: string
  priceInPence: number
  spiceLevel: string
  isAvailable: boolean
  isOrderable: boolean
  /** The menu this item sits on, so a menu-level rule can reject the line. */
  menuId: string
  menuName: string
  menuIsOrderable: boolean
  /** Whether that menu is served at the time the customer asked for. Computed by the caller. */
  menuAvailableAtRequestedTime: boolean
  variants: CatalogueVariant[]
  modifierGroups: CatalogueModifierGroup[]
}

export type CartProblemCode =
  | 'empty_cart'
  | 'invalid_quantity'
  | 'item_not_found'
  | 'item_unavailable'
  | 'menu_not_orderable'
  | 'menu_unavailable_at_time'
  | 'variant_not_found'
  | 'variant_unavailable'
  | 'variant_required'
  | 'too_many_variants'
  | 'modifier_not_found'
  | 'modifier_unavailable'
  | 'modifier_group_required'
  | 'too_many_modifiers'
  | 'below_minimum_order'

export type CartProblem = {
  code: CartProblemCode
  message: string
  lineId?: string
  itemId?: string
}

export type PricedLine = {
  lineId: string
  itemId: string
  name: string
  description: string
  spiceLevel: string
  quantity: number
  basePriceInPence: number
  unitPriceInPence: number
  lineTotalInPence: number
  selectedVariants: Array<{ id: string; name: string; priceDeltaInPence: number }>
  selectedModifiers: Array<{ id: string; name: string; priceInPence: number }>
  notes: string | null
}

export type PricingContext = {
  orderType: 'PICKUP' | 'DELIVERY' | 'DINE_IN'
  minOrderInPence: number
  deliveryFeeInPence: number
  freeDeliveryAboveInPence: number | null
}

export type CartPricing = {
  lines: PricedLine[]
  subtotalInPence: number
  deliveryFeeInPence: number
  totalInPence: number
  itemCount: number
  problems: CartProblem[]
  /** True only when there are no problems at all. Checkout is gated on this. */
  isOrderable: boolean
}

/**
 * Price a cart against the catalogue.
 *
 * Lines with problems are dropped from the totals rather than priced approximately: a cart that
 * cannot be charged correctly must not produce a number that looks charge-able.
 */
export function priceCart(
  lines: CartLineInput[],
  catalogue: Map<string, CatalogueItem>,
  context: PricingContext,
): CartPricing {
  const problems: CartProblem[] = []
  const priced: PricedLine[] = []

  for (const line of lines) {
    const item = catalogue.get(line.itemId)

    if (!item) {
      problems.push({
        code: 'item_not_found',
        message: 'This dish is no longer on the menu.',
        lineId: line.lineId,
        itemId: line.itemId,
      })
      continue
    }

    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > MAX_QUANTITY_PER_LINE) {
      problems.push({
        code: 'invalid_quantity',
        message: `Choose between 1 and ${MAX_QUANTITY_PER_LINE} of ${item.name}.`,
        lineId: line.lineId,
        itemId: item.id,
      })
      continue
    }

    if (!item.isAvailable || !item.isOrderable) {
      problems.push({
        code: 'item_unavailable',
        message: `${item.name} has sold out.`,
        lineId: line.lineId,
        itemId: item.id,
      })
      continue
    }

    if (!item.menuIsOrderable) {
      problems.push({
        code: 'menu_not_orderable',
        message: `${item.name} is only available to order at the table.`,
        lineId: line.lineId,
        itemId: item.id,
      })
      continue
    }

    if (!item.menuAvailableAtRequestedTime) {
      problems.push({
        code: 'menu_unavailable_at_time',
        message: `${item.name} is not served at the time you have chosen (${item.menuName}).`,
        lineId: line.lineId,
        itemId: item.id,
      })
      continue
    }

    // --- variants -----------------------------------------------------------
    const selectedVariants: PricedLine['selectedVariants'] = []
    let variantProblem = false

    if (item.variants.length > 0 && line.variantIds.length === 0) {
      problems.push({
        code: 'variant_required',
        message: `Choose an option for ${item.name}.`,
        lineId: line.lineId,
        itemId: item.id,
      })
      variantProblem = true
    }

    if (line.variantIds.length > 1) {
      problems.push({
        code: 'too_many_variants',
        message: `Only one option can be chosen for ${item.name}.`,
        lineId: line.lineId,
        itemId: item.id,
      })
      variantProblem = true
    }

    for (const variantId of line.variantIds) {
      const variant = item.variants.find((v) => v.id === variantId)
      if (!variant) {
        problems.push({
          code: 'variant_not_found',
          message: `That option for ${item.name} is no longer available.`,
          lineId: line.lineId,
          itemId: item.id,
        })
        variantProblem = true
        continue
      }
      if (!variant.isAvailable) {
        problems.push({
          code: 'variant_unavailable',
          message: `${variant.name} has sold out.`,
          lineId: line.lineId,
          itemId: item.id,
        })
        variantProblem = true
        continue
      }
      selectedVariants.push({
        id: variant.id,
        name: variant.name,
        priceDeltaInPence: variant.priceDeltaInPence,
      })
    }

    // --- modifiers ----------------------------------------------------------
    const selectedModifiers: PricedLine['selectedModifiers'] = []
    let modifierProblem = false
    const chosenIds = new Set(line.modifierIds)

    for (const group of item.modifierGroups) {
      const chosenInGroup = group.modifiers.filter((m) => chosenIds.has(m.id))

      if (group.isRequired && chosenInGroup.length < Math.max(1, group.minSelect)) {
        problems.push({
          code: 'modifier_group_required',
          message: `Choose ${group.name} for ${item.name}.`,
          lineId: line.lineId,
          itemId: item.id,
        })
        modifierProblem = true
      }

      if (chosenInGroup.length > group.maxSelect) {
        problems.push({
          code: 'too_many_modifiers',
          message: `Choose at most ${group.maxSelect} from ${group.name}.`,
          lineId: line.lineId,
          itemId: item.id,
        })
        modifierProblem = true
      }
    }

    const knownModifiers = new Map(
      item.modifierGroups.flatMap((g) => g.modifiers.map((m) => [m.id, m] as const)),
    )

    for (const modifierId of line.modifierIds) {
      const modifier = knownModifiers.get(modifierId)
      if (!modifier) {
        problems.push({
          code: 'modifier_not_found',
          message: `An extra chosen for ${item.name} is no longer available.`,
          lineId: line.lineId,
          itemId: item.id,
        })
        modifierProblem = true
        continue
      }
      if (!modifier.isAvailable) {
        problems.push({
          code: 'modifier_unavailable',
          message: `${modifier.name} has sold out.`,
          lineId: line.lineId,
          itemId: item.id,
        })
        modifierProblem = true
        continue
      }
      selectedModifiers.push({
        id: modifier.id,
        name: modifier.name,
        priceInPence: modifier.priceInPence,
      })
    }

    if (variantProblem || modifierProblem) continue

    const unitPriceInPence =
      item.priceInPence +
      selectedVariants.reduce((sum, v) => sum + v.priceDeltaInPence, 0) +
      selectedModifiers.reduce((sum, m) => sum + m.priceInPence, 0)

    priced.push({
      lineId: line.lineId,
      itemId: item.id,
      name: item.name,
      description: item.description,
      spiceLevel: item.spiceLevel,
      quantity: line.quantity,
      basePriceInPence: item.priceInPence,
      unitPriceInPence,
      lineTotalInPence: unitPriceInPence * line.quantity,
      selectedVariants,
      selectedModifiers,
      notes: line.notes?.trim() ? line.notes.trim() : null,
    })
  }

  if (lines.length === 0) {
    problems.push({ code: 'empty_cart', message: 'Your basket is empty.' })
  }

  const subtotalInPence = priced.reduce((sum, l) => sum + l.lineTotalInPence, 0)
  const itemCount = priced.reduce((sum, l) => sum + l.quantity, 0)
  const deliveryFeeInPence = calculateDeliveryFee(subtotalInPence, context)

  if (context.orderType === 'DELIVERY' && priced.length > 0 && subtotalInPence < context.minOrderInPence) {
    problems.push({
      code: 'below_minimum_order',
      message: `Delivery orders start at ${formatPenceShort(context.minOrderInPence)}. Add ${formatPenceShort(
        context.minOrderInPence - subtotalInPence,
      )} more, or switch to collection.`,
    })
  }

  return {
    lines: priced,
    subtotalInPence,
    deliveryFeeInPence,
    totalInPence: subtotalInPence + deliveryFeeInPence,
    itemCount,
    problems,
    isOrderable: problems.length === 0 && priced.length > 0,
  }
}

export function calculateDeliveryFee(subtotalInPence: number, context: PricingContext): number {
  if (context.orderType !== 'DELIVERY') return 0
  if (subtotalInPence === 0) return 0
  if (
    context.freeDeliveryAboveInPence !== null &&
    subtotalInPence >= context.freeDeliveryAboveInPence
  ) {
    return 0
  }
  return context.deliveryFeeInPence
}

/** Local, dependency-free formatter so this module stays importable from anywhere. */
function formatPenceShort(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`
}
