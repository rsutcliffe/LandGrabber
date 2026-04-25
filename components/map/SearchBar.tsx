'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface GeocodeResult {
  display_name: string
  lat: string
  lon: string
}

interface SearchBarProps {
  onSelect: (lat: number, lng: number) => void
}

export default function SearchBar({ onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data: GeocodeResult[] = await res.json()
        setResults(data)
        setOpen(data.length > 0)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setQuery(value)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => search(value), 400)
    },
    [search]
  )

  const handleSelect = useCallback(
    (result: GeocodeResult) => {
      setQuery(result.display_name.split(',')[0])
      setOpen(false)
      setResults([])
      onSelect(parseFloat(result.lat), parseFloat(result.lon))
    },
    [onSelect]
  )

  // Close dropdown on outside click
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  return (
    <div ref={containerRef} className="relative w-80">
      <div className="flex items-center bg-white rounded-lg shadow-md border border-zinc-200">
        <svg
          className="ml-3 w-4 h-4 text-zinc-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={handleChange}
          placeholder="Search for a location in England..."
          aria-label="Search location"
          autoComplete="off"
          className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent text-zinc-900 placeholder:text-zinc-400"
        />
        {loading && (
          <div
            className="mr-3 w-4 h-4 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"
            aria-label="Searching"
          />
        )}
      </div>

      {open && results.length > 0 && (
        <ul
          role="listbox"
          aria-label="Search results"
          className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-lg border border-zinc-200 overflow-hidden"
        >
          {results.map((r, i) => (
            <li key={i} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => handleSelect(r)}
                className="w-full text-left px-4 py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 truncate"
              >
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
