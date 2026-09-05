import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

/**
 * Prisma 7 connects through a driver adapter rather than the old Rust engine, so the connection
 * string is handed over here rather than living in schema.prisma.
 *
 * The client is created lazily behind a proxy. Importing this module must never throw: a Next
 * build renders pages that do not touch the database, and a missing DATABASE_URL should surface
 * as a clear error on the first query, not as an opaque failure at module-evaluation time.
 */

type Client = InstanceType<typeof PrismaClient>

const globalForPrisma = globalThis as unknown as { __javatriPrisma?: Client }

function createClient(): Client {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and point it at your Postgres database.',
    )
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

function getClient(): Client {
  // Reuse across hot reloads in dev, or every save opens a new pool until Postgres refuses.
  if (!globalForPrisma.__javatriPrisma) {
    globalForPrisma.__javatriPrisma = createClient()
  }
  return globalForPrisma.__javatriPrisma
}

export const prisma = new Proxy({} as Client, {
  get(_target, property) {
    const client = getClient() as unknown as Record<string | symbol, unknown>
    const value = client[property]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
