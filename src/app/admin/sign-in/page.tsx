import { AuthError } from 'next-auth'
import { redirect } from 'next/navigation'
import { auth, signIn } from '@/auth'
import { Button } from '@/components/ui'
import { TextInput } from '@/components/checkout/field'

export const metadata = { title: 'Sign in', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ from?: string; error?: string }> }

export default async function SignInPage({ searchParams }: Props) {
  const session = await auth()
  const params = await searchParams
  if (session?.user) redirect(params.from ?? '/admin')

  async function signInAction(formData: FormData) {
    'use server'
    const from = String(formData.get('from') ?? '/admin')
    try {
      await signIn('credentials', {
        email: String(formData.get('email') ?? ''),
        password: String(formData.get('password') ?? ''),
        redirectTo: from.startsWith('/admin') ? from : '/admin',
      })
    } catch (error) {
      // signIn throws a redirect on success; only a real AuthError means bad credentials.
      if (error instanceof AuthError) {
        redirect(`/admin/sign-in?error=1${from ? `&from=${encodeURIComponent(from)}` : ''}`)
      }
      throw error
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-3xl">Staff sign in</h1>
      <p className="mt-2 text-sm text-muted">
        This is the Javatri admin area. If you are here by accident,{' '}
        <a href="/" className="underline underline-offset-2">
          go back to the restaurant
        </a>
        .
      </p>

      <form action={signInAction} className="mt-8 space-y-4">
        <input type="hidden" name="from" value={params.from ?? '/admin'} />

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            className="mt-2"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Password
          </label>
          <TextInput
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="mt-2"
          />
        </div>

        {params.error ? (
          <p role="alert" className="rounded-xl border border-danger/30 bg-danger-wash p-3.5 text-sm">
            {/* Deliberately vague: this must not reveal whether the email exists. */}
            That email and password do not match.
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full">
          Sign in
        </Button>
      </form>
    </div>
  )
}
