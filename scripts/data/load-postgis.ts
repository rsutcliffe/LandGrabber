/**
 * load-postgis.ts
 *
 * Reads GeoJSON files produced by convert-gml.ts and bulk-inserts
 * features into the registered_land table in Supabase PostGIS.
 *
 * - Deletes existing rows for the same data_month before inserting (idempotent)
 * - Batches inserts at 500 records per request
 * - Derives local_authority_code from filename prefix
 *
 * Usage:
 *   npx tsx scripts/data/load-postgis.ts [--data-month YYYY-MM-DD]
 *
 * Input: ./tmp/inspire/geojson/*.geojson
 */

import fs from 'fs'
import path from 'path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const GEOJSON_DIR = path.resolve('./tmp/inspire/geojson')
const BATCH_SIZE = 500

interface GeoJsonFeature {
  type: 'Feature'
  id?: string | number
  geometry: object
  properties: Record<string, unknown>
}

interface GeoJsonCollection {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
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

async function loadGeojsonFile(
  supabase: ReturnType<typeof createClient>,
  geojsonPath: string,
  dataMonth: string
): Promise<number> {
  const baseName = path.basename(geojsonPath, '.geojson')
  const laCode = baseName.split('_')[0]

  const raw = fs.readFileSync(geojsonPath, 'utf-8')
  const collection: GeoJsonCollection = JSON.parse(raw)
  const features = collection.features ?? []

  if (features.length === 0) {
    console.log(`  ⏭ No features in ${baseName}`)
    return 0
  }

  // Delete existing rows for this LA and data month (idempotent re-run)
  const { error: deleteError } = await supabase
    .from('registered_land')
    .delete()
    .eq('local_authority_code', laCode)
    .eq('data_month', dataMonth)

  if (deleteError) throw new Error(`Delete failed for ${laCode}: ${deleteError.message}`)

  let inserted = 0
  for (let i = 0; i < features.length; i += BATCH_SIZE) {
    const batch = features.slice(i, i + BATCH_SIZE)
    const rows = batch
      .filter((f) => f.geometry && f.properties?.INSPIREID)
      .map((f) => ({
        inspire_id: Number(f.properties.INSPIREID),
        local_authority_code: laCode,
        geometry: `SRID=4326;${JSON.stringify(f.geometry)}`,
        data_month: dataMonth,
      }))

    if (rows.length === 0) continue

    const { error } = await supabase.from('registered_land').insert(rows)
    if (error) throw new Error(`Insert batch failed for ${laCode}: ${error.message}`)
    inserted += rows.length
  }

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
