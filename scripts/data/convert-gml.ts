/**
 * convert-gml.ts
 *
 * Unzips INSPIRE GML files and converts them from GML (EPSG:27700 British
 * National Grid) to GeoJSON (EPSG:4326 WGS84) using ogr2ogr.
 *
 * Prerequisites: GDAL must be installed (brew install gdal)
 *
 * Usage:
 *   npx tsx scripts/data/convert-gml.ts
 *
 * Input:  ./tmp/inspire/zips/*.zip
 * Output: ./tmp/inspire/geojson/*.geojson
 */

import fs from 'fs'
import path from 'path'
import { execSync, execFileSync } from 'child_process'
import { createWriteStream } from 'fs'
import { Extract } from 'unzipper'

const ZIPS_DIR = path.resolve('./tmp/inspire/zips')
const EXTRACT_DIR = path.resolve('./tmp/inspire/gml')
const GEOJSON_DIR = path.resolve('./tmp/inspire/geojson')

function checkOgr2ogr() {
  try {
    execSync('which ogr2ogr', { stdio: 'pipe' })
  } catch {
    console.error('Error: ogr2ogr not found. Install GDAL: brew install gdal')
    process.exit(1)
  }
}

async function unzip(zipPath: string, outDir: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const extracted: string[] = []
    fs.createReadStream(zipPath)
      .pipe(Extract({ path: outDir }))
      .on('entry', (entry) => {
        if (entry.path.endsWith('.gml')) extracted.push(path.join(outDir, entry.path))
      })
      .on('finish', () => resolve(extracted))
      .on('error', reject)
  })
}

function convertGmlToGeojson(gmlPath: string, geojsonPath: string) {
  execFileSync('ogr2ogr', [
    '-f', 'GeoJSON',
    '-s_srs', 'EPSG:27700',
    '-t_srs', 'EPSG:4326',
    '-makevalid',           // fix invalid geometries before conversion
    geojsonPath,
    gmlPath,
  ], { stdio: 'pipe' })
}

async function main() {
  checkOgr2ogr()

  const zipFiles = fs.readdirSync(ZIPS_DIR).filter((f) => f.endsWith('.zip'))
  if (zipFiles.length === 0) {
    console.error(`No zip files found in ${ZIPS_DIR}. Run download-inspire.ts first.`)
    process.exit(1)
  }

  fs.mkdirSync(EXTRACT_DIR, { recursive: true })
  fs.mkdirSync(GEOJSON_DIR, { recursive: true })

  const errors: string[] = []

  for (const zipFile of zipFiles) {
    const zipPath = path.join(ZIPS_DIR, zipFile)
    const baseName = zipFile.replace('.zip', '')
    const laExtractDir = path.join(EXTRACT_DIR, baseName)
    const geojsonPath = path.join(GEOJSON_DIR, `${baseName}.geojson`)

    if (fs.existsSync(geojsonPath)) {
      console.log(`  ⏭ Already converted: ${baseName}`)
      continue
    }

    process.stdout.write(`Converting ${baseName}... `)
    try {
      fs.mkdirSync(laExtractDir, { recursive: true })
      const gmlFiles = await unzip(zipPath, laExtractDir)

      if (gmlFiles.length === 0) {
        throw new Error('No .gml file found in zip')
      }

      convertGmlToGeojson(gmlFiles[0], geojsonPath)
      console.log('✓')
    } catch (err) {
      console.log('✗')
      console.error(`  ${(err as Error).message}`)
      errors.push(baseName)
    }
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} conversion(s) failed:`)
    errors.forEach((e) => console.error(`  - ${e}`))
    process.exit(1)
  }

  console.log(`\nAll conversions complete → ${GEOJSON_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
