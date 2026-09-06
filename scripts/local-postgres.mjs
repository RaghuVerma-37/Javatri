import { PostgresMemoryServer } from 'postgres-memory-server'

const db = await PostgresMemoryServer.create({
  database: 'javatri',
  username: 'javatri',
  password: 'javatri',
})

const uri = db.getUri()
console.log(`DATABASE_URL=${uri}`)
console.log(`Local Postgres listening on port ${db.getPort()}`)

process.on('SIGINT', async () => {
  await db.stop()
  process.exit(0)
})
process.on('SIGTERM', async () => {
  await db.stop()
  process.exit(0)
})
