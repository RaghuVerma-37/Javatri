import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TriangleAlert } from 'lucide-react'
import { TextArea, TextInput, inputClass } from '@/components/checkout/field'
import { ActionForm } from '@/components/admin/action-form'
import { ALLERGEN_LABELS, ALL_ALLERGENS } from '@/lib/allergens'
import { prisma } from '@/lib/db'
import { penceToDecimalString } from '@/lib/money'
import { updateMenuItem } from '@/server/admin-actions'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ itemId: string }> }

export async function generateMetadata({ params }: Props) {
  const { itemId } = await params
  const item = await prisma.menuItem.findUnique({ where: { id: itemId }, select: { name: true } })
  return { title: item?.name ?? 'Dish' }
}

export default async function EditItemPage({ params }: Props) {
  const { itemId } = await params
  const item = await prisma.menuItem.findUnique({
    where: { id: itemId },
    include: {
      category: { include: { menu: { select: { name: true } } } },
      variants: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (!item) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/admin/menu" className="hover:text-brand-text">
          ← All dishes
        </Link>
      </nav>

      <div>
        <h1 className="text-3xl">{item.name}</h1>
        <p className="mt-1.5 text-sm text-muted">
          {item.category.menu.name} · {item.category.name}
        </p>
      </div>

      {item.staffNote ? (
        <p className="flex gap-2.5 rounded-2xl border border-accent/30 bg-accent-wash p-4 text-sm">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>
            <strong className="font-semibold">Note from the rebuild:</strong> {item.staffNote}
          </span>
        </p>
      ) : null}

      <ActionForm action={updateMenuItem} className="space-y-6">
        <input type="hidden" name="itemId" value={item.id} />

        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            Name
          </label>
          <TextInput id="name" name="name" defaultValue={item.name} required className="mt-2" />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium">
            Description
          </label>
          <TextArea
            id="description"
            name="description"
            defaultValue={item.description}
            className="mt-2"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="price" className="block text-sm font-medium">
              Price
            </label>
            <TextInput
              id="price"
              name="price"
              defaultValue={penceToDecimalString(item.priceInPence)}
              inputMode="decimal"
              required
              className="mt-2"
            />
            <p className="mt-1.5 text-xs text-muted">In pounds, e.g. 12.95</p>
          </div>

          <div>
            <label htmlFor="spiceLevel" className="block text-sm font-medium">
              Heat
            </label>
            <select
              id="spiceLevel"
              name="spiceLevel"
              defaultValue={item.spiceLevel}
              className={`${inputClass} mt-2`}
            >
              <option value="NONE">Not spiced</option>
              <option value="MILD">Mild</option>
              <option value="HOT">Hot</option>
              <option value="EXTRA_HOT">Extra hot</option>
            </select>
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-medium">Diet and availability</legend>
          <div className="mt-3 space-y-2.5">
            <Checkbox name="isVegetarian" label="Vegetarian" defaultChecked={item.isVegetarian} />
            <Checkbox
              name="isVegan"
              label="Vegan (this also marks it vegetarian)"
              defaultChecked={item.isVegan}
            />
            <Checkbox
              name="containsAlcohol"
              label="Contains alcohol"
              defaultChecked={item.containsAlcohol}
            />
            <Checkbox name="isAvailable" label="On the menu today" defaultChecked={item.isAvailable} />
          </div>
        </fieldset>

        <fieldset className="rounded-2xl border border-warn/30 bg-warn-wash p-4 sm:p-5">
          <legend className="px-1 text-sm font-semibold">Allergens</legend>
          <p className="text-sm leading-relaxed text-ink/85">
            Tick every one of the 14 regulated allergens this dish contains, then tick the
            confirmation box at the bottom. Until that box is ticked the website tells customers the
            information has not been confirmed and asks them to call — which is deliberate. An empty
            list is never shown as &ldquo;allergen free&rdquo;.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {ALL_ALLERGENS.map((allergen) => (
              <label key={allergen} className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  name="allergens"
                  value={allergen}
                  defaultChecked={item.allergens.includes(allergen)}
                  className="size-4 accent-[var(--brand)]"
                />
                {ALLERGEN_LABELS[allergen]}
              </label>
            ))}
          </div>

          <label className="mt-5 flex items-start gap-2.5 border-t border-warn/25 pt-4 text-sm font-medium">
            <input
              type="checkbox"
              name="allergensConfirmed"
              defaultChecked={item.allergensConfirmed}
              className="mt-0.5 size-4 accent-[var(--brand)]"
            />
            <span>
              I have checked this dish against the recipe and the list above is correct.
            </span>
          </label>
        </fieldset>

        {item.variants.length > 0 ? (
          <p className="text-sm text-muted">
            This dish has {item.variants.length} options ({item.variants.map((v) => v.name).join(', ')}
            ). Options are not editable here yet — ask a developer.
          </p>
        ) : null}

      </ActionForm>
    </div>
  )
}

function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string
  label: string
  defaultChecked: boolean
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 accent-[var(--brand)]"
      />
      {label}
    </label>
  )
}
