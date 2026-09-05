import { Allergen } from '@/generated/prisma/enums'

/**
 * The 14 allergens that must be declared under assimilated Regulation (EU) 1169/2011,
 * with the wording the FSA uses.
 *
 * Note what is NOT in this file: any inference. An item's allergen list is empty until a human
 * in the kitchen fills it in, and an empty list renders as "not yet confirmed", never as
 * "allergen free". Guessing that a korma contains nuts is a coin flip with someone's airway.
 */
export const ALLERGEN_LABELS: Record<Allergen, string> = {
  CELERY: 'Celery',
  CEREALS_CONTAINING_GLUTEN: 'Cereals containing gluten',
  CRUSTACEANS: 'Crustaceans',
  EGGS: 'Eggs',
  FISH: 'Fish',
  LUPIN: 'Lupin',
  MILK: 'Milk',
  MOLLUSCS: 'Molluscs',
  MUSTARD: 'Mustard',
  PEANUTS: 'Peanuts',
  SESAME: 'Sesame',
  SOYBEANS: 'Soybeans',
  SULPHUR_DIOXIDE: 'Sulphur dioxide / sulphites',
  TREE_NUTS: 'Tree nuts',
}

export const ALL_ALLERGENS = Object.keys(ALLERGEN_LABELS) as Allergen[]

export function allergenLabel(allergen: Allergen): string {
  return ALLERGEN_LABELS[allergen]
}

/** The notice that has to appear on the menu and at checkout. */
export const ALLERGEN_NOTICE =
  'Before you order, please speak to us about your allergies or intolerances. Our dishes are prepared in a kitchen where all 14 regulated allergens are handled, so we cannot guarantee any dish is free from traces.'

export const ALLERGEN_UNCONFIRMED_NOTICE =
  'Allergen information for this dish has not been confirmed yet. Please call us on the number below before ordering if you have an allergy.'
