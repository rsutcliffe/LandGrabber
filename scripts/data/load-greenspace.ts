/**
 * load-greenspace.ts
 *
 * Loads OS Open Greenspace polygons into the greenspace_sites table.
 * These are used as a mask in get_parcels_in_view to suppress false-positive
 * unregistered land parcels that are actually parks, playing fields,
 * cemeteries, allotments, golf courses, etc.
 *
 * Data source:
 *   OS Open Greenspace — free download from OS Data Hub:
 *     https://osdatahub.os.uk/downloads/open/OpenGreenspace
 *   Download the GeoPackage (GPKG) for Great Britain.
 *   Licence: Open Government Licence v3.0
 *
 * Inspect before loading:
 *   ogrinfo -al -so opgrsp_gb.gpkg
 *   Layer: greenspace_site
 *   Fields: id, function, distinctive_name_1, distinctive_name_2, ...
 *   SRS: EPSG:27700 (BNG) — must reproject to 4326 via ogr2ogr
 *
 * Convert to GeoJSON (Yorkshire bbox; remove -spat for full GB):
 *   ogr2ogr -f GeoJSON tmp/greenspace.geojson \
 *     -t_srs EPSG:4326 \
 *     -spat -2.6 53.3 0.2 54.7 -spat_srs EPSG:4326 \
 *     tmp/greenspace/Data/opgrsp_gb.gpkg greenspace_site
 *
 * Usage:
 *   npx tsx scripts/data/load-greenspace.ts --input path/to/greenspace.geojson
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const BATCH_SIZE = 200
const ENGLAND = { minLat: 49.8, maxLat: 55.8, minLng: -6.5, maxLng: 2.0 }

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

function toMultiPolygon(geometry: GeoJsonFeature['geometry']): object {
  if (geometry.type === 'MultiPolygon') return geometry
  if (geometry.type === 'Polygon') return { type: 'MultiPolygon', coordinates: [geometry.coordinates] }
  throw new Error(`Unsupported geometry type: ${geometry.type}`)
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
    console.error('Download OS Open Greenspace from:')
    console.error('  https://osdatahub.os.uk/downloads/open/OpenGreenspace')
    console.error('Then convert with ogr2ogr and pass via --input.')
    process.exit(1)
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`)
    process.exit(1)
  }

  const supabase = getSupabaseClient()

  console.log(`Input: ${inputPath}`)
  console.log('Clearing existing greenspace_sites...')

  const { error: delErr } = await supabase.from('greenspace_sites').delete().neq('id', '00000000-0000-0000-0000-000000000000')
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
    const { error } = await supabase.from('greenspace_sites').insert(batch)
    if (error) throw new Error(`Batch insert failed: ${error.message}`)
    totalInserted += batch.length
    batch = []
  }

  console.log('Loading features...')

  for await (const feature of streamFeatures(inputPath)) {
    totalProcessed++

    if (!feature.geometry || !['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) {
      totalSkipped++
      continue
    }

    if (!isInEngland(feature.geometry)) {
      totalSkipped++
      continue
    }

    const p = feature.properties
    batch.push({
      os_id:    p?.id     ?? p?.ID     ?? null,
      function: p?.function ?? p?.FUNCTION ?? p?.func ?? null,
      name:     p?.distinctive_name_1 ?? p?.distName1 ?? p?.name ?? p?.NAME ?? null,
      geometry: toMultiPolygon(feature.geometry),
    })

    if (batch.length >= BATCH_SIZE) await flush()

    if (totalProcessed % 1000 === 0) {
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
