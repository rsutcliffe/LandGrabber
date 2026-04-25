/**
 * run-pipeline.ts
 *
 * Orchestrates the full INSPIRE data pipeline for a given region and month.
 * Runs steps sequentially; aborts on any failure.
 *
 * Usage:
 *   npx tsx scripts/data/run-pipeline.ts [--region yorkshire|all] [--data-month YYYY-MM-DD] [--skip-download]
 *
 * Steps:
 *   1. download-inspire   (skip with --skip-download if zips already present)
 *   2. convert-gml
 *   3. load-postgis
 *   4. compute-gaps
 *   5. update-refresh-log
 *   6. load-common-land   (runs separately; Natural England data is annual)
 */

import { execFileSync, ExecFileSyncOptions } from 'child_process'
import path from 'path'

const SCRIPTS_DIR = path.resolve('./scripts/data')
const TSX = 'npx'

function run(script: string, extraArgs: string[] = []) {
  const args = ['tsx', path.join(SCRIPTS_DIR, script), ...extraArgs]
  console.log(`\n▶ ${script} ${extraArgs.join(' ')}`)
  const opts: ExecFileSyncOptions = { stdio: 'inherit', env: process.env }
  execFileSync(TSX, args, opts)
}

async function main() {
  const args = process.argv.slice(2)
  const region = args.includes('--region') ? args[args.indexOf('--region') + 1] : 'yorkshire'
  const dataMonth = args.includes('--data-month') ? args[args.indexOf('--data-month') + 1] : undefined
  const skipDownload = args.includes('--skip-download')
  const commonOnly = args.includes('--common-only')

  const monthArgs = dataMonth ? ['--data-month', dataMonth] : []

  console.log('=== LandGrabber Data Pipeline ===')
  console.log(`Region: ${region}`)
  console.log(`Data month: ${dataMonth ?? '(current)'}`)

  if (commonOnly) {
    run('load-common-land.ts')
    run('update-refresh-log.ts', ['--layer', 'common_land', '--period', dataMonth ?? new Date().toISOString().slice(0, 7) + '-01', '--count', '0'])
    return
  }

  if (!skipDownload) {
    run('download-inspire.ts', ['--region', region])
  } else {
    console.log('\n⏭ Skipping download (--skip-download)')
  }

  run('convert-gml.ts')
  run('load-postgis.ts', monthArgs)
  run('compute-gaps.ts', ['--la-code', region === 'yorkshire' ? 'E07000167' : '', ...monthArgs].filter(Boolean))

  const period = dataMonth ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
  run('update-refresh-log.ts', ['--layer', 'registered_land', '--period', period, '--count', '0', '--notes', `Region: ${region}`])
  run('update-refresh-log.ts', ['--layer', 'unregistered_land', '--period', period, '--count', '0', '--notes', `Computed from ${region} registered_land`])

  console.log('\n=== Pipeline complete ===')
}

main().catch((err) => {
  console.error('\nPipeline failed:', err.message)
  process.exit(1)
})
