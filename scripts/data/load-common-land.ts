/**
 * load-common-land.ts
 *
 * Downloads the Natural England Registered Common Land dataset via WFS
 * and loads it into the common_land table.
 *
 * Source: Natural England Open Data Geoportal
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

// Natural England WFS — CRoW Act 2000 Access Layer (Registered Common Land)
const WFS_URL =
  'https://environment.data.gov.uk/spatialdata/crow-act-2000-access-layer-open-access-land/wfs?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&typeNames=CROW_Act_2000_Access_Layer%3AOpen_Access_Land&SRSNAME=urn:ogc:def:crs:EPSG::4326&outputFormat=application/json'

const DATA_YEAR = new Date().getFullYear()
const BATCH_SIZE = 200
// England bounding box — filters out Welsh common land
const ENGLAND = { minLat: 49.8, maxLat: 55.8, minLng: -6.5, maxLng: 2.0 }

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
    process.exit(1)
  }
  return createClient(url, key)
}

function isInEngland(geometry: { type: string; coordinates: unknown }): boolean {
  // Simple centroid check using first coordinate of first ring
  try {
    if (geometry.type === 'MultiPolygon') {
      const coords = geometry.coordinates as number[][][][]
      const [lng, lat] = coords[0][0][0]
      return lat >= ENGLAND.minLat && lat <= ENGLAND.maxLat && lng >= ENGLAND.minLng && lng <= ENGLAND.maxLng
    }
    if (geometry.type === 'Polygon') {
      const coords = geometry.coordinates as number[][][]
      const [lng, lat] = coords[0][0]
      return lat >= ENGLAND.minLat && lat <= ENGLAND.maxLat && lng >= ENGLAND.minLng && lng <= ENGLAND.maxLng
    }
  } catch {
    return false
  }
  return false
}

async function main() {
  const supabase = getSupabaseClient()

  console.log('Downloading Natural England common land dataset...')
  const res = await fetch(WFS_URL, {
    headers: { 'User-Agent': 'LandGrabber/1.0 (richard.sutcliffe@gmail.com)' },
  })

  if (!res.ok) throw new Error(`WFS download failed: HTTP ${res.status}`)
  const geojson = await res.json()

  const features = geojson.features ?? []
  console.log(`Downloaded ${features.length} features`)

  // Filter to England only
  const englandFeatures = features.filter((f: { geometry: { type: string; coordinates: unknown } }) =>
    isInEngland(f.geometry)
  )
  console.log(`${englandFeatures.length} features within England extent`)

  // Clear existing data for this year
  await supabase.from('common_land').delete().eq('data_year', DATA_YEAR)

  let inserted = 0
  for (let i = 0; i < englandFeatures.length; i += BATCH_SIZE) {
    const batch = englandFeatures.slice(i, i + BATCH_SIZE)
    const rows = batch.map((f: { properties: Record<string, unknown>; geometry: object }) => ({
      commons_ref: f.properties.COMMONS_REFERENCE ?? f.properties.commons_ref ?? null,
      name: f.properties.NAME ?? f.properties.name ?? null,
      commons_act_registration: f.properties.REGISTRATION_STATUS ?? null,
      geometry: f.geometry,
      data_year: DATA_YEAR,
    }))

    const { error } = await supabase.from('common_land').insert(rows)
    if (error) throw new Error(`Insert batch failed: ${error.message}`)
    inserted += rows.length
    process.stdout.write(`\r  Inserted ${inserted}/${englandFeatures.length}...`)
  }

  console.log(`\n✓ Common land loaded: ${inserted} rows`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
