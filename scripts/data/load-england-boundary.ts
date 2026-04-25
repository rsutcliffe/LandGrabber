/**
 * load-england-boundary.ts
 *
 * Downloads the England boundary polygon from ONS Open Geography Portal
 * and loads it into the england_boundary table.
 *
 * Source: ONS Geoportal — Regions (December 2023) Boundaries EN BUC
 * The England boundary is derived by dissolving all English regions.
 *
 * Usage:
 *   npx tsx scripts/data/load-england-boundary.ts
 *
 * This only needs to be run once.
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'

config({ path: '.env.local' })

// ONS Open Geography Portal — England boundary (generalised, BUC = ultra-clipped)
// Update URL if ONS release a newer version
const BOUNDARY_URL =
  'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/Countries_December_2023_Boundaries_UK_BUC/FeatureServer/0/query?where=CTRY23NM%3D%27England%27&outFields=*&f=geojson'

const TMP_PATH = path.resolve('./tmp/england_boundary.geojson')

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
    process.exit(1)
  }
  return createClient(url, key)
}

async function main() {
  const supabase = getSupabaseClient()

  // Check if already loaded
  const { count } = await supabase
    .from('england_boundary')
    .select('*', { count: 'exact', head: true })

  if ((count ?? 0) > 0) {
    console.log('England boundary already loaded. Skipping.')
    return
  }

  console.log('Downloading England boundary from ONS...')
  fs.mkdirSync('./tmp', { recursive: true })

  const res = await fetch(BOUNDARY_URL)
  if (!res.ok) throw new Error(`Failed to download boundary: HTTP ${res.status}`)
  const geojson = await res.json()
  fs.writeFileSync(TMP_PATH, JSON.stringify(geojson))
  console.log('✓ Downloaded')

  const features = geojson.features ?? []
  if (features.length === 0) throw new Error('No features in boundary GeoJSON')

  // Reproject from WGS84 (already 4326 from ONS) — validate geometry
  const reprojPath = path.resolve('./tmp/england_boundary_valid.geojson')
  execFileSync('ogr2ogr', [
    '-f', 'GeoJSON',
    '-makevalid',
    reprojPath,
    TMP_PATH,
  ], { stdio: 'pipe' })

  const validGeojson = JSON.parse(fs.readFileSync(reprojPath, 'utf-8'))
  const geometry = validGeojson.features[0]?.geometry
  if (!geometry) throw new Error('Could not extract geometry from boundary')

  const { error } = await supabase.from('england_boundary').insert({ geometry })
  if (error) throw new Error(`Insert failed: ${error.message}`)

  console.log('✓ England boundary loaded into PostGIS')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
