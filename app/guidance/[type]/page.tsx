import { readFile } from 'fs/promises'
import path from 'path'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import InfoNav from '@/components/InfoNav'

const VALID_TYPES = ['unregistered', 'common', 'village_green', 'bona_vacantia'] as const
type GuidanceType = typeof VALID_TYPES[number]

interface GuidanceSection {
  heading: string
  content: string
}

interface GuidanceData {
  title: string
  last_reviewed: string
  sections: GuidanceSection[]
  confidence_statement: string
}

async function loadGuidance(type: GuidanceType): Promise<GuidanceData> {
  const filePath = path.join(process.cwd(), 'content', 'guidance', `${type}.json`)
  const raw = await readFile(filePath, 'utf-8')
  return JSON.parse(raw) as GuidanceData
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params
  if (!VALID_TYPES.includes(type as GuidanceType)) return {}
  const guidance = await loadGuidance(type as GuidanceType)
  return { title: `${guidance.title} — LandGrabber` }
}

export default async function GuidancePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params

  if (!VALID_TYPES.includes(type as GuidanceType)) notFound()

  const guidance = await loadGuidance(type as GuidanceType)
  const lastReviewed = new Date(guidance.last_reviewed).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-zinc-50">
      <InfoNav />
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{guidance.title}</h1>
          <p className="text-xs text-zinc-400 mt-1">Last reviewed {lastReviewed}</p>
        </div>

        <div className="space-y-8">
          {guidance.sections.map((section) => (
            <section key={section.heading} className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-900">{section.heading}</h2>
              <div className="space-y-3 text-sm text-zinc-700 leading-relaxed">
                {section.content.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="rounded-lg bg-zinc-100 px-4 py-3 text-xs text-zinc-600 leading-relaxed">
          <span className="font-medium">Confidence: </span>{guidance.confidence_statement}
        </div>

        <p className="text-xs text-zinc-400">
          This guidance is for educational purposes only and does not constitute legal advice.
          Always seek independent legal advice before taking action.
        </p>
      </main>
    </div>
  )
}
