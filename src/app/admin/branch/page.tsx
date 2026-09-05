import { ActionForm } from '@/components/admin/action-form'
import { TextInput } from '@/components/checkout/field'
import { penceToDecimalString } from '@/lib/money'
import { requireBranch } from '@/server/branch'
import { updateBranchSettings } from '@/server/admin-actions'

export const metadata = { title: 'Settings' }
export const dynamic = 'force-dynamic'

export default async function AdminBranchPage() {
  const branch = await requireBranch()

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl">Settings</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          How the website behaves for {branch.name}.
        </p>
      </div>

      {/*
        The four delivery numbers were never on the old site — it sold delivery through Just Eat —
        so they were seeded as placeholders and flagged in QUESTIONS_FOR_CLIENT.md. This page is
        where they get their real values, without a developer.
      */}
      <div className="rounded-2xl border border-accent/30 bg-accent-wash p-4 text-sm leading-relaxed">
        <strong className="font-semibold">Before you go live:</strong> the delivery radius, minimum
        order, fee and free-delivery threshold below are placeholders we chose, not numbers from
        your old site. Set them to whatever actually works for you.
      </div>

      <ActionForm action={updateBranchSettings} className="space-y-8">
        <input type="hidden" name="branchId" value={branch.id} />

        <fieldset>
          <legend className="text-lg font-medium">What we offer</legend>
          <div className="mt-3 space-y-2.5">
            <Check name="acceptsDelivery" label="Delivery" defaultChecked={branch.acceptsDelivery} />
            <Check name="acceptsDineIn" label="Order ahead to eat in" defaultChecked={branch.acceptsDineIn} />
            <Check
              name="acceptsReservations"
              label="Online table bookings"
              defaultChecked={branch.acceptsReservations}
            />
          </div>
          <p className="mt-2.5 text-xs text-muted">
            Collection is always on while you are open — to stop orders entirely, use the pause
            button on the Today page.
          </p>
        </fieldset>

        <fieldset>
          <legend className="text-lg font-medium">Delivery</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Money
              name="deliveryRadiusMiles"
              label="Radius (miles)"
              defaultValue={String(branch.deliveryRadiusMiles)}
              hint="Straight-line distance from the restaurant."
            />
            <Money
              name="minOrder"
              label="Minimum order"
              defaultValue={penceToDecimalString(branch.minOrderInPence)}
            />
            <Money
              name="deliveryFee"
              label="Delivery fee"
              defaultValue={penceToDecimalString(branch.deliveryFeeInPence)}
            />
            <Money
              name="freeDeliveryAbove"
              label="Free delivery over"
              defaultValue={
                branch.freeDeliveryAboveInPence !== null
                  ? penceToDecimalString(branch.freeDeliveryAboveInPence)
                  : ''
              }
              hint="Leave blank for never."
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-lg font-medium">Timings</legend>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <Money
              name="pickupLeadMinutes"
              label="Collection prep (mins)"
              defaultValue={String(branch.pickupLeadMinutes)}
            />
            <Money
              name="deliveryLeadMinutes"
              label="Delivery prep (mins)"
              defaultValue={String(branch.deliveryLeadMinutes)}
            />
            <Money
              name="lastOrderMinutesBeforeClose"
              label="Last orders before close"
              defaultValue={String(branch.lastOrderMinutesBeforeClose)}
            />
          </div>
          <p className="mt-2.5 text-xs text-muted">
            The earliest slot a customer can choose is the prep time from now. Nothing can be ordered
            within the last-orders window before you close.
          </p>
        </fieldset>
      </ActionForm>
    </div>
  )
}

function Check({
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

function Money({
  name,
  label,
  defaultValue,
  hint,
}: {
  name: string
  label: string
  defaultValue: string
  hint?: string
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <TextInput id={name} name={name} defaultValue={defaultValue} inputMode="decimal" className="mt-2" />
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  )
}
