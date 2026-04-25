/**
 * load-common-land.ts
 *
 * Downloads the Natural England CRoW Act 2000 Access Layer (common land)
 * via ArcGIS FeatureServer and loads it into the common_land table.
 *
 * Source: Natural England / ArcGIS Online
 * 42,057 features, paginated at 2,000 per request.
 *
 * Licence: Open Government Licence v3.0
 * Attribution: "© Natural England copyright. Contains Ordnance Survey data
 *               © Crown copyright and database right [year]."
 *
 * Usage:
 *   npx tsx scripts/data/load-common-land.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const ARCGIS_BASE =
  'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/CRoW_Act_2000_Access_Layer/FeatureServer/0/query'
const PAGE_SIZE = 2000
const DATA_YEAR = new Date().getFullYear()
const SUPABASE_BATCH = 200

// England bounding box — filters out Welsh features
const ENGLAND = { minLat: 49.8, maxLat: 55.8, minLng: -6.5, maxLng: 2.0 }

interface ArcGisFeature {
  type: 'Feature'
  geometry: { type: string; coordinates: unknown }
  properties: {
    OBJECTID: number
    Descrip: string | null
    OC: string | null   // Old County code
    RCL: string | null  // Register of Common Land ref
    S16: string | null
    Map_Area: number | null
  }
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
    process.exit(1)
  }
  return createClient(url, key)
}

function toMultiPolygon(geometry: { type: string; coordinates: unknown }) {
  if (geometry.type === 'MultiPolygon') return geometry
  if (geometry.type === 'Polygon') {
    return { type: 'MultiPolygon', coordinates: [geometry.coordinates] }
  }
  return geometry
}

function isInEngland(geometry: { type: string; coordinates: unknown }): boolean {
  try {
    let lng: number, lat: number
    if (geometry.type === 'MultiPolygon') {
      ;[lng, lat] = (geometry.coordinates as number[][][][])[0][0][0]
    } else if (geometry.type === 'Polygon') {
      ;[lng, lat] = (geometry.coordinates as number[][][])[0][0]
    } else {
      return false
    }
    return lat >= ENGLAND.minLat && lat <= ENGLAND.maxLat && lng >= ENGLAND.minLng && lng <= ENGLAND.maxLng
  } catch {
    return false
  }
}

async function fetchPage(offset: number): Promise<ArcGisFeature[]> {
  const url = new URL(ARCGIS_BASE)
  url.searchParams.set('where', '1=1')
  url.searchParams.set('outFields', '*')
  url.searchParams.set('f', 'geojson')
  url.searchParams.set('resultRecordCount', String(PAGE_SIZE))
  url.searchParams.set('resultOffset', String(offset))

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'LandGrabber/1.0 (richard.sutcliffe@gmail.com)' },
  })

  if (!res.ok) throw new Error(`ArcGIS request failed: HTTP ${res.status} (offset=${offset})`)
  const body = await res.json()
  return body.features ?? []
}

async function main() {
  const supabase = getSupabaseClient()

  // Clear existing data for this year before inserting
  const { error: deleteError } = await supabase
    .from('common_land')
    .delete()
    .eq('data_year', DATA_YEAR)
  if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`)

  console.log('Downloading Natural England common land dataset (ArcGIS)...')

  let totalFetched = 0
  let totalInserted = 0
  let offset = 0

  while (true) {
    const features = await fetchPage(offset)
    if (features.length === 0) break

    totalFetched += features.length
    process.stdout.write(`\r  Fetched ${totalFetched} features...`)

    const englandFeatures = features.filter((f) => isInEngland(f.geometry))

    for (let i = 0; i < englandFeatures.length; i += SUPABASE_BATCH) {
      const batch = englandFeatures.slice(i, i + SUPABASE_BATCH)
      const rows = batch.map((f) => ({
        commons_ref: f.properties.RCL ?? f.properties.OC ?? null,
        name: f.properties.Descrip ?? null,
        commons_act_registration: f.properties.S16 ?? null,
        geometry: toMultiPolygon(f.geometry),
        data_year: DATA_YEAR,
      }))

      const { error } = await supabase.from('common_land').insert(rows)
      if (error) throw new Error(`Insert failed at offset ${offset}: ${error.message}`)
      totalInserted += rows.length
    }

    offset += PAGE_SIZE
    if (features.length < PAGE_SIZE) break
  }

  console.log(`\n✓ Common land loaded: ${totalInserted} England rows from ${totalFetched} total features`)
}

main().catch((err) => {
  console.error('\nError:', err.message)
  process.exit(1)
})
