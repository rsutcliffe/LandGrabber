/**
 * compute-gaps.ts
 *
 * Calls a Supabase SQL function to compute unregistered land polygons by
 * subtracting registered_land from the England boundary (ST_Difference).
 *
 * Prerequisite: england_boundary table must be pre-loaded.
 * See scripts/data/load-england-boundary.ts.
 *
 * The computation is heavy — for PoC, run against Yorkshire only.
 * For national run, this may need to be chunked by region.
 *
 * Usage:
 *   npx tsx scripts/data/compute-gaps.ts [--data-month YYYY-MM-DD] [--la-code E07000167]
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

function getDataMonth(): string {
  const arg = process.argv.includes('--data-month')
    ? process.argv[process.argv.indexOf('--data-month') + 1]
    : null
  if (arg) return arg
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

async function main() {
  const supabase = getSupabaseClient()
  const dataMonth = getDataMonth()
  const laCode = process.argv.includes('--la-code')
    ? process.argv[process.argv.indexOf('--la-code') + 1]
    : null

  console.log('Computing unregistered land gaps via ST_Difference...')
  if (laCode) console.log(`  Filtering to LA: ${laCode}`)
  console.log(`  data_month: ${dataMonth}`)
  console.warn('  Note: this query is computationally intensive. May take several minutes.')

  // Clear existing unregistered_land for this data month
  const { error: deleteError } = await supabase
    .from('unregistered_land')
    .delete()
    .eq('data_month', dataMonth)

  if (deleteError) {
    console.error('Failed to clear existing rows:', deleteError.message)
    process.exit(1)
  }

  // Run gap computation via Supabase SQL (uses service role key — bypasses RLS)
  const sql = laCode
    ? `
      INSERT INTO unregistered_land (geometry, data_month, confidence)
      SELECT
        ST_MakeValid(ST_Difference(eb.geometry, ST_Union(rl.geometry))) AS geometry,
        '${dataMonth}'::date AS data_month,
        'medium' AS confidence
      FROM england_boundary AS eb
      CROSS JOIN (
        SELECT geometry FROM registered_land
        WHERE local_authority_code = '${laCode}'
        AND data_month = '${dataMonth}'
      ) rl
      WHERE ST_Intersects(eb.geometry, rl.geometry)
      GROUP BY eb.geometry
      HAVING ST_Area(ST_Difference(eb.geometry, ST_Union(rl.geometry))) > 1;
    `
    : `
      INSERT INTO unregistered_land (geometry, data_month, confidence)
      SELECT
        ST_MakeValid(ST_Difference(eb.geometry, ST_Union(rl.geometry))) AS geometry,
        '${dataMonth}'::date AS data_month,
        'medium' AS confidence
      FROM england_boundary AS eb
      CROSS JOIN registered_land rl
      WHERE ST_Intersects(eb.geometry, rl.geometry)
      AND rl.data_month = '${dataMonth}'
      GROUP BY eb.geometry
      HAVING ST_Area(ST_Difference(eb.geometry, ST_Union(rl.geometry))) > 1;
    `

  const { error } = await supabase.rpc('exec_sql', { query: sql })

  if (error) {
    // exec_sql RPC may not exist — fall back to note for manual execution
    console.error('RPC exec_sql failed (may not be deployed).')
    console.error('Run the following SQL manually in Supabase SQL Editor:')
    console.error(sql)
    process.exit(1)
  }

  console.log('✓ Gap computation complete')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
