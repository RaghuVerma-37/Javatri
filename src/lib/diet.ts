/**
 * Veg or non-veg, the way a menu in India marks it: a green dot in a square, or a brown triangle
 * in a square. Anyone who has eaten from an Indian menu reads it before they read the dish name.
 *
 * The asymmetry is deliberate. "Vegetarian" comes from the dish's own tag and nothing else. "Non-veg"
 * is only claimed when the dish or its section *names* meat, fish or egg — Chicken Tikka, Main
 * Course Lamb, "(Non-Veg)". A dish that is neither tagged nor named (the chaat, most of the
 * vegetable curries, the drinks) gets no mark at all, because a brown triangle on a vegetarian dish
 * is as wrong as a green dot on a lamb one, and the scraped menu is missing plenty of tags.
 */
export type Diet = 'veg' | 'non-veg'

const NON_VEG =
  /\b(chicken|lamb|gosht|keema|mutton|meat|maas|fish|prawns?|jhinga|squid|salmon|sea ?food|egg|boti)\b|\(non-?veg\)/i

export function dietOf(
  item: { name: string; isVegetarian: boolean },
  categoryName = '',
): Diet | null {
  if (item.isVegetarian) return 'veg'
  if (NON_VEG.test(item.name) || NON_VEG.test(categoryName)) return 'non-veg'
  return null
}
