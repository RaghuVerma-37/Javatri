import type { NextAuthConfig } from 'next-auth'

/**
 * The Edge-safe half of the auth setup.
 *
 * Middleware runs on the Edge runtime, where Prisma's client — which reaches for `node:path` and
 * `node:url` — cannot load. So the configuration is split: everything the proxy needs to
 * *read* a session lives here and touches nothing Node-specific, while the Credentials provider
 * that actually queries Postgres lives in `auth.ts`, which only ever runs in a Node handler.
 *
 * Verifying the session is pure JWT work, so the proxy loses nothing by not having the
 * database.
 */
export const authConfig = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 12 },
  pages: { signIn: '/admin/sign-in' },
  trustHost: true,
  // Filled in by auth.ts. The proxy never signs anyone in, only checks who they are.
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = (user as { role?: string }).role
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? ''
        ;(session.user as { role?: string }).role = token.role as string | undefined
      }
      return session
    },
  },
} satisfies NextAuthConfig
