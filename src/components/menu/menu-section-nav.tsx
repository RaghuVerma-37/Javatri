import type { MenuWithContent } from '@/server/menu'

/**
 * Jump straight to a section of the menu.
 *
 * The existing MenuJumpNav moves between the three *menus*; this moves between the twenty-one
 * *sections*, which is what someone is actually looking for. On a phone the order page is over
 * thirty thousand pixels tall — around forty screens — and without this the only ways to reach
 * "Main Course Chicken" are the dietary filter or a very long thumb.
 *
 * Anchors are the ids MenuSections already puts on each section, so this is a plain list of
 * links: no JavaScript, and it works in the server-rendered HTML before hydration.
 */
export function MenuSectionNav({ menus }: { menus: MenuWithContent[] }) {
  const sections = menus.flatMap((menu) =>
    menu.categories
      .filter((category) => category.items.length > 0)
      .map((category) => ({
        id: `category-${menu.slug}-${category.slug}`,
        name: category.name,
        count: category.items.length,
      })),
  )

  if (sections.length < 2) return null

  return (
    <nav
      aria-label="Jump to a section"
      /*
        Edge-to-edge on a phone so the row can be swiped without the page margin stopping it,
        and the scrollbar is left visible rather than hidden — a row that scrolls but shows no
        sign of it is a row nobody scrolls.
      */
      className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max gap-2 pb-1">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-line-strong px-4 text-sm transition-colors hover:border-olive hover:bg-lime"
            >
              {section.name}
              <span className="text-xs tabular-nums text-muted">{section.count}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
