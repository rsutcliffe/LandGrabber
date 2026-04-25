/**
 * update-refresh-log.ts
 *
 * Records a completed pipeline run in data_refresh_log.
 * Called by run-pipeline.ts after each layer is successfully loaded.
 *
 * Usage:
 *   npx tsx scripts/data/update-refresh-log.ts --layer registered_land --count 45000 --period 2025-04-01
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

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

async function logRefresh(layer: string, period: string, count: number, notes?: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('data_refresh_log').insert({
    layer_name: layer,
    data_period: period,
    record_count: count,
    notes: notes ?? null,
  })
  if (error) throw new Error(`Failed to log refresh: ${error.message}`)
}

async function main() {
  const layer = getArg('--layer')
  const period = getArg('--period')
  const count = parseInt(getArg('--count') ?? '0', 10)
  const notes = getArg('--notes') ?? undefined

  if (!layer || !period) {
    console.error('Usage: update-refresh-log.ts --layer <name> --period <YYYY-MM-DD> --count <n> [--notes <text>]')
    process.exit(1)
  }

  await logRefresh(layer, period, count, notes)
  console.log(`✓ Logged: ${layer} refreshed for ${period} (${count} records)`)
}

export { logRefresh }

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
