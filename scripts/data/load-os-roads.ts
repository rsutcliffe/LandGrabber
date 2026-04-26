/**
 * load-os-roads.ts
 *
 * Reads OS Open Roads RoadLink GeoJSON and inserts buffered road-surface
 * polygons into the road_surfaces table via road_surfaces_batch_insert RPC.
 *
 * Prerequisites:
 *   - Migration 008 + 009 applied
 *   - OS Open Roads GeoPackage downloaded from https://osdatahub.os.uk/downloads/open/OpenRoads
 *   - Convert to GeoJSON first:
 *       ogr2ogr -f GeoJSON -t_srs EPSG:4326 \
 *         tmp/roads/road_links.geojson \
 *         oproad_essh_gb.gpkg RoadLink
 *
 * Usage:
 *   npx tsx scripts/data/load-os-roads.ts [--input path/to/road_links.geojson]
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const DEFAULT_INPUT = path.resolve('./tmp/roads/road_links.geojson')
const BATCH_SIZE = 200

interface RoadFeature {
  type: 'Feature'
  geometry: object
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

function getInputPath(): string {
  const idx = process.argv.indexOf('--input')
  return idx !== -1 ? path.resolve(process.argv[idx + 1]) : DEFAULT_INPUT
}

async function* streamFeatures(filePath: string): AsyncGenerator<RoadFeature> {
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  })
  for await (const line of rl) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('{"type":"Feature"') && !trimmed.startsWith('{ "type": "Feature"')) continue
    const json = trimmed.endsWith(',') ? trimmed.slice(0, -1) : trimmed
    try {
      yield JSON.parse(json) as RoadFeature
    } catch {
      // skip malformed lines
    }
  }
}

async function main() {
  const supabase = getSupabaseClient()
  const inputPath = getInputPath()

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`)
    console.error('Convert OS Open Roads GeoPackage first:')
    console.error('  ogr2ogr -f GeoJSON -t_srs EPSG:4326 tmp/roads/road_links.geojson oproad_essh_gb.gpkg RoadLink')
    process.exit(1)
  }

  console.log(`Input: ${inputPath}`)
  console.log('Truncating road_surfaces...')

  const { error: truncErr } = await supabase.rpc('road_surfaces_truncate' as never)
  if (truncErr) {
    // fall back to delete all (truncate RPC may not exist)
    const { error: delErr } = await supabase.from('road_surfaces').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (delErr) {
      console.error('Failed to clear road_surfaces:', delErr.message)
      process.exit(1)
    }
  }

  let batch: object[] = []
  let totalInserted = 0
  let totalProcessed = 0

  const flush = async () => {
    if (batch.length === 0) return
    const { data, error } = await supabase.rpc('road_surfaces_batch_insert', {
      p_features: batch,
    } as never)
    if (error) throw new Error(`Batch insert failed: ${error.message}`)
    totalInserted += data as number
    batch = []
  }

  console.log('Loading features...')

  for await (const feature of streamFeatures(inputPath)) {
    if (!feature.geometry) continue

    batch.push({
      geometry: JSON.stringify(feature.geometry),
      roadClassification: feature.properties?.roadClassification ?? null,
      fictitious: feature.properties?.fictitious ?? false,
    })

    totalProcessed++
    if (batch.length >= BATCH_SIZE) await flush()
    if (totalProcessed % 10000 === 0) {
      process.stdout.write(`  Processed ${totalProcessed.toLocaleString()} features, inserted ${totalInserted.toLocaleString()} surfaces...\r`)
    }
  }

  await flush()

  console.log(`\n✓ Done. Processed ${totalProcessed.toLocaleString()} links → ${totalInserted.toLocaleString()} road surfaces inserted`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
