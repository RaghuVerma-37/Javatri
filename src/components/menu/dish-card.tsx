import { Leaf, Sprout, TriangleAlert, Wine } from 'lucide-react'
import { AddToCartButton } from '@/components/cart/add-to-cart-button'
import { DishPhoto } from '@/components/menu/dish-photo'
import { Badge } from '@/components/ui'
import { ALLERGEN_LABELS } from '@/lib/allergens'
import { cn } from '@/lib/cn'
import { resolveDishPhoto } from '@/lib/dish-photos'
import { formatPence } from '@/lib/money'
import type { ItemWithOptions } from '@/server/menu'

const SPICE_LABEL: Record<string, string> = {
  MILD: 'Mild',
  HOT: 'Hot',
  EXTRA_HOT: 'Extra hot',
}

/** Maps the enum to the short attribute name the CSS filter rules key off. */
const ALLERGEN_ATTR: Record<string, string> = {
  CELERY: 'data-a-celery',
  CEREALS_CONTAINING_GLUTEN: 'data-a-gluten',
  CRUSTACEANS: 'data-a-crustaceans',
  EGGS: 'data-a-eggs',
  FISH: 'data-a-fish',
  LUPIN: 'data-a-lupin',
  MILK: 'data-a-milk',
  MOLLUSCS: 'data-a-molluscs',
  MUSTARD: 'data-a-mustard',
  PEANUTS: 'data-a-peanuts',
  SESAME: 'data-a-sesame',
  SOYBEANS: 'data-a-soybeans',
  SULPHUR_DIOXIDE: 'data-a-sulphites',
  TREE_NUTS: 'data-a-tree-nuts',
}

export function DishCard({
  item,
  orderable = false,
  className,
}: {
  item: ItemWithOptions
  /** True on /order, where the card grows an add-to-basket control. */
  orderable?: boolean
  className?: string
}) {
  // The filter rules read these. They are also the honest record of what we know: an item with
  // allergensConfirmed="0" has not been checked, and the card says so out loud.
  const filterAttributes: Record<string, string> = {
    'data-dish': item.id,
    /*
      What the search box matches on. Lower-cased here so the filter never has to touch the
      rendered text — reading innerText of 171 cards on every keystroke would be both slower and
      wrong, since a card hidden by a dietary filter reports no text at all.
    */
    'data-name': item.name.toLowerCase(),
    'data-veg': item.isVegetarian ? '1' : '0',
    'data-vegan': item.isVegan ? '1' : '0',
    'data-spice': item.spiceLevel,
    'data-alcohol': item.containsAlcohol ? '1' : '0',
    'data-allergens-confirmed': item.allergensConfirmed ? '1' : '0',
  }
  for (const allergen of item.allergens) {
    const attribute = ALLERGEN_ATTR[allergen]
    if (attribute) filterAttributes[attribute] = ''
  }

  const soldOut = !item.isAvailable
  const photo = resolveDishPhoto(item)

  return (
    <li
      {...filterAttributes}
      className={cn(
        'flex flex-col gap-3 border-b border-line py-5 last:border-b-0 sm:flex-row sm:items-start sm:gap-6',
        soldOut && 'opacity-60',
        className,
      )}
    >
      {/*
        Image and text share a row at every width. A full-bleed photograph per dish would read
        better in isolation and turn a 171-dish menu into something nobody can scroll on a phone;
        a thumbnail keeps the list scannable, which is what a menu is for.
      */}
      <div className="flex min-w-0 flex-1 gap-3.5 sm:gap-5">
        {photo ? (
          <DishPhoto
            src={photo.src}
            name={item.name}
            isOwnPhotograph={!photo.isLibrary}
            soldOut={soldOut}
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h4 className="font-display text-lg font-semibold leading-snug text-ink">{item.name}</h4>
            <p className="ml-auto shrink-0 font-display text-lg font-semibold tabular-nums text-brand-text sm:hidden">
              {formatPence(item.priceInPence)}
            </p>
          </div>

          {item.description ? (
            <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">{item.description}</p>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {soldOut ? <Badge tone="danger">Sold out tonight</Badge> : null}
            {item.isVegan ? (
              <Badge tone="ok">
                <Sprout aria-hidden className="size-3" /> Vegan
              </Badge>
            ) : item.isVegetarian ? (
              <Badge tone="ok">
                <Leaf aria-hidden className="size-3" /> Vegetarian
              </Badge>
            ) : null}
            {SPICE_LABEL[item.spiceLevel] ? (
              <Badge tone={item.spiceLevel === 'MILD' ? 'neutral' : 'brand'}>
                {SPICE_LABEL[item.spiceLevel]}
              </Badge>
            ) : null}
            {item.containsAlcohol ? (
              <Badge tone="accent">
                <Wine aria-hidden className="size-3" /> Contains alcohol
              </Badge>
            ) : null}
            {item.variants.length > 0 ? (
              <Badge tone="neutral">{item.variants.length} to choose from</Badge>
            ) : null}
          </div>

          {item.allergensConfirmed ? (
            <p className="mt-2 text-xs text-muted">
              <span className="font-medium text-ink">Allergens:</span>{' '}
              {item.allergens.length > 0
                ? item.allergens.map((a) => ALLERGEN_LABELS[a]).join(', ')
                : 'none of the 14 regulated allergens'}
            </p>
          ) : (
            /*
              Shown only while an allergen filter is active — see globals.css. The filter cannot
              vouch for a dish nobody has checked, and saying nothing would let the customer assume
              it had been cleared.
            */
            <p className="dish-unchecked mt-2 hidden items-start gap-1.5 text-xs text-warn">
              <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
              <span>Allergens not confirmed for this dish — the filter cannot check it. Please call us.</span>
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
        <p className="hidden font-display text-lg font-semibold tabular-nums text-brand-text sm:block">
          {formatPence(item.priceInPence)}
        </p>
        {orderable ? (
          /*
            Narrowed deliberately. Passing the whole Prisma row would ship timestamps, staff notes
            and sort orders across the RSC boundary for all 155 orderable dishes; this sends the
            five fields the button actually needs.
          */
          <AddToCartButton
            item={{
              id: item.id,
              name: item.name,
              priceInPence: item.priceInPence,
              isAvailable: item.isAvailable,
              variants: item.variants.map((v) => ({
                id: v.id,
                name: v.name,
                priceDeltaInPence: v.priceDeltaInPence,
                isAvailable: v.isAvailable,
              })),
              modifierGroups: item.modifierGroups.map((g) => ({
                id: g.id,
                name: g.name,
                minSelect: g.minSelect,
                maxSelect: g.maxSelect,
                isRequired: g.isRequired,
                modifiers: g.modifiers.map((m) => ({
                  id: m.id,
                  name: m.name,
                  priceInPence: m.priceInPence,
                  isAvailable: m.isAvailable,
                })),
              })),
            }}
          />
        ) : null}
      </div>
    </li>
  )
}
