/**
 * @jest-environment node
 */
import { GET } from '@/app/api/geocode/route'
import { NextRequest } from 'next/server'

global.fetch = jest.fn()

beforeEach(() => jest.clearAllMocks())

function makeRequest(q: string) {
  const url = new URL('http://localhost/api/geocode')
  url.searchParams.set('q', q)
  return new NextRequest(url)
}

const englandResult = {
  display_name: 'Leeds, West Yorkshire, England',
  lat: '53.7997',
  lon: '-1.5492',
  boundingbox: ['53.7', '53.9', '-1.7', '-1.4'],
}

const outsideEnglandResult = {
  display_name: 'Edinburgh, Scotland',
  lat: '55.9533',
  lon: '-3.1883',
  boundingbox: ['55.8', '56.1', '-3.4', '-2.9'],
}

describe('GET /api/geocode', () => {
  it('returns 400 when q param is missing', async () => {
    const url = new URL('http://localhost/api/geocode')
    const res = await GET(new NextRequest(url))
    expect(res.status).toBe(400)
  })

  it('returns 400 when q param is empty', async () => {
    const res = await GET(makeRequest(''))
    expect(res.status).toBe(400)
  })

  it('returns results for a valid England location', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [englandResult],
    })

    const res = await GET(makeRequest('Leeds'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].display_name).toContain('Leeds')
  })

  it('filters out results outside England', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [englandResult, outsideEnglandResult],
    })

    const res = await GET(makeRequest('city'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].display_name).toContain('Leeds')
  })

  it('returns empty array when all results are outside England', async () => {
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [outsideEnglandResult],
    })

    const res = await GET(makeRequest('Edinburgh'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(0)
  })

  it('returns 502 when Nominatim is unreachable', async () => {
    ;(fetch as jest.Mock).mockRejectedValue(new Error('network error'))

    const res = await GET(makeRequest('Leeds'))
    expect(res.status).toBe(502)
  })
})
