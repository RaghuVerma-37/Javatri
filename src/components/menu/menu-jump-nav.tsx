import Link from 'next/link'
import type { MenuWithContent } from '@/server/menu'

/**
 * Jump links.
 *
 * The old site's menu navigation listed FOOD MENU / INDIAN STREET FOOD / DESSERT MENU twice, and
 * the ?menu= links resolved to the wrong menu — asking for street food served the dessert list.
 * Generated from the database, each menu can appear exactly once and can only link to itself.
 */
export function MenuJumpNav({ menus, currentSlug }: { menus: MenuWithContent[]; currentSlug?: string }) {
  if (menus.length < 2) return null

  return (
    <nav aria-label="Jump to a menu" className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max gap-2 pb-1">
        {menus.map((menu) => (
          <li key={menu.id}>
            <Link
              href={currentSlug ? `/menu/${menu.slug}` : `#menu-${menu.slug}`}
              aria-current={currentSlug === menu.slug ? 'page' : undefined}
              className={
                currentSlug === menu.slug
                  ? 'inline-flex rounded-full bg-brand px-4 py-2 text-sm font-medium text-on-brand'
                  : 'inline-flex rounded-full border border-line-strong px-4 py-2 text-sm transition-colors hover:bg-surface-2'
              }
            >
              {menu.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
