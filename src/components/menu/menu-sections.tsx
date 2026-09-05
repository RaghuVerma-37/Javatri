import { DishCard } from '@/components/menu/dish-card'
import type { MenuWithContent } from '@/server/menu'

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
                <CategoryHeading
                  id={`category-${menu.slug}-${category.slug}`}
                  className="scroll-mt-24 text-xl sm:text-2xl"
                >
                  {category.name}
                </CategoryHeading>
                {category.note ? (
                  <p className="mt-1.5 text-sm text-muted">{category.note}</p>
                ) : null}

                <ul className="mt-4">
                  {category.items.map((item) => (
                    <DishCard key={item.id} item={item} orderable={orderable} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      ))}
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
