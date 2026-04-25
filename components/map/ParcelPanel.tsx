'use client'

import type { SelectedParcel } from './MapView'

function formatArea(sqm: number): string {
  if (sqm >= 10000) return `${(sqm / 10000).toFixed(2)} ha`
  return `${Math.round(sqm).toLocaleString()} m²`
}

const TYPE_LABEL: Record<string, string> = {
  unregistered: 'Potentially unregistered land',
  common: 'Registered common land',
}

const TYPE_BADGE: Record<string, string> = {
  unregistered: 'bg-green-100 text-green-800',
  common: 'bg-blue-100 text-blue-800',
}

const TYPE_SOURCE: Record<string, string> = {
  unregistered: 'HMLR INSPIRE Index Polygons',
  common: 'Natural England CRoW Act register',
}

interface ParcelPanelProps {
  parcel: SelectedParcel | null
  onClose: () => void
}

export default function ParcelPanel({ parcel, onClose }: ParcelPanelProps) {
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
        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_BADGE[land_type] ?? 'bg-zinc-100 text-zinc-700'}`}>
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
      </div>
    </aside>
  )
}
