'use client'

import { useEffect, useState } from 'react'
import type { SelectedParcel } from './MapView'

function formatArea(sqm: number): string {
  if (sqm >= 10000) return `${(sqm / 10000).toFixed(2)} ha`
  return `${Math.round(sqm).toLocaleString()} m²`
}

const TYPE_LABEL: Record<string, string> = {
  unregistered: 'No registered title',
  common: 'Registered common land',
  bona_vacantia: 'Crown ownerless property',
  village_green: 'Town or village green',
}

const TYPE_TOOLTIP: Record<string, string> = {
  unregistered: 'Land with no registered title at HMLR — it may be unregistered but is not guaranteed to be acquirable. Always seek independent legal advice.',
  common: 'Land registered under the Commons Registration Act. Public access rights apply but the land is owned.',
  bona_vacantia: 'Land passed to the Crown because the previous owner died without heirs or a company was dissolved. Must be purchased at market value from the BVD.',
  village_green: 'Land registered as a town or village green under the Commons Registration Act. Local inhabitants have the right to use it for lawful sports and pastimes. The land cannot be developed.',
}

const TYPE_BADGE: Record<string, string> = {
  unregistered: 'bg-green-100 text-green-800',
  common: 'bg-blue-100 text-blue-800',
  bona_vacantia: 'bg-amber-100 text-amber-800',
  village_green: 'bg-purple-100 text-purple-800',
}

const TYPE_SOURCE: Record<string, string> = {
  unregistered: 'HMLR INSPIRE Index Polygons',
  common: 'Natural England CRoW Act register',
  bona_vacantia: 'BVD / Government Legal Department',
  village_green: 'County council commons registration authorities',
}

interface ParcelPanelProps {
  parcel: SelectedParcel | null
  onClose: () => void
}

function useSaveState(parcelId: string, landType: string, areaSqm: number) {
  const [saved, setSaved] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSaved(null)
    fetch(`/api/parcel/${parcelId}`)
      .then((r) => r.json())
      .then((d) => setSaved(d.saved ?? false))
      .catch(() => setSaved(false))
  }, [parcelId])

  async function toggle() {
    if (saved === null || saving) return
    setSaving(true)
    try {
      const method = saved ? 'DELETE' : 'POST'
      const body = saved ? undefined : JSON.stringify({ land_type: landType, area_sqm: areaSqm })
      const res = await fetch(`/api/parcel/${parcelId}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body,
      })
      if (res.ok) setSaved(!saved)
    } finally {
      setSaving(false)
    }
  }

  return { saved, saving, toggle }
}

export default function ParcelPanel({ parcel, onClose }: ParcelPanelProps) {
  const { saved, saving, toggle } = useSaveState(
    parcel?.id ?? '',
    parcel?.properties.land_type ?? '',
    parcel?.properties.area_sqm ?? 0
  )

  if (!parcel) return null

  const { properties } = parcel
  const { land_type, area_sqm, confidence, data_month } = properties

  const dataMonthLabel = new Date(data_month).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <aside
      aria-label="Land parcel details"
      className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-xl flex flex-col z-10"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
        <h2 className="text-sm font-semibold text-zinc-900">Land Parcel</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="p-1 rounded hover:bg-zinc-100 text-zinc-500"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <span
          className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium cursor-help ${TYPE_BADGE[land_type] ?? 'bg-zinc-100 text-zinc-700'}`}
          title={TYPE_TOOLTIP[land_type]}
        >
          {TYPE_LABEL[land_type] ?? land_type}
        </span>

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-zinc-500">Area</dt>
            <dd className="font-medium text-zinc-900">{formatArea(area_sqm)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Data source</dt>
            <dd className="font-medium text-zinc-900">{TYPE_SOURCE[land_type] ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Data month</dt>
            <dd className="font-medium text-zinc-900">{dataMonthLabel}</dd>
          </div>
          {confidence && (
            <div>
              <dt className="text-zinc-500">Confidence</dt>
              <dd className="font-medium text-zinc-900 capitalize">{confidence}</dd>
            </div>
          )}
        </dl>

        {land_type === 'unregistered' && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 leading-relaxed">
            Land not appearing in HMLR records may be unregistered but is not guaranteed to be acquirable. Always seek independent legal advice before proceeding.
          </div>
        )}

        {land_type === 'common' && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 leading-relaxed">
            Registered common land has public access rights but is owned. Acquisition routes are limited — seek specialist advice.
          </div>
        )}

        {land_type === 'bona_vacantia' && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 leading-relaxed">
            Bona vacantia land is Crown property and must be purchased at market value from the Bona Vacantia Division. It is not freely acquirable. Seek specialist legal advice.
          </div>
        )}

        {land_type === 'village_green' && (
          <div className="rounded-lg bg-purple-50 border border-purple-200 p-3 text-xs text-purple-800 leading-relaxed">
            Registered town and village greens are protected from development. Local inhabitants have the right to use them for lawful sports and pastimes. Acquisition is not possible — registration does not transfer ownership.
          </div>
        )}

        <button
          type="button"
          onClick={toggle}
          disabled={saved === null || saving}
          className={`w-full py-2 text-sm rounded border transition-colors disabled:opacity-40 ${
            saved
              ? 'border-zinc-300 text-zinc-600 hover:border-red-300 hover:text-red-600'
              : 'border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-700'
          }`}
        >
          {saved === null ? 'Loading…' : saving ? '…' : saved ? 'Saved — click to remove' : 'Save parcel'}
        </button>
      </div>
    </aside>
  )
}
