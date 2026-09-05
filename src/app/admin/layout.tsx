import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { auth, signOut } from '@/auth'
import { AdminNav } from '@/components/admin/admin-nav'
import { Button } from '@/components/ui'

export const metadata = {
  title: { default: 'Admin', template: '%s · Javatri admin' },
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  // The sign-in page shares this layout but must not require a session, so it renders bare.
  if (!session?.user) {
    return <div className="container-page py-16">{children}</div>
  }

  return (
    <div className="min-h-full bg-bg">
      <div className="border-b border-line bg-surface">
        <div className="container-page flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-baseline gap-3">
            <Link href="/admin" className="font-display text-xl font-semibold">
              Javatri
            </Link>
            <span className="text-sm text-muted">staff</span>
          </div>

          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-muted sm:block">{session.user.email}</p>
            <form
              action={async () => {
                'use server'
                await signOut({ redirectTo: '/admin/sign-in' })
              }}
            >
              <Button type="submit" variant="secondary" size="sm">
                <LogOut aria-hidden className="size-4" />
                Sign out
              </Button>
            </form>
          </div>
        </div>
        <AdminNav />
      </div>

      <div className="container-page py-8 sm:py-10">{children}</div>
    </div>
  )
}

/** Used by pages under this layout that must not render for a signed-out visitor. */
export async function requireSession() {
  const session = await auth()
  if (!session?.user) redirect('/admin/sign-in')
  return session
}
