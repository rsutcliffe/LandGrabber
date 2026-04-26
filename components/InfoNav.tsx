import Link from 'next/link'

export default function InfoNav() {
  return (
    <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center gap-6">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">← Map</Link>
      <nav className="flex items-center gap-4 text-sm text-zinc-500">
        <Link href="/about" className="hover:text-zinc-900">About</Link>
        <Link href="/glossary" className="hover:text-zinc-900">Glossary</Link>
        <Link href="/legal" className="hover:text-zinc-900">Legal</Link>
      </nav>
    </header>
  )
}
