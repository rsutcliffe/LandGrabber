/**
 * @jest-environment node
 */
import { GET } from '@/app/api/guidance/[type]/route'
import { NextRequest } from 'next/server'

function makeRequest(type: string) {
  return new NextRequest(new URL(`http://localhost/api/guidance/${type}`))
}

describe('GET /api/guidance/[type]', () => {
  it('returns 200 with guidance content for unregistered', async () => {
    const res = await GET(makeRequest('unregistered'), { params: Promise.resolve({ type: 'unregistered' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.title).toBeDefined()
    expect(Array.isArray(body.sections)).toBe(true)
    expect(body.sections.length).toBeGreaterThan(0)
    expect(body.confidence_statement).toBeDefined()
    expect(body.last_reviewed).toBeDefined()
  })

  it('returns 200 with guidance content for common', async () => {
    const res = await GET(makeRequest('common'), { params: Promise.resolve({ type: 'common' }) })
    expect(res.status).toBe(200)
  })

  it('returns 200 with guidance content for village_green', async () => {
    const res = await GET(makeRequest('village_green'), { params: Promise.resolve({ type: 'village_green' }) })
    expect(res.status).toBe(200)
  })

  it('returns 200 with guidance content for bona_vacantia', async () => {
    const res = await GET(makeRequest('bona_vacantia'), { params: Promise.resolve({ type: 'bona_vacantia' }) })
    expect(res.status).toBe(200)
  })

  it('returns 404 for an unknown guidance type', async () => {
    const res = await GET(makeRequest('unknown_type'), { params: Promise.resolve({ type: 'unknown_type' }) })
    expect(res.status).toBe(404)
  })

  it('each section has heading and content fields', async () => {
    const res = await GET(makeRequest('unregistered'), { params: Promise.resolve({ type: 'unregistered' }) })
    const body = await res.json()
    body.sections.forEach((s: unknown) => {
      expect(s).toHaveProperty('heading')
      expect(s).toHaveProperty('content')
    })
  })
})
