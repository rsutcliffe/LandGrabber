'use client'

import { forwardRef, useRef, useState, useCallback } from 'react'
import Map, {
  Source,
  Layer,
  type MapRef,
  type MapLayerMouseEvent,
} from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'

const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty'
const MIN_ZOOM = 13
const MAX_BBOX = 0.06
const ENGLAND = { minLat: 49.8, maxLat: 55.8, minLng: -6.5, maxLng: 2.0 }

export interface SelectedParcel {
  id: string
  properties: {
    id: string
    land_type: 'unregistered' | 'common' | 'bona_vacantia' | 'village_green'
    area_sqm: number
    confidence: string | null
    data_month: string
  }
  lngLat: { lng: number; lat: number }
}

export interface SummaryParcel {
  areaSqm: number
  center: [number, number] // [lng, lat]
}

interface GeoJsonCollection {
  type: 'FeatureCollection'
  features: unknown[]
}

interface GeoJsonFeatureRaw {
  properties: { land_type: string; area_sqm: number; confidence: string }
  geometry: { coordinates: unknown }
}

function getBboxCenter(geometry: { coordinates: unknown }): [number, number] | null {
  const coords: number[][] = []
  const collect = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') coords.push(c as number[])
    else if (Array.isArray(c)) c.forEach(collect)
  }
  collect(geometry.coordinates)
  if (!coords.length) return null
  const lngs = coords.map((c) => c[0])
  const lats = coords.map((c) => c[1])
  return [
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
    (Math.min(...lats) + Math.max(...lats)) / 2,
  ]
}

interface MapViewProps {
  onParcelSelect: (parcel: SelectedParcel | null) => void
  onParcelsLoaded?: (highConfidence: SummaryParcel[]) => void
}

const EMPTY_COLLECTION: GeoJsonCollection = { type: 'FeatureCollection', features: [] }

const MapView = forwardRef<MapRef, MapViewProps>(function MapView({ onParcelSelect, onParcelsLoaded }, ref) {
  const fetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [geoJson, setGeoJson] = useState<GeoJsonCollection>(EMPTY_COLLECTION)
  const [belowMinZoom, setBelowMinZoom] = useState(true)
  const [cursor, setCursor] = useState('grab')
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)

  const fetchParcels = useCallback(async (mapRef: React.RefObject<MapRef | null>) => {
    const map = mapRef.current
    if (!map) return

    const zoom = map.getZoom()
    if (zoom < MIN_ZOOM) {
      setGeoJson(EMPTY_COLLECTION)
      setBelowMinZoom(true)
      return
    }
    setBelowMinZoom(false)

    const center = map.getCenter()
    if (
      center.lat < ENGLAND.minLat || center.lat > ENGLAND.maxLat ||
      center.lng < ENGLAND.minLng || center.lng > ENGLAND.maxLng
    ) return

    const half = MAX_BBOX / 2
    const params = new URLSearchParams({
      min_lat: String(Math.max(ENGLAND.minLat, center.lat - half)),
      min_lng: String(Math.max(ENGLAND.minLng, center.lng - half)),
      max_lat: String(Math.min(ENGLAND.maxLat, center.lat + half)),
      max_lng: String(Math.min(ENGLAND.maxLng, center.lng + half)),
    })

    setLoading(true)
    try {
      const res = await fetch(`/api/parcels?${params}`)
      if (res.ok) {
        const data = await res.json()
        setGeoJson(data)
        setFetchError(false)
        if (onParcelsLoaded) {
          const high: SummaryParcel[] = (data.features as GeoJsonFeatureRaw[] ?? [])
            .filter((f) => f.properties.land_type === 'unregistered' && f.properties.confidence === 'high')
            .map((f) => ({ areaSqm: f.properties.area_sqm, center: getBboxCenter(f.geometry) ?? [0, 0] }))
            .sort((a, b) => b.areaSqm - a.areaSqm)
          onParcelsLoaded(high)
        }
      } else {
        setFetchError(true)
      }
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // forwardRef gives us the external ref; we need the internal map instance too.
  // react-map-gl accepts a ref directly on Map; we pass the forwarded ref through.
  const internalRef = useRef<MapRef | null>(null)
  const setRefs = useCallback(
    (instance: MapRef | null) => {
      internalRef.current = instance
      if (typeof ref === 'function') ref(instance)
      else if (ref) (ref as React.MutableRefObject<MapRef | null>).current = instance
    },
    [ref]
  )

  const scheduleFetch = useCallback(() => {
    if (fetchTimer.current) clearTimeout(fetchTimer.current)
    fetchTimer.current = setTimeout(() => fetchParcels(internalRef), 600)
  }, [fetchParcels])

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0]
      if (feature) {
        onParcelSelect({
          id: String(feature.id ?? feature.properties?.id ?? ''),
          properties: feature.properties as SelectedParcel['properties'],
          lngLat: e.lngLat,
        })
      } else {
        onParcelSelect(null)
      }
    },
    [onParcelSelect]
  )

  return (
    <div className="absolute inset-0">
      <Map
        ref={setRefs}
        initialViewState={{ longitude: -1.549, latitude: 53.8, zoom: 10 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE}
        interactiveLayerIds={['unregistered-fill', 'common-fill', 'bona-vacantia-fill', 'village-green-fill']}
        cursor={cursor}
        onClick={handleClick}
        onLoad={scheduleFetch}
        onMoveEnd={scheduleFetch}
        onMouseEnter={() => setCursor('pointer')}
        onMouseLeave={() => setCursor('grab')}
      >
        <Source id="parcels" type="geojson" data={geoJson as never}>
          <Layer
            id="unregistered-fill"
            type="fill"
            filter={['==', ['get', 'land_type'], 'unregistered']}
            paint={{ 'fill-color': '#16a34a', 'fill-opacity': 0.35 }}
          />
          <Layer
            id="unregistered-outline"
            type="line"
            filter={['==', ['get', 'land_type'], 'unregistered']}
            paint={{ 'line-color': '#15803d', 'line-width': 1 }}
          />
          <Layer
            id="common-fill"
            type="fill"
            filter={['==', ['get', 'land_type'], 'common']}
            paint={{ 'fill-color': '#2563eb', 'fill-opacity': 0.4 }}
          />
          <Layer
            id="common-outline"
            type="line"
            filter={['==', ['get', 'land_type'], 'common']}
            paint={{ 'line-color': '#1d4ed8', 'line-width': 1 }}
          />
          <Layer
            id="bona-vacantia-fill"
            type="fill"
            filter={['==', ['get', 'land_type'], 'bona_vacantia']}
            paint={{ 'fill-color': '#d97706', 'fill-opacity': 0.4 }}
          />
          <Layer
            id="bona-vacantia-outline"
            type="line"
            filter={['==', ['get', 'land_type'], 'bona_vacantia']}
            paint={{ 'line-color': '#b45309', 'line-width': 1 }}
          />
          <Layer
            id="village-green-fill"
            type="fill"
            filter={['==', ['get', 'land_type'], 'village_green']}
            paint={{ 'fill-color': '#7c3aed', 'fill-opacity': 0.4 }}
          />
          <Layer
            id="village-green-outline"
            type="line"
            filter={['==', ['get', 'land_type'], 'village_green']}
            paint={{ 'line-color': '#6d28d9', 'line-width': 1 }}
          />
        </Source>
      </Map>

      {belowMinZoom && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-zinc-600 shadow pointer-events-none select-none">
          Zoom in to see land parcels
        </div>
      )}

      {loading && !belowMinZoom && (
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-zinc-600 shadow flex items-center gap-1.5 pointer-events-none select-none">
          <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          Loading parcels…
        </div>
      )}

      {fetchError && (
        <div role="alert" className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700 shadow pointer-events-none select-none">
          Could not load parcel data — check your connection and zoom in again.
        </div>
      )}
    </div>
  )
})

export default MapView
