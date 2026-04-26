'use client'

import type { SummaryParcel } from './MapView'

function formatArea(sqm: number): string {
  if (sqm >= 10000) return `${(sqm / 10000).toFixed(2)} ha`
  return `${Math.round(sqm).toLocaleString()} m²`
}

interface AreaSummaryProps {
  parcels: SummaryParcel[]
  onDismiss: () => void
  onFlyTo: (center: [number, number]) => void
}

export default function AreaSummary({ parcels, onDismiss, onFlyTo }: AreaSummaryProps) {
  if (parcels.length === 0) return null

  return (
    <div
      role="region"
      aria-label="High-confidence areas near search"
      className="w-80 bg-white rounded-lg shadow-md border border-zinc-200 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-100 bg-zinc-50">
        <div>
          <p className="text-xs font-semibold text-zinc-900">
            {parcels.length} high-confidence area{parcels.length !== 1 ? 's' : ''} nearby
          </p>
          <p className="text-xs text-zinc-500">Unregistered land ≥ 1 ha</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss summary"
          className="p-1 rounded hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <ul className="divide-y divide-zinc-100 max-h-64 overflow-y-auto">
        {parcels.map((p, i) => (
          <li key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-50">
            <div>
              <p className="text-sm font-medium text-zinc-900">{formatArea(p.areaSqm)}</p>
              <p className="text-xs text-zinc-500">High confidence · Unregistered</p>
            </div>
            <button
              type="button"
              onClick={() => onFlyTo(p.center)}
              className="ml-3 flex-shrink-0 text-xs px-2.5 py-1 rounded border border-zinc-300 text-zinc-600 hover:border-zinc-500 hover:text-zinc-900 transition-colors"
            >
              View
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
