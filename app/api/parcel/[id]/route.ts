import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

// GET /api/parcel/[id] — check if parcel is saved by current user
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ saved: false })

  const { data } = await supabase
    .from('saved_parcels')
    .select('id')
    .eq('parcel_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({ saved: !!data })
}

// POST /api/parcel/[id] — save parcel
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const body = await request.json()
  const { land_type, area_sqm } = body as { land_type: string; area_sqm: number }

  const { error } = await supabase.from('saved_parcels').upsert({
    parcel_id: id,
    user_id: user.id,
    land_type,
    area_sqm,
  }, { onConflict: 'user_id,parcel_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ saved: true })
}

// DELETE /api/parcel/[id] — unsave parcel
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { error } = await supabase
    .from('saved_parcels')
    .delete()
    .eq('parcel_id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ saved: false })
}
