import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { authConfig } from '@/auth.config'
import { prisma } from '@/lib/db'

/**
 * Staff authentication.
 *
 * Deliberately small: there are no public accounts on this site, only the people who work here,
 * so this is a credentials provider over an AdminUser table and nothing else. No OAuth to
 * configure, no password reset flow to get wrong, no customer PII sitting behind a login.
 *
 * Three details that matter:
 *   • The failure message never distinguishes "no such user" from "wrong password", so the form
 *     cannot be used to find out who works here.
 *   • A bcrypt comparison runs even when the email is unknown, so response time does not leak it
 *     either.
 *   • Sessions are JWTs, so there is no session table and no database round trip per request.
 *
 * This module imports Prisma and therefore only ever runs in a Node handler. The Edge-safe half
 * of the configuration lives in auth.config.ts, which is what the proxy uses.
 */

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

// A real bcrypt hash of a value nobody knows, compared against when the user does not exist so
// that a missing account costs the same ~100ms as a wrong password.
const TIMING_DECOY = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.4nOJb6EfLMFTBoZ7fBOJhfDMhoQ8dGa'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null

        const user = await prisma.adminUser.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        })

        const matches = await bcrypt.compare(
          parsed.data.password,
          user?.passwordHash ?? TIMING_DECOY,
        )

        if (!user || !user.isActive || !matches) return null

        await prisma.adminUser.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
})
