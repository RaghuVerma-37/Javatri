import { Chillies } from '@/components/menu/chilli-scale'
import { DietMark } from '@/components/menu/diet-mark'
import { DishCard } from '@/components/menu/dish-card'
import type { MenuWithContent } from '@/server/menu'

/** What the marks on the dishes mean, stated once above the list. */
function MenuKey() {
  return (
    <p className="mb-10 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-sm text-muted">
      <span className="inline-flex items-center gap-2">
        <span aria-hidden className="contents">
          <DietMark diet="veg" />
        </span>
        Vegetarian
      </span>
      <span className="inline-flex items-center gap-2">
        <span aria-hidden className="contents">
          <DietMark diet="non-veg" />
        </span>
        Meat, fish or egg
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Chillies heat={1} /> Mild
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Chillies heat={2} /> Hot
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Chillies heat={3} /> Extra hot
      </span>
    </p>
  )
}

/**
 * The menu itself. Server components all the way down — no dish data crosses into the browser,
 * so the page ships as HTML and the filter (a separate, tiny client component) works on it.
 */
export function MenuSections({
  menus,
  orderable = false,
  headingLevel = 2,
}: {
  menus: MenuWithContent[]
  orderable?: boolean
  headingLevel?: 2 | 3
}) {
  const MenuHeading = headingLevel === 2 ? 'h2' : 'h3'
  const CategoryHeading = headingLevel === 2 ? 'h3' : 'h4'

  return (
    <div>
    <MenuKey />
    <div className="space-y-14">
      {menus.map((menu) => (
        <section key={menu.id} aria-labelledby={`menu-${menu.slug}`} data-menu-section>
          {menus.length > 1 ? (
            <div className="mb-8 border-b border-line-strong pb-4">
              <MenuHeading
                id={`menu-${menu.slug}`}
                className="scroll-mt-24 text-3xl sm:text-4xl"
              >
                {menu.name}
              </MenuHeading>
              {menu.serviceNote ? (
                <p className="mt-2 text-sm text-muted">{menu.serviceNote}</p>
              ) : null}
            </div>
          ) : (
            <h2 id={`menu-${menu.slug}`} className="sr-only">
              {menu.name}
            </h2>
          )}

          <div className="space-y-12">
            {menu.categories.map((category) => (
              <section
                key={category.id}
                aria-labelledby={`category-${menu.slug}-${category.slug}`}
                data-menu-section
              >
                {/* A short Pistachio rule above every category. It is the brand tone's only job
                    on this page — twenty-one small marks down a very long list, rather than a
                    green wash under the whole of it.

                    Static, and the sections do not fade in either. This page exists to be read:
                    revealing each category on scroll left the first dishes blank under their own
                    heading until you moved, and twenty-one fades is noise in a list people scan
                    fast. The motion lives on the homepage, where it is atmosphere rather than an
                    obstacle. */}
                <span aria-hidden className="block h-1 w-10 rounded-full bg-pistachio" />
                <CategoryHeading
                  id={`category-${menu.slug}-${category.slug}`}
                  className="mt-3 scroll-mt-24 text-xl sm:text-2xl"
                >
                  {category.name}
                </CategoryHeading>
                {category.note ? (
                  <p className="mt-1.5 text-sm text-muted">{category.note}</p>
                ) : null}

                <ul className="mt-4">
                  {category.items.map((item) => (
                    <DishCard
                      key={item.id}
                      item={item}
                      orderable={orderable}
                      categoryName={category.name}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      ))}
    </div>
    </div>
  )
}

export function countDishes(menus: MenuWithContent[]): number {
  return menus.reduce((total, menu) => total + menu.categories.reduce((n, c) => n + c.items.length, 0), 0)
}

export function countUnconfirmedAllergens(menus: MenuWithContent[]): number {
  return menus.reduce(
    (total, menu) =>
      total +
      menu.categories.reduce(
        (n, c) => n + c.items.filter((item) => !item.allergensConfirmed).length,
        0,
      ),
    0,
  )
}
