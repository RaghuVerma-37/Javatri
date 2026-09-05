import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/auth.config'

/**
 * Everything under /admin needs a staff session — including anything added there later. Guarding
 * in middleware rather than page by page means a new admin route is protected the moment it
 * exists, rather than the moment someone remembers to protect it.
 *
 * Built from the Edge-safe config: this only verifies the session JWT, which needs no database.
 */
const { auth } = NextAuth(authConfig)

export default auth((request) => {
  const { pathname } = request.nextUrl

  if (pathname === '/admin/sign-in') return NextResponse.next()

  if (!request.auth) {
    const url = new URL('/admin/sign-in', request.nextUrl.origin)
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/admin/:path*'],
}
