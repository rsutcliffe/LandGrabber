/**
 * load-village-greens.ts
 *
 * Loads town and village green polygons from a GeoJSON file into the
 * village_green table.
 *
 * Data source:
 *   There is no national spatial dataset for registered town and village
 *   greens in England. Registration is maintained by individual county
 *   council commons registration authorities. Obtain spatial data from
 *   your county council under a data request or Freedom of Information
 *   request, convert to GeoJSON with ogr2ogr if needed, then pass via
 *   --input.
 *
 *   Some councils publish their register online. A community-maintained
 *   aggregation may exist at:
 *     https://commons.data.parliament.uk/
 *   Check availability before making individual council requests.
 *
 * Usage:
 *   npx tsx scripts/data/load-village-greens.ts --input path/to/village_greens.geojson [--data-year YYYY]
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
  geometry: {
    type: string
    coordinates: unknown
  }
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

function getDataYear(): number {
  const arg = getArg('--data-year')
  return arg ? parseInt(arg, 10) : new Date().getFullYear()
}

function isInEngland(geometry: GeoJsonFeature['geometry']): boolean {
  const coords: number[][] = []
  const collect = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      coords.push(c as number[])
    } else if (Array.isArray(c)) {
      c.forEach(collect)
    }
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
  if (geometry.type === 'Polygon') {
    return { type: 'MultiPolygon', coordinates: [geometry.coordinates] }
  }
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
  const dataYear = getDataYear()

  if (!inputPath) {
    console.error('Error: --input <path> required.')
    console.error('')
    console.error('No national spatial dataset for village greens exists.')
    console.error('Obtain GeoJSON from your county council commons registration authority.')
    console.error('Then pass via --input.')
    process.exit(1)
  }

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`)
    process.exit(1)
  }

  const supabase = getSupabaseClient()

  console.log(`Input: ${inputPath}`)
  console.log(`data_year: ${dataYear}`)
  console.log('Clearing existing rows for this year...')

  const { error: delErr } = await supabase
    .from('village_green')
    .delete()
    .eq('data_year', dataYear)
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
    const { error } = await supabase.from('village_green').insert(batch)
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

    batch.push({
      registration_ref:
        feature.properties?.registration_ref ??
        feature.properties?.REG_REF ??
        feature.properties?.ref ??
        feature.properties?.id ??
        null,
      name:
        feature.properties?.name ??
        feature.properties?.NAME ??
        feature.properties?.description ??
        null,
      geometry: toMultiPolygon(feature.geometry),
      data_year: dataYear,
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
