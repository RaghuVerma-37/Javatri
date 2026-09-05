import path from 'node:path'
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    // Only used by the CLI (migrate, db push, studio). The application connects through the
    // pg driver adapter in src/lib/db.ts.
    url: process.env.DATABASE_URL ?? '',
  },
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx --env-file-if-exists=.env prisma/seed.ts',
  },
})
