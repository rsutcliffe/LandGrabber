/**
 * @jest-environment node
 */
import { GET } from '@/app/api/parcels/route'
import { NextRequest } from 'next/server'

// Supabase client is mocked so tests run without a real DB
jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}))

import { createServerClient } from '@/lib/supabase/server'

const mockRpc = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(createServerClient as jest.Mock).mockReturnValue({
    rpc: mockRpc,
  })
})

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/parcels')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url)
}

const validParams = {
  min_lat: '53.79',
  min_lng: '-1.56',
  max_lat: '53.81',
  max_lng: '-1.54',
}

describe('GET /api/parcels', () => {
  it('returns 400 when bounding box params are missing', async () => {
    const req = makeRequest({})
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when bounding box is outside England', async () => {
    const req = makeRequest({ ...validParams, min_lat: '45.0' })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when bounding box area is too large', async () => {
    const req = makeRequest({ min_lat: '51.0', min_lng: '-1.0', max_lat: '52.5', max_lng: '0.5' })
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 GeoJSON FeatureCollection for a valid viewport', async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          id: 'abc123',
          land_type: 'unregistered',
          area_sqm: 500,
          confidence: 'medium',
          data_month: '2025-01-01',
          geometry: { type: 'MultiPolygon', coordinates: [] },
        },
      ],
      error: null,
    })

    const req = makeRequest(validParams)
    const res = await GET(req)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.type).toBe('FeatureCollection')
    expect(body.features).toHaveLength(1)
    expect(body.features[0].properties.land_type).toBe('unregistered')
  })

  it('returns empty FeatureCollection when no parcels in viewport', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const req = makeRequest(validParams)
    const res = await GET(req)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.features).toHaveLength(0)
  })

  it('returns 503 when Supabase returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB unavailable' } })

    const req = makeRequest(validParams)
    const res = await GET(req)
    expect(res.status).toBe(503)
  })

  it('filters by types param when provided', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null })

    const req = makeRequest({ ...validParams, types: 'common' })
    await GET(req)

    expect(mockRpc).toHaveBeenCalledWith(
      'get_parcels_in_view',
      expect.objectContaining({ p_types: ['common'] })
    )
  })
})
