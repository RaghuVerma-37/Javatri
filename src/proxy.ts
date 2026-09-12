import NextAuth from 'next-auth'
import { NextResponse, type NextRequest } from 'next/server'
import type { NextFetchEvent } from 'next/server'
import { authConfig } from '@/auth.config'

/**
 * Proxy — what Next.js called middleware until 16.0.
 *
 * Renamed per the framework's own deprecation notice (`npx @next/codemod middleware-to-proxy`):
 * the file is `proxy.ts` and the exported function is `proxy`. Nothing about the behaviour
 * changes; Next 16 already ran this on the Node.js runtime.
 *
 * Everything under /admin needs a staff session — including anything added there later. Guarding
 * in middleware rather than page by page means a new admin route is protected the moment it
 * exists, rather than the moment someone remembers to protect it.
 *
 * The outlet question is asked by a small dialog over the live site, not by a redirect through
 * an interstitial — so nothing about picking a kitchen happens here any more. The page loads;
 * the question arrives on top of it; /outlets is still a real page for anyone who wants the two
 * side by side with addresses.
 */
const { auth } = NextAuth(authConfig)

/*
  next-auth types `auth()` for the route-handler signature, which carries a `params` context that
  middleware has no concept of. The wrapper is a valid middleware function at runtime — this is
  the one place the two type worlds meet, so the cast is here and narrow rather than spread over
  the call site.
*/
type Middleware = (request: NextRequest, event: NextFetchEvent) => ReturnType<typeof NextResponse.next>

const guardAdmin = auth((request) => {
  const { pathname } = request.nextUrl

  if (pathname === '/admin/sign-in') return NextResponse.next()

  if (!request.auth) {
    const url = new URL('/admin/sign-in', request.nextUrl.origin)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}) as unknown as Middleware

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  return guardAdmin(request, event)
}

export const config = {
  matcher: ['/admin/:path*'],
}
