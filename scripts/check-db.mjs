/**
 * Checks the database the app is actually pointed at.
 *
 *   npm run db:check
 *
 * Written for the Supabase handover, where the failure is rarely "cannot connect". It is pointing
 * DATABASE_URL at the direct connection (fine until traffic arrives, then the connection limit
 * bites), or pointing DIRECT_URL at the pooler (migrations hang on an advisory lock the pooler
 * cannot hold), or dropping ?pgbouncer=true (queries then fail intermittently under load rather
 * than immediately, which is far worse to debug).
 */
import 'dotenv/config'
import pg from 'pg'

const RESET = '\u001b[0m'
const RED = '\u001b[31m'
const GREEN = '\u001b[32m'
const YELLOW = '\u001b[33m'
const DIM = '\u001b[2m'

const ok = (m) => console.log(`${GREEN}✓${RESET} ${m}`)
const warn = (m) => console.log(`${YELLOW}!${RESET} ${m}`)
const bad = (m) => console.log(`${RED}✗${RESET} ${m}`)

let problems = 0

/** Never prints the password, whatever else it says about the URL. */
function describe(raw) {
  const url = new URL(raw)
  return {
    isSupabase: /supabase/.test(url.hostname),
    isPooler: url.port === '6543' || /pooler/.test(url.hostname),
    hasPgBouncerFlag: url.searchParams.get('pgbouncer') === 'true',
    redacted: `${url.protocol}//${url.username}@${url.hostname}:${url.port || '5432'}${url.pathname}`,
  }
}

async function probe(label, raw) {
  const info = describe(raw)
  console.log(`\n${label}  ${DIM}${info.redacted}${RESET}`)

  const client = new pg.Client({ connectionString: raw, connectionTimeoutMillis: 15000 })
  try {
    await client.connect()
    const { rows } = await client.query('select current_database() as db, version() as version')
    ok(`connected to "${rows[0].db}" — ${rows[0].version.split(' ').slice(0, 2).join(' ')}`)

    const { rows: tables } = await client.query(
      `select count(*)::int as n from information_schema.tables where table_schema = 'public'`,
    )
    let dishes = -1
    if (tables[0].n > 0) {
      dishes = await client
        .query('select count(*)::int as n from "MenuItem"')
        .then((r) => r.rows[0].n)
        .catch(() => -1)
    }

    if (tables[0].n === 0) warn('no tables yet — run `npm run db:deploy`, then `npm run db:seed`')
    else if (dishes <= 0) warn(`${tables[0].n} tables, but no dishes — run \`npm run db:seed\``)
    else ok(`${tables[0].n} tables, ${dishes} dishes`)
    return info
  } catch (error) {
    bad(`cannot connect: ${error.message}`)
    problems++
    return info
  } finally {
    await client.end().catch(() => {})
  }
}

const appUrl = process.env.DATABASE_URL
if (!appUrl) {
  bad('DATABASE_URL is not set. Copy .env.example to .env and fill it in.')
  process.exit(1)
}

const app = await probe('DATABASE_URL   (the app)', appUrl)
const direct = process.env.DIRECT_URL
  ? await probe('DIRECT_URL     (migrations)', process.env.DIRECT_URL)
  : null

console.log('')
if (app.isSupabase) {
  if (!app.isPooler) {
    warn('DATABASE_URL is the direct connection. The app wants the pooled one (port 6543) — a')
    warn('serverless app on a direct connection exhausts Postgres connections under load.')
    problems++
  } else if (!app.hasPgBouncerFlag) {
    warn('DATABASE_URL is pooled but missing ?pgbouncer=true. Prisma will prepare statements the')
    warn('pooler cannot hold, and queries fail intermittently rather than obviously.')
    problems++
  } else {
    ok('DATABASE_URL is the pooled connection, with ?pgbouncer=true')
  }

  if (!direct) {
    warn('DIRECT_URL is not set. Migrations would run through the pooler and can hang on the')
    warn('migration advisory lock. Set it to the direct connection (port 5432).')
    problems++
  } else if (direct.isPooler) {
    warn('DIRECT_URL points at the pooler. Migrations need the direct connection (port 5432).')
    problems++
  } else {
    ok('DIRECT_URL is the direct connection')
  }
} else {
  ok('not Supabase — a single DATABASE_URL is all this needs')
}

console.log(
  problems === 0
    ? `\n${GREEN}Ready.${RESET}`
    : `\n${YELLOW}${problems} thing(s) to fix above.${RESET}`,
)
process.exit(problems === 0 ? 0 : 1)
