'use client'

import dynamic from 'next/dynamic'
import { useRef, useState, useCallback } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import Link from 'next/link'
import SearchBar from './SearchBar'
import ParcelPanel from './ParcelPanel'
import MapErrorBoundary from './MapErrorBoundary'
import AuthNav from './AuthNav'
import type { SelectedParcel } from './MapView'

const MapView = dynamic(() => import('./MapView'), { ssr: false })

export default function MapPage() {
  const mapRef = useRef<MapRef>(null)
  const [selectedParcel, setSelectedParcel] = useState<SelectedParcel | null>(null)

  const handleSearchSelect = useCallback((lat: number, lng: number) => {
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 1200 })
    setSelectedParcel(null)
  }, [])

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <MapErrorBoundary>
        <MapView ref={mapRef} onParcelSelect={setSelectedParcel} />
      </MapErrorBoundary>

      <div className="absolute top-4 left-4 z-10">
        <SearchBar onSelect={handleSearchSelect} />
      </div>

      <div className="absolute top-4 right-4 z-10">
        <AuthNav />
      </div>

      <ParcelPanel parcel={selectedParcel} onClose={() => setSelectedParcel(null)} />

      <nav className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-4 py-1.5 text-xs text-zinc-500 shadow pointer-events-auto">
        <Link href="/about" className="hover:text-zinc-900">About</Link>
        <span aria-hidden>·</span>
        <Link href="/glossary" className="hover:text-zinc-900">Glossary</Link>
        <span aria-hidden>·</span>
        <Link href="/legal" className="hover:text-zinc-900">Legal</Link>
      </nav>
    </div>
  )
}
