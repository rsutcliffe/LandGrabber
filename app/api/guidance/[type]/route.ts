import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

const VALID_TYPES = ['unregistered', 'common', 'village_green', 'bona_vacantia'] as const
type GuidanceType = typeof VALID_TYPES[number]

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params

  if (!VALID_TYPES.includes(type as GuidanceType)) {
    return NextResponse.json({ error: `Unknown guidance type: ${type}` }, { status: 404 })
  }

  try {
    const filePath = path.join(process.cwd(), 'content', 'guidance', `${type}.json`)
    const raw = await readFile(filePath, 'utf-8')
    const content = JSON.parse(raw)
    return NextResponse.json(content)
  } catch {
    return NextResponse.json({ error: 'Guidance content unavailable' }, { status: 500 })
  }
}
