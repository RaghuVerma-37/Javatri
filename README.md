# Javatri

The website for **Javatri at The Bell and Bottle** — Indian restaurant, takeaway and banqueting
venue on the Bath Road in Littlewick Green, Maidenhead.

This replaces a Wix site on which **a customer could not complete an order from any entry point**.
There were three ordering pages: one said ordering was no longer available, one showed the full menu
and refused orders, and one accepted orders against an empty menu. The menu itself existed in two
disconnected copies that had already drifted apart — the same paratha was £6.50 on one and £8.50 on
the other — and there was no allergen information anywhere, which in the UK is a legal problem
rather than an oversight.

There is now **one ordering route**, **one copy of the menu**, and an admin area where staff can
change prices, pause orders and fill in allergens without a developer.

---

## What is in here

| | |
|---|---|
| `PLAN.md` | The schema, route map and build order, written before any code. |
| `QUESTIONS_FOR_CLIENT.md` | **Read this first.** 22 things only the restaurant can answer, 6 of them blocking launch. |
| `ALLERGEN_TODO.md` | The legal blocker, as a worksheet. 171 dishes needing allergen data. |
| `COPY_CHANGES.md` | Every word that differs from the old site, so the owner can veto any of it. |
| `javatri-menu.json` | The scraped source data. The seed reads this; it is the input, not the database. |

---

## Getting it running

You need [Node.js 20 or newer](https://nodejs.org) and a PostgreSQL database. Nothing else.

### 1. Install

```bash
npm install
```

### 2. A database

Any Postgres will do. On a Mac, the quickest local one is:

```bash
brew install postgresql@17
brew services start postgresql@17
createdb javatri
```

For anything hosted, [Neon](https://neon.tech) and [Supabase](https://supabase.com) both have free
tiers and hand you a connection string.

### 3. Settings

```bash
cp .env.example .env
```

Open `.env` and fill in, at minimum:

- `DATABASE_URL` — the connection string from step 2
- `AUTH_SECRET` — run `openssl rand -base64 32` and paste the result
- `ADMIN_EMAIL` — the email you want to sign in to `/admin` with

Everything else can wait. Without Stripe keys the site runs fine and the checkout page tells
customers to phone instead of showing them a dead card form; without email keys, emails are printed
to the terminal instead of being sent, so you can place test orders without emailing anybody.

### 4. Create the tables and load the menu

```bash
npm run db:migrate     # creates the tables
npm run db:seed        # loads 5 menus, 22 sections and 180 dishes from javatri-menu.json
```

The seed prints a generated password for your admin account. **Copy it — it is shown once.**
(Set `ADMIN_PASSWORD` in `.env` beforehand if you would rather choose your own.)

### 5. Start it

```bash
npm run dev
```

Open <http://localhost:3000>. The staff area is at <http://localhost:3000/admin>.

---

## The everyday jobs

| I want to… | Where |
|---|---|
| Stop taking orders because the kitchen is slammed | `/admin` — the big button at the top |
| Mark something sold out | `/admin/menu` — the button next to the dish |
| Change a price | `/admin/menu` → click the dish |
| Fill in allergens | `/admin/menu` → click the dish → tick the boxes → tick the confirmation |
| Change opening hours | `/admin/hours` |
| Close for a bank holiday | `/admin/hours` → "Closures and one-off hours" |
| See what is on the pass | `/admin/orders` |
| Confirm a table booking | `/admin/reservations` |
| Answer an event enquiry | `/admin/enquiries` |
| Set the delivery radius and fee | `/admin/branch` |

Menu changes appear on the public site within five minutes.

---

## Things worth knowing

**Prices are never trusted from the browser.** The basket in a customer's browser holds dish ids and
quantities and nothing else. Every price shown, and the amount charged, is calculated on the server
from the database. Editing the page cannot change what you get charged, and cannot change what the
restaurant gets paid.

**An order is only confirmed when Stripe says the money arrived.** Not when the customer's browser
reaches the thank-you page. If someone closes the tab mid-payment, the order still reaches the
kitchen; if someone fakes a redirect, it does not.

**Closed is never a dead end.** If the kitchen is shut, the ordering page shows the next available
slot and lets the customer schedule into it. That was the single most expensive bug on the old site.

**Allergens are never guessed.** A dish with no allergens listed shows *"not yet confirmed — please
call us"*, never *"allergen free"*. See `ALLERGEN_TODO.md`.

**Everything the old site published still resolves.** `/online-ordering`, `/online-ordering-1`,
`/online-ordering-ordering-page-2`, `/menu-1`, `/menu-2`, the `?menu=` deep links, `/banqueting`,
`/reservation-1` and `/contact-us` all 301 to their new homes. Nothing that Google has indexed 404s.

---

## Deploying

The site is built for [Vercel](https://vercel.com), but it is a standard Next.js app and will run
anywhere that runs Node.

1. Push this repository to GitHub and import it in Vercel.
2. Add every variable from `.env.example` to the project's environment variables.
3. Set `NEXT_PUBLIC_SITE_URL` to the real domain, with no trailing slash.
4. Run the migration against the production database once: `npm run db:deploy`.
5. Seed it once: `npm run db:seed`.

### Stripe

Create a webhook endpoint in the Stripe dashboard pointing at
`https://your-domain/api/webhooks/stripe`, subscribed to `payment_intent.succeeded`,
`payment_intent.payment_failed` and `payment_intent.canceled`. Put its signing secret in
`STRIPE_WEBHOOK_SECRET`.

**Test it before going live.** If the webhook is wrong, orders are paid for and never reach the
kitchen. Locally:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Commands

```bash
npm run dev          # development server
npm run build        # production build
npm run start        # run the production build
npm run typecheck    # TypeScript, no emit
npm run lint         # ESLint
npm run test         # the test suite
npm run db:migrate   # create/apply migrations
npm run db:seed      # load the menu (safe to re-run — see below)
npm run db:studio    # browse the database in a GUI
npm run docs         # regenerate the three client documents
```

`npm run db:seed` is safe to re-run. By default it refreshes structure — menus, sections, dish names
and descriptions — and **leaves prices, availability and allergens alone**, so re-seeding cannot undo
an afternoon of allergen work or un-sell-out a dish. Pass `-- --force` to overwrite everything from
the JSON, which is what you want on a fresh database.

---

## Tests

```bash
npm run test
```

The suite covers the four places where a bug costs real money: cart pricing, the open/closed
calculation (including British Summer Time), the delivery radius, and the Stripe webhook's
idempotency. It does not test the colour of the buttons.

---

## Stack

Next.js 16 (App Router, TypeScript, server components), Tailwind v4, PostgreSQL via Prisma 7,
Stripe Payment Intents, Resend for email, Auth.js for the staff login, and `postcodes.io` for
delivery postcode lookups. Money is stored as integer pence throughout. Times are computed in
`Europe/London` via `date-fns-tz` — never with a naive `Date`, because getting British Summer Time
wrong means an hour of orders the kitchen is not expecting.
