import path from 'node:path'
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    // Only used by the CLI (migrate, db push, studio). The application connects through the
    // pg driver adapter in src/lib/db.ts.
    //
    // DIRECT_URL first, because a pooled connection cannot run migrations. Supabase (and Neon,
    // and pgBouncer generally) hands out a transaction-mode pooler on one port and a direct
    // connection on another; DDL and advisory locks need the direct one, while the app wants the
    // pooler. Unset — a plain local Postgres — and this falls back to DATABASE_URL as before.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx --env-file-if-exists=.env prisma/seed.ts',
  },
})
