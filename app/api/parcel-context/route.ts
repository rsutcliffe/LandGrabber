import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const lng = parseFloat(searchParams.get('lng') ?? '')
  const lat = parseFloat(searchParams.get('lat') ?? '')

  if (isNaN(lng) || isNaN(lat)) {
    return NextResponse.json({ error: 'lng and lat required' }, { status: 400 })
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase.rpc('get_parcel_context', {
    p_lng: lng,
    p_lat: lat,
  })

  if (error) {
    console.error('[/api/parcel-context] Supabase error:', error.message)
    return NextResponse.json({ error: 'Context unavailable' }, { status: 503 })
  }

  return NextResponse.json(data)
}
