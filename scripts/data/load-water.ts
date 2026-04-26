/**
 * load-water.ts
 *
 * Loads OS Open Rivers watercourse links into the water_links table.
 * These are buffered at query time (like road_links) to produce a water mask
 * that suppresses unregistered land parcels over rivers, canals, and streams.
 *
 * Data source:
 *   OS Open Rivers — free download from OS Data Hub:
 *     https://osdatahub.os.uk/downloads/open/OpenRivers
 *   Download the GeoPackage (GPKG) for Great Britain.
 *   Licence: Open Government Licence v3.0
 *
 * Inspect before loading:
 *   ogrinfo -al -so OpenRivers_GPKG/OS_Open_Rivers.gpkg
 *   Expected layer: WatercourseLink
 *   Expected fields: id, name1, form
 *   Form values: River, Canal, Tidal River, Non-Tidal Water Interlinking, Drain, etc.
 *
 * Convert to line-delimited GeoJSON (bbox filter for Yorkshire):
 *   ogr2ogr -f GeoJSON tmp/water_links.geojson \
 *     -spat -2.6 53.3 0.2 54.7 -spat_srs EPSG:4326 \
 *     OpenRivers_GPKG/OS_Open_Rivers.gpkg WatercourseLink
 *
 * Usage:
 *   npx tsx scripts/data/load-water.ts --input path/to/water_links.geojson
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const BATCH_SIZE = 500
const ENGLAND = { minLat: 49.8, maxLat: 55.8, minLng: -6.5, maxLng: 2.0 }

// Buffer widths in metres by watercourse form
const BUFFER_BY_FORM: Record<string, number> = {
  'River':                        15,
  'Tidal River':                  20,
  'Canal':                        10,
  'Non-Tidal Water Interlinking':  5,
  'Drain':                         4,
}
const DEFAULT_BUFFER_M = 5

interface GeoJsonFeature {
  type: 'Feature'
  geometry: { type: string; coordinates: unknown }
  properties: Record<string, unknown>
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

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 ? process.argv[idx + 1] : null
}

function isInEngland(geometry: GeoJsonFeature['geometry']): boolean {
  const coords: number[][] = []
  const collect = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') coords.push(c as number[])
    else if (Array.isArray(c)) c.forEach(collect)
  }
  collect(geometry.coordinates)
  if (coords.length === 0) return false
  const lngs = coords.map((c) => c[0])
  const lats = coords.map((c) => c[1])
  const centLng = (Math.min(...lngs) + Math.max(...lngs)) / 2
  const centLat = (Math.min(...lats) + Math.max(...lats)) / 2
  return (
    centLat >= ENGLAND.minLat && centLat <= ENGLAND.maxLat &&
    centLng >= ENGLAND.minLng && centLng <= ENGLAND.maxLng
  )
}

async function* streamFeatures(filePath: string): AsyncGenerator<GeoJsonFeature> {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  })
  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('{"type":"Feature"') && !trimmed.startsWith('{ "type": "Feature"')) continue
    const json = trimmed.endsWith(',') ? trimmed.slice(0, -1) : trimmed
    try {
      yield JSON.parse(json) as GeoJsonFeature
    } catch {
      // skip malformed lines
    }
  }
}

async function main() {
  const inputPath = getArg('--input') ? path.resolve(getArg('--input')!) : null

  if (!inputPath) {
    console.error('Error: --input <path> required.')
    console.error('')
    console.error('Download OS Open Rivers from:')
    console.error('  https://osdatahub.os.uk/downloads/open/OpenRivers')
    console.error('Convert with ogr2ogr and pass via --input.')
    process.exit(1)
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`)
    process.exit(1)
  }

  const supabase = getSupabaseClient()

  console.log(`Input: ${inputPath}`)
  console.log('Clearing existing water_links...')

  const { error: delErr } = await supabase.from('water_links').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (delErr) {
    console.error('Failed to clear existing rows:', delErr.message)
    process.exit(1)
  }

  let batch: object[] = []
  let totalInserted = 0
  let totalSkipped = 0
  let totalProcessed = 0

  const flush = async () => {
    if (batch.length === 0) return
    const { error } = await supabase.from('water_links').insert(batch)
    if (error) throw new Error(`Batch insert failed: ${error.message}`)
    totalInserted += batch.length
    batch = []
  }

  console.log('Loading features...')

  for await (const feature of streamFeatures(inputPath)) {
    totalProcessed++

    const geomType = feature.geometry?.type
    if (!geomType || !['LineString', 'MultiLineString'].includes(geomType)) {
      totalSkipped++
      continue
    }

    if (!isInEngland(feature.geometry)) {
      totalSkipped++
      continue
    }

    const p = feature.properties
    const form = String(p?.form ?? p?.FORM ?? p?.Form ?? '')
    const bufferM = BUFFER_BY_FORM[form] ?? DEFAULT_BUFFER_M

    batch.push({
      form:     form || null,
      name:     p?.name1 ?? p?.name ?? p?.NAME ?? null,
      geometry: feature.geometry,
      buffer_m: bufferM,
    })

    if (batch.length >= BATCH_SIZE) await flush()

    if (totalProcessed % 5000 === 0) {
      process.stdout.write(`  ${totalProcessed.toLocaleString()} processed, ${totalInserted.toLocaleString()} inserted...\r`)
    }
  }

  await flush()

  console.log(`\n✓ Done. ${totalProcessed.toLocaleString()} processed → ${totalInserted.toLocaleString()} inserted, ${totalSkipped.toLocaleString()} skipped`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
