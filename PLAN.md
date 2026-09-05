# Javatri — Rebuild Plan

**Status:** proposed schema, route map and build order. Written before any application code.
**Source of truth for content:** `javatri-menu.json` (5 menus, 22 categories, 180 items).

---

## 1. What this rebuild has to fix

The brief reduces to one sentence: *a customer cannot give Javatri money on the current site.* Everything
below is subordinate to that.

| Current failure | Fix in this build |
|---|---|
| Three ordering pages, none functional | Exactly one `/order` route. The other three 301 into it. |
| Menu data duplicated in two systems, already diverging | One `MenuItem` table. The browsable menu and the ordering flow read the same rows. |
| `/menu-2` renders empty but is indexed | 301 to `/menu`, plus real pages for the menus we have. |
| "Not Accepting Orders" with no way forward | Real open/closed logic in `Europe/London` + scheduled ordering for the next open slot. |
| Three conflicting sets of opening hours | One `OpeningHours` table, editable by staff. Conflict logged for the client to resolve. |
| Farnham Common advertised but unusable | `Branch.isActive = false`. Not seeded as bookable, not shown as an option. |
| No allergen data | `allergens` on every item, filter + FSA notice in the UI, `ALLERGEN_TODO.md` for the kitchen. |
| Placeholder links, typos | Fixed at seed time; every copy change logged in `COPY_CHANGES.md`. |
| Suspicious prices | Seeded as scraped, flagged in `QUESTIONS_FOR_CLIENT.md`. Never silently changed. |

---

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16, App Router, TypeScript, server components by default | Per brief. Server-rendered menus are the SEO win. |
| Styling | Tailwind v4 | Per brief. |
| Database | PostgreSQL via Prisma | Per brief. Money as `Int` pence throughout. |
| Payments | Stripe Payment Intents + webhook | Per brief. Order confirmed only on `payment_intent.succeeded`. |
| Email | Resend, with a console-logging fallback when unconfigured | Dev works without an API key. |
| Time | `date-fns-tz`, everything computed in `Europe/London` | BST/GMT correctness is a money bug, not a cosmetic one. |
| Auth | Auth.js (credentials) + bcrypt, `/admin` only | Per brief. No public accounts in v1. |
| Postcode → lat/lng | `postcodes.io` (free, no key), cached in `PostcodeLookup` | Delivery radius without a paid geocoder. |
| Tests | Vitest | Pure-function tests on the four things that cost money if wrong. |

---

## 3. Data model

Money is **always** `Int` pence. `OrderItem` snapshots name and price so historic orders survive menu edits.

```
Branch ──┬── OpeningHours   (dayOfWeek 0-6, opensAt/closesAt as minutes since local midnight)
         ├── HolidayOverride (date, closed, opensAt/closesAt)
         ├── Menu ── MenuCategory ── MenuItem ─┬── MenuItemVariant   (priceDeltaInPence)
         │                                     └── ModifierGroup ── MenuItemModifier
         ├── Order ── OrderItem
         ├── Reservation
         └── EventEnquiry

AdminUser          staff login
StripeEvent        webhook idempotency ledger
PostcodeLookup     geocode cache
```

**Deliberate deviations from the brief's sketch, and why:**

1. **`opensAt` / `closesAt` are `Int` minutes since local midnight**, not `DateTime` or `String`. A `DateTime`
   for a recurring weekly time is a trap — it carries a date and a UTC offset that are both meaningless
   here, and it is exactly how a site ends up an hour wrong for half the year. Minutes-since-midnight is
   compared against a wall-clock time computed in `Europe/London`, so BST is handled once, in one place.
   A close time *after* midnight is stored as `>1440` (e.g. `1500` = 01:00) so late licences work.
2. **`allergens` is an `Allergen[]` enum, not `String[]`.** The 14 FSA allergens are a closed set. A free
   string column is how "sesame", "Sesame" and "sesame seeds" end up as three different allergens and
   someone gets hurt. Arrays of enums are native in Postgres.
3. **`Order` gets a `publicId` (cuid) and a human `orderNumber`.** `/order/[id]` must not be an enumerable
   integer — that would leak every customer's name, phone and address to anyone counting upwards.
4. **`StripeEvent`** table added. The brief requires an idempotent webhook; a unique index on Stripe's
   event id is the only way to actually guarantee it under retries and concurrent delivery.
5. **`ModifierGroup`** hangs off `MenuItem` with `minSelect`/`maxSelect`, so "choose 1 spice level" and
   "add any number of sides" are the same mechanism.

### Enums

- `SpiceLevel` — `NONE | MILD | HOT | EXTRA_HOT` (the JSON's tag vocabulary)
- `OrderType` — `PICKUP | DELIVERY | DINE_IN`
- `OrderStatus` — `PENDING_PAYMENT | PAID | ACCEPTED | PREPARING | READY | COMPLETED | CANCELLED | REFUNDED`
- `ReservationStatus` — `REQUESTED | CONFIRMED | SEATED | COMPLETED | CANCELLED | NO_SHOW`
- `EnquiryStatus` — `NEW | CONTACTED | QUOTED | WON | LOST`
- `Allergen` — the 14 FSA allergens

---

## 4. Route map

| Route | Rendering | Notes |
|---|---|---|
| `/` | Static + revalidate | Hero, one CTA per revenue line (order / book / events), live open-closed badge, hours, location. |
| `/menu` | Server, revalidated | All published menus on one page, filter by veg / vegan / spice / allergen. |
| `/menu/[menuSlug]` | Server, `generateStaticParams` | Indexable per-menu page with `Menu` JSON-LD. |
| `/order` | Server shell + client cart | Order type selector, postcode gate for delivery, menu, cart. |
| `/order/checkout` | Server + client Stripe element | Server re-prices the cart. Slot picker. Allergy notice. |
| `/order/[publicId]` | Server, dynamic | Order status. No auth — unguessable id. |
| `/book` | Server + client form | Reservation, Littlewick Green only. |
| `/events` | Server | Banqueting packages, capacity, enquiry form. Highest-margin line, given real estate. |
| `/contact` | Server | Address, map link, phone, hours, both branches (Farnham Common marked "coming soon"). |
| `/admin` | Server, auth-gated | Orders / menu / hours / reservations / enquiries. |

### API routes

| Route | Purpose |
|---|---|
| `POST /api/cart/price` | Server-authoritative repricing. The client never sets a price. |
| `POST /api/delivery/check` | Postcode → lat/lng → haversine → in/out of radius, min order, fee. |
| `POST /api/checkout` | Validate + reprice + create `Order` (`PENDING_PAYMENT`) + PaymentIntent. |
| `POST /api/webhooks/stripe` | Signature-verified, idempotent. `payment_intent.succeeded` → `PAID` + emails. |
| `POST /api/reservations`, `POST /api/enquiries` | Form submission + notification email. |

### Redirects (301, in `next.config.ts`)

```
/online-ordering                    → /order
/online-ordering-1                  → /order
/online-ordering-ordering-page-2    → /order
/menu-1                             → /menu
/menu-1?menu=food-menu              → /menu/food-menu
/menu-1?menu=indian-street-food     → /menu/indian-street-food
/menu-1?menu=dessert-menu           → /menu/dessert-menu
/menu-2                             → /menu
/menu-2?menu=pub-menu               → /menu          (content lost; see QUESTIONS_FOR_CLIENT.md)
/menu-2?menu=drinks-delight         → /menu
/reservation-1                      → /book
/banqueting                         → /events
/contact-us                         → /contact
```

Nothing 404s. Every URL Google currently holds lands somewhere useful.

---

## 5. The two pieces of logic worth being careful about

**Open / closed.** `src/lib/hours.ts`, pure functions over a plain schedule object, no Prisma import, so
they are trivially testable. `isOpenAt`, `nextOpeningAt`, `availableSlots`. Everything converts to
London wall-clock once at the boundary via `date-fns-tz`. Closed is never a dead end: the UI shows the
next opening time and lets the customer schedule into it.

**Cart pricing.** `src/lib/pricing.ts`, also pure. The client cart lives in `localStorage` as
*ids and quantities only* — never prices. On checkout the server loads the current rows, recomputes
every line, and refuses if an item went unavailable or the total drifted. The number sent to Stripe is
computed server-side from the database, full stop.

---

## 6. Build order

1. **Schema + seed.** `prisma/schema.prisma`, idempotent `prisma/seed.ts` reading `javatri-menu.json`,
   generation of `ALLERGEN_TODO.md`, `QUESTIONS_FOR_CLIENT.md`, `COPY_CHANGES.md`.
2. **Menu display.** `/menu`, `/menu/[menuSlug]`, filters, JSON-LD.
3. **Ordering + cart.** `/order`, order type, delivery postcode gate, cart state.
4. **Checkout + Stripe.** `/api/checkout`, `/order/checkout`, webhook, emails, `/order/[publicId]`.
5. **Reservations.** `/book`.
6. **Events.** `/events`.
7. **Admin.** Auth, orders board, menu/availability toggles, hours, reservations, enquiries.
8. **SEO / a11y / performance pass.** JSON-LD, metadata, OG, sitemap, robots, focus states, contrast,
   `next/image`.

`tsc --noEmit`, `eslint` and the test suite run after each phase.

---

## 7. Tests

Vitest, on the four things where a bug costs real money:

- `hours.test.ts` — BST/GMT transitions, closed days, past-midnight closes, next-opening across a
  closure, holiday overrides.
- `pricing.test.ts` — line totals, variants, modifiers, quantity, delivery fee, free-delivery threshold,
  minimum order rejection, unavailable item rejection.
- `delivery.test.ts` — haversine accuracy against known distances, radius boundary, unknown postcode.
- `stripe-webhook.test.ts` — bad signature rejected, duplicate event is a no-op, `payment_intent.succeeded`
  moves `PENDING_PAYMENT → PAID` exactly once.

---

## 8. Things I will not decide

Anything the JSON marks `VERIFY`, `PRICE CONFLICT`, `CONFLICTING`, `UNKNOWN` or `BROKEN` gets seeded with
the scraped value, a `TODO` comment at the seed site, and an entry in `QUESTIONS_FOR_CLIENT.md`. That
covers: the three sets of opening hours, Aloo Parantha at £6.50 vs £8.50, the coffee prices, the
£17.95 Roti Basket, the Farnham Common address, and the lost Pub Menu and Drinks Delight content.

Allergens are the sharpest case. The JSON has none, guessing them is dangerous, so the arrays seed empty,
the UI is built to display them, and `ALLERGEN_TODO.md` lists every item the kitchen must fill in before
launch. The site ships with the FSA "please tell us about allergies" notice on the menu and at checkout.

---

## 9. Out of scope for v1

Loyalty, multi-language, native app, and the Farnham Common branch (schema supports multiple branches;
only Littlewick Green is seeded active).
