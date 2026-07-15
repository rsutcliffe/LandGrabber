'use client'

interface WelcomeOverlayProps {
  onDismiss: () => void
}

const BULLETS = [
  { color: '#16a34a', label: 'Green — land with no registered title (potentially acquirable via adverse possession)' },
  { color: '#2563eb', label: 'Blue — registered common land (public access; not privately acquirable)' },
  { color: '#d97706', label: 'Amber — Crown ownerless property (purchasable from the Bona Vacantia Division)' },
  { color: '#7c3aed', label: 'Purple — registered town or village green (community-protected)' },
]

export default function WelcomeOverlay({ onDismiss }: WelcomeOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        <h2 className="text-base font-semibold text-zinc-900 mb-1">Find potentially acquirable land in England</h2>
        <p className="text-sm text-zinc-500 mb-5">
          Search for a location to see unregistered and other land types overlaid on the map. Click any parcel for details and guidance on how to pursue it.
        </p>

        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">What the colours mean</h3>
        <ul className="space-y-2 mb-6">
          {BULLETS.map((b) => (
            <li key={b.color} className="flex items-start gap-2.5">
              <span
                className="mt-0.5 flex-shrink-0 w-3 h-3 rounded-sm"
                style={{ backgroundColor: b.color, opacity: 0.8 }}
              />
              <span className="text-xs text-zinc-600 leading-relaxed">{b.label}</span>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            Search for a location to begin
          </button>
        </div>
        <p className="text-xs text-zinc-400 text-center mt-3">
          England only · Data from HMLR, Natural England · Not legal advice
        </p>
      </div>
    </div>
  )
}
