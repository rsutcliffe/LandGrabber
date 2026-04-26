'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-zinc-900 font-semibold text-lg">Check your email</h1>
          <p className="mt-2 text-sm text-zinc-500">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-zinc-900 font-semibold text-lg mb-6">Create an account</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-zinc-700 mb-1">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-zinc-700 mb-1">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
            <p className="mt-1 text-xs text-zinc-400">Minimum 8 characters</p>
          </div>

          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700 disabled:opacity-50"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-sm text-zinc-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-zinc-900 underline">Sign in</Link>
        </p>
      </div>
    </main>
  )
}
