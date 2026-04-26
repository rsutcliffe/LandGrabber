import type { Metadata } from 'next'
import InfoNav from '@/components/InfoNav'

export const metadata: Metadata = {
  title: 'About — LandGrabber',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <InfoNav />
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        <h1 className="text-xl font-semibold text-zinc-900">About LandGrabber</h1>

        <section className="space-y-3 text-sm text-zinc-700 leading-relaxed">
          <h2 className="font-semibold text-zinc-900">What it is</h2>
          <p>
            LandGrabber is a map tool for exploring potentially acquirable land in England. It overlays open
            government geospatial data on a base map so you can identify land that may be unregistered, common land,
            or otherwise in unusual ownership.
          </p>
          <p>
            It is a personal proof-of-concept built for educational purposes. It does not constitute legal advice and
            makes no guarantees about the accuracy or completeness of the data shown.
          </p>
        </section>

        <section className="space-y-3 text-sm text-zinc-700 leading-relaxed">
          <h2 className="font-semibold text-zinc-900">Data sources</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>HMLR INSPIRE Index Polygons</strong> — polygons of all registered freehold titles in England
              and Wales, published monthly by HM Land Registry under OGL v3. Gaps in this dataset may indicate
              unregistered land.
            </li>
            <li>
              <strong>Natural England Common Land Register</strong> — polygons of land registered under the Commons
              Registration Act 1965 and Commons Act 2006.
            </li>
          </ul>
        </section>

        <section className="space-y-3 text-sm text-zinc-700 leading-relaxed">
          <h2 className="font-semibold text-zinc-900">What it does not do</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Confirm that any parcel is genuinely ownerless or claimable.</li>
            <li>Replace a solicitor, a land registry search, or independent legal advice.</li>
            <li>Cover Wales, Scotland, or Northern Ireland.</li>
            <li>Reflect real-time data — datasets are updated periodically.</li>
          </ul>
        </section>

        <section className="space-y-3 text-sm text-zinc-700 leading-relaxed">
          <h2 className="font-semibold text-zinc-900">Open source</h2>
          <p>
            Source code is available on GitHub. The INSPIRE and common land datasets are open government data
            licensed under the Open Government Licence v3.
          </p>
        </section>
      </main>
    </div>
  )
}
