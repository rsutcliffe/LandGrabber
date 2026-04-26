'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function AuthNav() {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // undefined = loading, skip render to avoid flicker
  if (user === undefined) return null

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-zinc-700 shadow hover:bg-white"
      >
        Sign in
      </Link>
    )
  }

  return (
    <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full pl-3 pr-1.5 py-1.5 shadow">
      <span className="text-xs text-zinc-600 max-w-[140px] truncate">{user.email}</span>
      <form action="/auth/signout" method="POST">
        <button
          type="submit"
          className="text-xs text-zinc-500 hover:text-zinc-900 px-2 py-0.5 rounded-full hover:bg-zinc-100"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
