import { NextRequest, NextResponse } from 'next/server'

// England bounding box for filtering results
const ENGLAND = { minLat: 49.8, maxLat: 55.8, minLng: -6.5, maxLng: 2.0 }

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = process.env.NOMINATIM_USER_AGENT ?? 'LandGrabber/1.0'

function isInEngland(lat: number, lng: number): boolean {
  return (
    lat >= ENGLAND.minLat &&
    lat <= ENGLAND.maxLat &&
    lng >= ENGLAND.minLng &&
    lng <= ENGLAND.maxLng
  )
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim()
  if (!q) {
    return NextResponse.json({ error: 'q parameter is required' }, { status: 400 })
  }

  const nominatimUrl = new URL(NOMINATIM_BASE)
  nominatimUrl.searchParams.set('q', q)
  nominatimUrl.searchParams.set('format', 'json')
  nominatimUrl.searchParams.set('addressdetails', '1')
  nominatimUrl.searchParams.set('limit', '5')
  nominatimUrl.searchParams.set('countrycodes', 'gb')

  try {
    const response = await fetch(nominatimUrl.toString(), {
      headers: { 'User-Agent': USER_AGENT },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Geocoding service error' }, { status: 502 })
    }

    const results: Array<{ display_name: string; lat: string; lon: string; boundingbox: string[] }> =
      await response.json()

    const filtered = results.filter((r) =>
      isInEngland(parseFloat(r.lat), parseFloat(r.lon))
    )

    return NextResponse.json(filtered)
  } catch {
    return NextResponse.json({ error: 'Geocoding service unreachable' }, { status: 502 })
  }
}
