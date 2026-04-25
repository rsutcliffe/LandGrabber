/**
 * load-postgis.ts
 *
 * Reads GeoJSON files produced by convert-gml.ts and bulk-inserts
 * features into the registered_land table in Supabase PostGIS via
 * the inspire_batch_insert RPC (migration 004).
 *
 * Streams each file to handle large GeoJSON files (e.g. North Yorkshire ~600 MB)
 * without hitting Node.js string/buffer limits.
 *
 * Usage:
 *   npx tsx scripts/data/load-postgis.ts [--data-month YYYY-MM-DD]
 *
 * Input: ./tmp/inspire/geojson/*.geojson
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const GEOJSON_DIR = path.resolve('./tmp/inspire/geojson')
const BATCH_SIZE = 100  // smaller batches — each feature geometry can be 10s of KB

interface GeoJsonFeature {
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

function getDataMonth(): string {
  const arg = process.argv.includes('--data-month')
    ? process.argv[process.argv.indexOf('--data-month') + 1]
    : null
  if (arg) return arg
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

// ogr2ogr GeoJSON output has one feature per line inside the features array.
// Readline avoids loading multi-hundred-MB files into a single string.
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

async function loadGeojsonFile(
  supabase: ReturnType<typeof createClient>,
  geojsonPath: string,
  dataMonth: string
): Promise<number> {
  const baseName = path.basename(geojsonPath, '.geojson')
  const laCode = baseName.split('_')[0]

  // Delete existing rows for this LA + data month (idempotent re-run)
  const { error: deleteError } = await supabase
    .from('registered_land')
    .delete()
    .eq('local_authority_code', laCode)
    .eq('data_month', dataMonth)

  if (deleteError) throw new Error(`Delete failed for ${laCode}: ${deleteError.message}`)

  let inserted = 0
  let batch: { inspire_id: number; geometry: object }[] = []

  const flush = async () => {
    if (batch.length === 0) return
    const { data, error } = await supabase.rpc('inspire_batch_insert', {
      p_la_code: laCode,
      p_data_month: dataMonth,
      p_features: batch,
    })
    if (error) throw new Error(`Batch insert failed for ${laCode}: ${error.message}`)
    inserted += data as number
    batch = []
  }

  for await (const feature of streamFeatures(geojsonPath)) {
    if (!feature.geometry || !feature.properties?.INSPIREID) continue
    batch.push({
      inspire_id: Number(feature.properties.INSPIREID),
      geometry: feature.geometry,
    })
    if (batch.length >= BATCH_SIZE) await flush()
  }

  await flush()
  return inserted
}

async function main() {
  const supabase = getSupabaseClient()
  const dataMonth = getDataMonth()

  const geojsonFiles = fs.readdirSync(GEOJSON_DIR).filter((f) => f.endsWith('.geojson'))
  if (geojsonFiles.length === 0) {
    console.error(`No GeoJSON files in ${GEOJSON_DIR}. Run convert-gml.ts first.`)
    process.exit(1)
  }

  console.log(`Loading ${geojsonFiles.length} GeoJSON file(s) for data_month=${dataMonth}`)

  let totalInserted = 0
  const errors: string[] = []

  for (const file of geojsonFiles) {
    const filePath = path.join(GEOJSON_DIR, file)
    process.stdout.write(`  Loading ${file}... `)
    try {
      const count = await loadGeojsonFile(supabase, filePath, dataMonth)
      console.log(`✓ (${count} rows)`)
      totalInserted += count
    } catch (err) {
      console.log('✗')
      console.error(`  ${(err as Error).message}`)
      errors.push(file)
    }
  }

  console.log(`\nTotal inserted: ${totalInserted} rows`)

  if (errors.length > 0) {
    console.error(`${errors.length} file(s) failed:`)
    errors.forEach((e) => console.error(`  - ${e}`))
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
