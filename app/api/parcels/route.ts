import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { BoundingBoxError, parseBoundingBoxFromSearchParams } from '@/lib/validation/bounding-box'

const VALID_TYPES = ['unregistered', 'common', 'registered'] as const

export async function GET(request: NextRequest) {
  let bbox
  try {
    bbox = parseBoundingBoxFromSearchParams(request.nextUrl.searchParams)
  } catch (err) {
    if (err instanceof BoundingBoxError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    throw err
  }

  const typesParam = request.nextUrl.searchParams.get('types')
  const types = typesParam
    ? typesParam.split(',').filter((t) => VALID_TYPES.includes(t as never))
    : ['unregistered', 'common']

  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('get_parcels_in_view', {
    p_min_lat: bbox.min_lat,
    p_min_lng: bbox.min_lng,
    p_max_lat: bbox.max_lat,
    p_max_lng: bbox.max_lng,
    p_types: types,
  })

  if (error) {
    console.error('[/api/parcels] Supabase error:', error.message)
    return NextResponse.json({ error: 'Data service unavailable' }, { status: 503 })
  }

  const features = (data ?? []).map(
    (row: { id: string; land_type: string; area_sqm: number; confidence: string; data_month: string; geometry: object }) => ({
      type: 'Feature',
      id: row.id,
      geometry: row.geometry,
      properties: {
        id: row.id,
        land_type: row.land_type,
        area_sqm: row.area_sqm,
        confidence: row.confidence,
        data_month: row.data_month,
      },
    })
  )

  return NextResponse.json({ type: 'FeatureCollection', features })
}
