import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-zinc-900 font-semibold text-lg">Authentication failed</h1>
        <p className="mt-2 text-sm text-zinc-500">
          The sign-in link may have expired or already been used.
        </p>
        <Link
          href="/auth/login"
          className="mt-6 inline-block px-4 py-2 text-sm bg-zinc-900 text-white rounded hover:bg-zinc-700"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  )
}
