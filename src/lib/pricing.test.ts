import { describe, expect, it } from 'vitest'
import {
  MAX_QUANTITY_PER_LINE,
  calculateDeliveryFee,
  priceCart,
  type CartLineInput,
  type CatalogueItem,
  type PricingContext,
} from '@/lib/pricing'

/**
 * Cart pricing.
 *
 * This is the code that decides what Stripe charges, so the tests are less interested in the
 * happy path than in every way a cart can be wrong: a dish that sold out while the customer was
 * choosing, an option that no longer exists, a quantity of -1, a modifier smuggled in from a
 * different dish. In every one of those cases the line must be dropped from the totals rather
 * than priced approximately — a cart that cannot be charged correctly must not produce a number
 * that looks charge-able.
 */

function item(overrides: Partial<CatalogueItem> = {}): CatalogueItem {
  return {
    id: 'butter-chicken',
    name: 'Butter Chicken Dilli Wala',
    description: 'Succulent tandoori chicken tikka in a smooth tomato gravy.',
    priceInPence: 1595,
    spiceLevel: 'MILD',
    isAvailable: true,
    isOrderable: true,
    menuId: 'food-menu',
    menuName: 'Food Menu',
    menuIsOrderable: true,
    menuAvailableAtRequestedTime: true,
    variants: [],
    modifierGroups: [],
    ...overrides,
  }
}

function line(overrides: Partial<CartLineInput> = {}): CartLineInput {
  return {
    lineId: 'line-1',
    itemId: 'butter-chicken',
    quantity: 1,
    variantIds: [],
    modifierIds: [],
    ...overrides,
  }
}

const PICKUP: PricingContext = {
  orderType: 'PICKUP',
  minOrderInPence: 2000,
  deliveryFeeInPence: 349,
  freeDeliveryAboveInPence: 4500,
}

const DELIVERY: PricingContext = { ...PICKUP, orderType: 'DELIVERY' }

const catalogue = (...items: CatalogueItem[]) => new Map(items.map((i) => [i.id, i]))

describe('line pricing', () => {
  it('prices a single dish', () => {
    const result = priceCart([line()], catalogue(item()), PICKUP)
    expect(result.isOrderable).toBe(true)
    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].unitPriceInPence).toBe(1595)
    expect(result.lines[0].lineTotalInPence).toBe(1595)
    expect(result.subtotalInPence).toBe(1595)
    expect(result.totalInPence).toBe(1595)
  })

  it('multiplies by quantity in integer pence', () => {
    // 12.95 * 3 in floating point is 38.849999999999994. In pence it is exactly 3885.
    const result = priceCart(
      [line({ quantity: 3 })],
      catalogue(item({ priceInPence: 1295 })),
      PICKUP,
    )
    expect(result.lines[0].lineTotalInPence).toBe(3885)
    expect(Number.isInteger(result.totalInPence)).toBe(true)
  })

  it('counts dishes, not lines', () => {
    const result = priceCart(
      [line({ quantity: 3 }), line({ lineId: 'line-2', itemId: 'naan', quantity: 2 })],
      catalogue(item(), item({ id: 'naan', name: 'Garlic Naan', priceInPence: 435 })),
      PICKUP,
    )
    expect(result.itemCount).toBe(5)
    expect(result.subtotalInPence).toBe(1595 * 3 + 435 * 2)
  })

  it('trims and keeps a kitchen note', () => {
    const result = priceCart([line({ notes: '  no coriander  ' })], catalogue(item()), PICKUP)
    expect(result.lines[0].notes).toBe('no coriander')
  })

  it('treats a whitespace-only note as no note', () => {
    const result = priceCart([line({ notes: '   ' })], catalogue(item()), PICKUP)
    expect(result.lines[0].notes).toBeNull()
  })
})

describe('a cart that cannot be charged', () => {
  it('rejects an empty cart', () => {
    const result = priceCart([], catalogue(item()), PICKUP)
    expect(result.isOrderable).toBe(false)
    expect(result.problems.map((p) => p.code)).toContain('empty_cart')
  })

  it('rejects a dish that is no longer on the menu', () => {
    const result = priceCart([line({ itemId: 'deleted' })], catalogue(item()), PICKUP)
    expect(result.isOrderable).toBe(false)
    expect(result.problems[0].code).toBe('item_not_found')
    expect(result.subtotalInPence).toBe(0)
  })

  it('rejects a dish that sold out while the customer was choosing', () => {
    const result = priceCart([line()], catalogue(item({ isAvailable: false })), PICKUP)
    expect(result.isOrderable).toBe(false)
    expect(result.problems[0].code).toBe('item_unavailable')
    // The important part: it is not silently priced anyway.
    expect(result.subtotalInPence).toBe(0)
  })

  it('rejects a dish from a menu that is not served at the requested time', () => {
    const result = priceCart(
      [line()],
      catalogue(item({ menuAvailableAtRequestedTime: false })),
      PICKUP,
    )
    expect(result.problems[0].code).toBe('menu_unavailable_at_time')
  })

  it('rejects a dish from a menu that is not orderable at all', () => {
    const result = priceCart([line()], catalogue(item({ menuIsOrderable: false })), PICKUP)
    expect(result.problems[0].code).toBe('menu_not_orderable')
  })

  it.each([0, -1, 1.5, Number.NaN, MAX_QUANTITY_PER_LINE + 1])(
    'rejects a quantity of %s',
    (quantity) => {
      const result = priceCart([line({ quantity })], catalogue(item()), PICKUP)
      expect(result.problems[0].code).toBe('invalid_quantity')
      expect(result.subtotalInPence).toBe(0)
    },
  )

  it('drops only the broken line and keeps pricing the rest', () => {
    const result = priceCart(
      [line(), line({ lineId: 'line-2', itemId: 'gone' })],
      catalogue(item()),
      PICKUP,
    )
    expect(result.lines).toHaveLength(1)
    expect(result.subtotalInPence).toBe(1595)
    // But the cart as a whole still cannot go through.
    expect(result.isOrderable).toBe(false)
  })
})

describe('variants', () => {
  const withVariants = item({
    id: 'potatoes',
    name: 'Choice of Potatoes',
    priceInPence: 1195,
    variants: [
      { id: 'bombay', name: 'Bombay Aloo', priceDeltaInPence: 0, isAvailable: true },
      { id: 'saag', name: 'Saag Aloo', priceDeltaInPence: 50, isAvailable: true },
      { id: 'gobi', name: 'Gobi Aloo', priceDeltaInPence: 0, isAvailable: false },
    ],
  })

  it('adds the variant price difference', () => {
    const result = priceCart(
      [line({ itemId: 'potatoes', variantIds: ['saag'] })],
      catalogue(withVariants),
      PICKUP,
    )
    expect(result.lines[0].unitPriceInPence).toBe(1245)
    expect(result.lines[0].selectedVariants).toEqual([
      { id: 'saag', name: 'Saag Aloo', priceDeltaInPence: 50 },
    ])
  })

  it('requires a choice when the dish has variants', () => {
    const result = priceCart([line({ itemId: 'potatoes' })], catalogue(withVariants), PICKUP)
    expect(result.problems[0].code).toBe('variant_required')
  })

  it('refuses more than one', () => {
    const result = priceCart(
      [line({ itemId: 'potatoes', variantIds: ['bombay', 'saag'] })],
      catalogue(withVariants),
      PICKUP,
    )
    expect(result.problems.map((p) => p.code)).toContain('too_many_variants')
  })

  it('refuses an unavailable variant', () => {
    const result = priceCart(
      [line({ itemId: 'potatoes', variantIds: ['gobi'] })],
      catalogue(withVariants),
      PICKUP,
    )
    expect(result.problems.map((p) => p.code)).toContain('variant_unavailable')
    expect(result.subtotalInPence).toBe(0)
  })

  it('refuses a variant id that belongs to nothing', () => {
    const result = priceCart(
      [line({ itemId: 'potatoes', variantIds: ['made-up'] })],
      catalogue(withVariants),
      PICKUP,
    )
    expect(result.problems.map((p) => p.code)).toContain('variant_not_found')
  })
})

describe('modifiers', () => {
  const withModifiers = item({
    modifierGroups: [
      {
        id: 'spice',
        name: 'Spice preference',
        minSelect: 0,
        maxSelect: 1,
        isRequired: false,
        modifiers: [
          { id: 'mild', name: 'Mild', priceInPence: 0, isAvailable: true },
          { id: 'hot', name: 'Hot', priceInPence: 0, isAvailable: true },
        ],
      },
      {
        id: 'sides',
        name: 'Add a side',
        minSelect: 0,
        maxSelect: 2,
        isRequired: false,
        modifiers: [
          { id: 'naan', name: 'Garlic naan', priceInPence: 435, isAvailable: true },
          { id: 'rice', name: 'Pulao rice', priceInPence: 550, isAvailable: true },
          { id: 'raita', name: 'Cumin raita', priceInPence: 500, isAvailable: false },
        ],
      },
    ],
  })

  it('adds every chosen modifier to the unit price, then multiplies', () => {
    const result = priceCart(
      [line({ quantity: 2, modifierIds: ['hot', 'naan', 'rice'] })],
      catalogue(withModifiers),
      PICKUP,
    )
    // 1595 + 0 + 435 + 550 = 2580, twice = 5160.
    expect(result.lines[0].unitPriceInPence).toBe(2580)
    expect(result.lines[0].lineTotalInPence).toBe(5160)
  })

  it('enforces maxSelect', () => {
    const three = { ...withModifiers }
    const result = priceCart(
      [line({ modifierIds: ['naan', 'rice', 'raita'] })],
      catalogue(three),
      PICKUP,
    )
    expect(result.problems.map((p) => p.code)).toContain('too_many_modifiers')
  })

  it('refuses an unavailable modifier', () => {
    const result = priceCart([line({ modifierIds: ['raita'] })], catalogue(withModifiers), PICKUP)
    expect(result.problems.map((p) => p.code)).toContain('modifier_unavailable')
  })

  it('refuses a modifier that belongs to a different dish', () => {
    const result = priceCart([line({ modifierIds: ['smuggled'] })], catalogue(withModifiers), PICKUP)
    expect(result.problems.map((p) => p.code)).toContain('modifier_not_found')
    expect(result.subtotalInPence).toBe(0)
  })

  it('requires a choice from a required group', () => {
    const required = item({
      modifierGroups: [
        {
          id: 'size',
          name: 'Size',
          minSelect: 1,
          maxSelect: 1,
          isRequired: true,
          modifiers: [{ id: 'large', name: 'Large', priceInPence: 200, isAvailable: true }],
        },
      ],
    })
    const result = priceCart([line()], catalogue(required), PICKUP)
    expect(result.problems.map((p) => p.code)).toContain('modifier_group_required')
  })
})

describe('delivery', () => {
  it('charges nothing for collection, whatever the fee is set to', () => {
    expect(calculateDeliveryFee(1000, PICKUP)).toBe(0)
    expect(calculateDeliveryFee(9999, { ...PICKUP, orderType: 'DINE_IN' })).toBe(0)
  })

  it('charges the fee on a delivery order', () => {
    const result = priceCart([line({ quantity: 2 })], catalogue(item()), DELIVERY)
    expect(result.subtotalInPence).toBe(3190)
    expect(result.deliveryFeeInPence).toBe(349)
    expect(result.totalInPence).toBe(3539)
  })

  it('waives the fee above the free-delivery threshold', () => {
    const result = priceCart([line({ quantity: 3 })], catalogue(item()), DELIVERY)
    expect(result.subtotalInPence).toBe(4785)
    expect(result.deliveryFeeInPence).toBe(0)
    expect(result.totalInPence).toBe(4785)
  })

  it('treats the threshold as inclusive', () => {
    expect(calculateDeliveryFee(4500, DELIVERY)).toBe(0)
    expect(calculateDeliveryFee(4499, DELIVERY)).toBe(349)
  })

  it('never waives the fee when there is no threshold set', () => {
    expect(calculateDeliveryFee(100_000, { ...DELIVERY, freeDeliveryAboveInPence: null })).toBe(349)
  })

  it('blocks a delivery order below the minimum, and says how much is missing', () => {
    const result = priceCart([line()], catalogue(item()), DELIVERY)
    expect(result.isOrderable).toBe(false)
    const problem = result.problems.find((p) => p.code === 'below_minimum_order')
    expect(problem).toBeDefined()
    // £20 minimum, £15.95 in the basket: £4.05 short.
    expect(problem!.message).toContain('£4.05')
  })

  it('does not apply the minimum to collection', () => {
    const result = priceCart([line()], catalogue(item()), PICKUP)
    expect(result.isOrderable).toBe(true)
  })

  it('does not nag about the minimum when nothing could be priced', () => {
    const result = priceCart([line({ itemId: 'gone' })], catalogue(item()), DELIVERY)
    expect(result.problems.map((p) => p.code)).not.toContain('below_minimum_order')
  })
})
