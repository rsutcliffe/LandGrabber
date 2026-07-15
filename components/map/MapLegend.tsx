import { PARCEL_TYPES } from '@/lib/parcelTypes'

export default function MapLegend() {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow px-3 py-2.5 pointer-events-auto">
      <p className="text-xs font-semibold text-zinc-700 mb-2">Land types</p>
      <ul className="space-y-1.5">
        {(Object.entries(PARCEL_TYPES) as [string, typeof PARCEL_TYPES[keyof typeof PARCEL_TYPES]][]).map(([, t]) => (
          <li key={t.label} className="flex items-center gap-2">
            <span
              className="flex-shrink-0 w-3 h-3 rounded-sm border"
              style={{ backgroundColor: t.fill, borderColor: t.outline, opacity: t.fillOpacity + 0.3 }}
            />
            <span className="text-xs text-zinc-600">{t.label}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-zinc-400 mt-2">Click any parcel for details.</p>
    </div>
  )
}
