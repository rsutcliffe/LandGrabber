'use client'

import dynamic from 'next/dynamic'
import { useRef, useState, useCallback } from 'react'
import type { MapRef } from 'react-map-gl/maplibre'
import SearchBar from './SearchBar'
import ParcelPanel from './ParcelPanel'
import MapErrorBoundary from './MapErrorBoundary'
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

      <ParcelPanel parcel={selectedParcel} onClose={() => setSelectedParcel(null)} />
    </div>
  )
}
