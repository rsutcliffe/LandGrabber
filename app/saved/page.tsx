import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import RemoveParcelButton from '@/components/saved/RemoveParcelButton'

function formatArea(sqm: number | null): string {
  if (!sqm) return '—'
  if (sqm >= 10000) return `${(sqm / 10000).toFixed(2)} ha`
  return `${Math.round(sqm).toLocaleString()} m²`
}

const TYPE_LABEL: Record<string, string> = {
  unregistered: 'No registered title',
  common: 'Registered common land',
  registered: 'Registered freehold',
}

export default async function SavedPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login?next=/saved')

  const { data: parcels, error } = await supabase
    .from('saved_parcels')
    .select('id, parcel_id, land_type, area_sqm, user_note, saved_at')
    .order('saved_at', { ascending: false })

  return (
    <main className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">← Map</Link>
          <h1 className="text-sm font-semibold text-zinc-900">Saved parcels</h1>
        </div>
        <span className="text-xs text-zinc-400">{user.email}</span>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {error && (
          <p className="text-sm text-red-600 mb-4">Failed to load saved parcels.</p>
        )}

        {!error && parcels?.length === 0 && (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-sm">No saved parcels yet.</p>
            <Link href="/" className="mt-4 inline-block text-sm text-zinc-900 underline">
              Explore the map
            </Link>
          </div>
        )}

        {parcels && parcels.length > 0 && (
          <ul className="space-y-3">
            {parcels.map((p) => (
              <li key={p.id} className="bg-white rounded-lg border border-zinc-200 px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {TYPE_LABEL[p.land_type] ?? p.land_type}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {formatArea(p.area_sqm)} · saved {new Date(p.saved_at).toLocaleDateString('en-GB')}
                  </p>
                  {p.user_note && (
                    <p className="text-xs text-zinc-600 mt-1 italic">{p.user_note}</p>
                  )}
                </div>
                <RemoveParcelButton parcelId={p.parcel_id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
