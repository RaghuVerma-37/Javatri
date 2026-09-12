'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Search, SlidersHorizontal, TriangleAlert, X } from 'lucide-react'
import { Chillies } from '@/components/menu/chilli-scale'
import { Badge, Button } from '@/components/ui'
import { ALLERGEN_LABELS } from '@/lib/allergens'
import { cn } from '@/lib/cn'
import type { Allergen } from '@/generated/prisma/enums'

/**
 * Menu filters.
 *
 * The 180 dish cards are server components and never cross the RSC boundary. This component owns
 * only the filter state; the hiding is done by class-driven CSS rules in globals.css. That keeps
 * the whole menu in the server-rendered HTML — which is what Google indexes and what shows up
 * before JavaScript arrives — while the filter itself stays instant.
 *
 * The one thing it will not do is claim a dish is safe. Excluding an allergen hides dishes known
 * to contain it; dishes nobody has checked stay visible with a warning, because hiding them would
 * imply they had been cleared.
 */

const SPICE_OPTIONS = [
  { value: 'any', label: 'Any', heat: 0 },
  { value: 'mild', label: 'Mild', heat: 1 },
  { value: 'hot', label: 'Hot', heat: 2 },
] as const

type Spice = (typeof SPICE_OPTIONS)[number]['value']

const ALLERGEN_CLASS: Record<Allergen, string> = {
  CELERY: 'exclude-celery',
  CEREALS_CONTAINING_GLUTEN: 'exclude-gluten',
  CRUSTACEANS: 'exclude-crustaceans',
  EGGS: 'exclude-eggs',
  FISH: 'exclude-fish',
  LUPIN: 'exclude-lupin',
  MILK: 'exclude-milk',
  MOLLUSCS: 'exclude-molluscs',
  MUSTARD: 'exclude-mustard',
  PEANUTS: 'exclude-peanuts',
  SESAME: 'exclude-sesame',
  SOYBEANS: 'exclude-soybeans',
  SULPHUR_DIOXIDE: 'exclude-sulphites',
  TREE_NUTS: 'exclude-tree-nuts',
}

const ALL_ALLERGEN_CLASSES = Object.values(ALLERGEN_CLASS)

export function MenuFilters({
  rootId,
  totalDishes,
  unconfirmedAllergenCount,
}: {
  rootId: string
  totalDishes: number
  unconfirmedAllergenCount: number
}) {
  const panelId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [vegetarian, setVegetarian] = useState(false)
  const [vegan, setVegan] = useState(false)
  const [noAlcohol, setNoAlcohol] = useState(false)
  const [spice, setSpice] = useState<Spice>('any')
  const [excluded, setExcluded] = useState<Allergen[]>([])
  const [query, setQuery] = useState('')
  const countRef = useRef<HTMLParagraphElement>(null)
  const emptyRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const root = document.getElementById(rootId)
    if (!root) return

    root.classList.toggle('menu-filter-veg', vegetarian && !vegan)
    root.classList.toggle('menu-filter-vegan', vegan)
    root.classList.toggle('menu-filter-no-alcohol', noAlcohol)
    root.classList.toggle('menu-filter-spice-mild', spice === 'mild')
    root.classList.toggle('menu-filter-spice-hot', spice === 'hot')
    root.classList.toggle('menu-filtering-allergens', excluded.length > 0)

    for (const className of ALL_ALLERGEN_CLASSES) root.classList.remove(className)
    for (const allergen of excluded) root.classList.add(ALLERGEN_CLASS[allergen])

    // Search is a per-dish attribute rather than a root class: there is no way to express
    // "name contains this text" in CSS, so the match happens here and the rule in globals.css
    // does the hiding. Matching runs against data-name, not the rendered text.
    const needle = query.trim().toLowerCase()
    for (const dish of Array.from(root.querySelectorAll<HTMLElement>('[data-dish]'))) {
      const name = dish.getAttribute('data-name') ?? ''
      dish.toggleAttribute('data-search-hidden', needle.length > 0 && !name.includes(needle))
    }

    // CSS can hide a dish but it cannot tell a section that all of its dishes are gone, so the
    // empty-section collapse and the running count are done here, once, after the classes settle.
    //
    // Both are written straight to the DOM rather than back into React state. The count is read
    // *out* of the DOM, so feeding it back in would be a render caused by the result of the last
    // render — the cascading update the react-hooks rules exist to prevent. The element is a
    // live region either way, so a screen reader is told all the same.
    // Counted once across the whole root rather than summed per section. Sections nest — a menu
    // section contains the category sections — so a dish belongs to two of them, and summing the
    // per-section totals reported exactly double the real number.
    const visible = Array.from(root.querySelectorAll<HTMLElement>('[data-dish]')).filter(
      (dish) => getComputedStyle(dish).display !== 'none',
    ).length

    for (const section of Array.from(root.querySelectorAll<HTMLElement>('[data-menu-section]'))) {
      const dishes = Array.from(section.querySelectorAll<HTMLElement>('[data-dish]'))
      const shown = dishes.filter((dish) => getComputedStyle(dish).display !== 'none').length
      section.hidden = shown === 0
    }

    if (countRef.current) {
      const hasFilter =
        vegetarian || vegan || noAlcohol || spice !== 'any' || excluded.length > 0 || needle.length > 0
      countRef.current.textContent = hasFilter
        ? `${visible} of ${totalDishes} dishes`
        : `${totalDishes} dishes`
    }

    // Every section is hidden when nothing matches, which would otherwise leave the reader
    // staring at an empty page wondering whether the site had broken.
    if (emptyRef.current) emptyRef.current.hidden = visible > 0
  }, [rootId, vegetarian, vegan, noAlcohol, spice, excluded, query, totalDishes])

  const activeCount =
    (vegetarian ? 1 : 0) + (vegan ? 1 : 0) + (noAlcohol ? 1 : 0) + (spice !== 'any' ? 1 : 0) + excluded.length

  const reset = () => {
    setVegetarian(false)
    setVegan(false)
    setNoAlcohol(false)
    setSpice('any')
    setExcluded([])
    setQuery('')
  }

  return (
    <div className="rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 p-3 sm:p-4">
        <div className="relative w-full sm:w-56">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search dishes"
            aria-label="Search dishes by name"
            className="min-h-11 w-full rounded-full border border-line-strong bg-bg pl-9 pr-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
          />
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls={panelId}
        >
          <SlidersHorizontal aria-hidden className="size-4" />
          Filter dishes
          {activeCount > 0 ? (
            <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-semibold text-on-brand">
              {activeCount}
            </span>
          ) : null}
        </Button>

        <Toggle label="Vegetarian" checked={vegetarian} onChange={setVegetarian} />
        <Toggle label="Vegan" checked={vegan} onChange={setVegan} />

        <p ref={countRef} aria-live="polite" className="ml-auto text-sm text-muted">
          {totalDishes} dishes
        </p>
      </div>

      <p
        ref={emptyRef}
        hidden
        role="status"
        /*
          Deliberately no display utility. The `hidden` attribute is a UA-stylesheet rule, and any
          author-level `display` class — `flex` included — silently beats it, leaving the message
          on screen permanently. A plain block paragraph is the one that actually hides.
        */
        className="border-t border-line px-3 py-3 text-sm text-muted sm:px-4"
      >
        No dishes match.{' '}
        <Button variant="quiet" size="sm" onClick={reset} className="align-baseline">
          <X aria-hidden className="size-4" />
          Clear search and filters
        </Button>
      </p>

      <div id={panelId} hidden={!isOpen} className="border-t border-line p-3 sm:p-4">
        <div className="grid gap-6 sm:grid-cols-2">
          <fieldset>
            <legend className="text-sm font-semibold text-ink">Heat</legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {SPICE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                    spice === option.value
                      ? 'border-brand bg-brand text-on-brand'
                      : 'border-line-strong hover:bg-surface-2',
                  )}
                >
                  <input
                    type="radio"
                    name="spice"
                    className="sr-only"
                    checked={spice === option.value}
                    onChange={() => setSpice(option.value)}
                  />
                  {option.heat ? <Chillies heat={option.heat} of={option.heat} /> : null}
                  {option.label}
                </label>
              ))}
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={noAlcohol}
                onChange={(event) => setNoAlcohol(event.target.checked)}
                className="size-4 accent-[var(--brand)]"
              />
              Hide dishes containing alcohol
            </label>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Hide dishes containing</legend>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(Object.keys(ALLERGEN_LABELS) as Allergen[]).map((allergen) => {
                const on = excluded.includes(allergen)
                return (
                  <label
                    key={allergen}
                    className={cn(
                      'cursor-pointer rounded-full border px-3 py-1.5 text-xs transition-colors',
                      on ? 'border-brand bg-brand text-on-brand' : 'border-line-strong hover:bg-surface-2',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() =>
                        setExcluded((current) =>
                          on ? current.filter((a) => a !== allergen) : [...current, allergen],
                        )
                      }
                    />
                    {ALLERGEN_LABELS[allergen]}
                  </label>
                )
              })}
            </div>
          </fieldset>
        </div>

        {excluded.length > 0 && unconfirmedAllergenCount > 0 ? (
          <p
            role="status"
            className="mt-5 flex gap-2.5 rounded-xl border border-warn/30 bg-warn-wash p-3.5 text-sm leading-relaxed"
          >
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn" />
            <span>
              <strong className="font-semibold">This filter cannot be trusted yet.</strong>{' '}
              {unconfirmedAllergenCount} of our {totalDishes} dishes have not had their allergen
              information confirmed, so the filter has nothing to check them against. They are still
              shown, marked with a warning, rather than hidden — hiding them would suggest they had
              been checked and cleared. If you have an allergy, please call us on{' '}
              <a href="tel:+441628825753" className="font-medium underline underline-offset-2">
                01628 825753
              </a>
              .
            </span>
          </p>
        ) : null}

        {activeCount > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="quiet" size="sm" onClick={reset}>
              <X aria-hidden className="size-4" />
              Clear filters
            </Button>
            {excluded.map((allergen) => (
              <Badge key={allergen} tone="brand">
                No {ALLERGEN_LABELS[allergen].toLowerCase()}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label
      className={cn(
        'cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors',
        checked ? 'border-brand bg-brand text-on-brand' : 'border-line-strong hover:bg-surface-2',
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  )
}
