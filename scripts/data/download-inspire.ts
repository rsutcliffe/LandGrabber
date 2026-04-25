/**
 * download-inspire.ts
 *
 * Downloads INSPIRE Index Polygon GML zip files from HM Land Registry
 * for the specified local authorities and saves them to ./tmp/inspire/zips/
 *
 * Prerequisites:
 *   1. Register at https://use-land-property-data.service.gov.uk
 *   2. Agree to INSPIRE licence and note your API key
 *   3. Set HMLR_API_KEY in .env.local
 *
 * Usage:
 *   npx tsx scripts/data/download-inspire.ts [--region yorkshire|all]
 *
 * Licence: Open Government Licence v3.0
 * Attribution: "Information sourced from HM Land Registry © Crown copyright.
 *               OS data © Crown copyright and database right [year]."
 */

import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { config } from 'dotenv'
import { YORKSHIRE_LAS, ALL_LAS, LaEntry } from './inspire-la-codes'

config({ path: '.env.local' })

const BASE_URL = 'https://use-land-property-data.service.gov.uk/datasets/inspire/download'
const OUT_DIR = path.resolve('./tmp/inspire/zips')
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5_000

function getApiKey(): string {
  const key = process.env.HMLR_API_KEY
  if (!key) {
    console.error('Error: HMLR_API_KEY not set in .env.local')
    console.error('Register at: https://use-land-property-data.service.gov.uk')
    process.exit(1)
  }
  return key
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function downloadFile(url: string, dest: string, attempt = 1): Promise<void> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'LandGrabber/1.0 (richard.sutcliffe@gmail.com)' },
      redirect: 'follow',
    })

    if (res.status === 401 || res.status === 403) {
      throw new Error(`Authentication failed (${res.status}) — check HMLR_API_KEY is valid`)
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`)
    }

    if (!res.body) throw new Error('Empty response body')

    await pipeline(Readable.fromWeb(res.body as never), fs.createWriteStream(dest))
  } catch (err) {
    const msg = (err as Error).message
    if (msg.includes('Authentication failed')) throw err
    if (attempt < MAX_RETRIES) {
      console.warn(`  ⚠ Attempt ${attempt} failed — retrying in ${RETRY_DELAY_MS / 1000}s`)
      await sleep(RETRY_DELAY_MS)
      return downloadFile(url, dest, attempt + 1)
    }
    throw new Error(`Failed after ${MAX_RETRIES} attempts: ${msg}`)
  }
}

async function main() {
  const apiKey = getApiKey()
  const region = process.argv.includes('--region')
    ? process.argv[process.argv.indexOf('--region') + 1]
    : 'yorkshire'

  const las: LaEntry[] = region === 'all' ? ALL_LAS : YORKSHIRE_LAS

  console.log(`Downloading INSPIRE data for ${las.length} LAs (${region})`)
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const errors: string[] = []

  for (const la of las) {
    const url = `${BASE_URL}/${la.hmlrFile}?key=${encodeURIComponent(apiKey)}`
    const dest = path.join(OUT_DIR, `${la.code}_${la.name.replace(/\s+/g, '_')}.zip`)

    if (fs.existsSync(dest)) {
      console.log(`  ⏭ Already downloaded: ${la.name}`)
      continue
    }

    process.stdout.write(`Downloading ${la.name} (${la.code})... `)
    try {
      await downloadFile(url, dest)
      console.log('✓')
    } catch (err) {
      console.log('✗')
      console.error(`  ${(err as Error).message}`)
      errors.push(`${la.name} (${la.code})`)
    }
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} download(s) failed:`)
    errors.forEach((e) => console.error(`  - ${e}`))
    process.exit(1)
  }

  console.log(`\nAll downloads complete → ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
