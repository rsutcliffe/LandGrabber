import type { Metadata } from 'next'
import InfoNav from '@/components/InfoNav'

export const metadata: Metadata = {
  title: 'Legal Disclaimer — LandGrabber',
}

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <InfoNav />
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-6 text-sm text-zinc-700 leading-relaxed">
        <h1 className="text-xl font-semibold text-zinc-900">Legal Disclaimer</h1>

        <p>
          LandGrabber is provided for informational and educational purposes only. Nothing on this website
          constitutes legal advice. You should not act or refrain from acting based on anything you see here
          without first obtaining independent legal advice from a qualified solicitor.
        </p>

        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-900">Data accuracy</h2>
          <p>
            The land parcel data displayed is derived from open government datasets (HMLR INSPIRE Index Polygons
            and Natural England Common Land Register). These datasets are updated periodically and may not reflect
            the current state of land registration. A parcel shown as potentially unregistered may in fact be
            registered, may have been registered since the last data update, or may belong to a known owner
            with paper title deeds.
          </p>
          <p>
            LandGrabber makes no warranty, express or implied, as to the accuracy, completeness, or fitness for
            any purpose of the data displayed.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-900">No liability</h2>
          <p>
            To the fullest extent permitted by law, the operators of LandGrabber accept no liability for any loss
            or damage (including without limitation any direct, indirect, special, or consequential loss) arising
            from reliance on any information provided by this service, including but not limited to decisions made
            in connection with land acquisition or adverse possession claims.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-900">Third-party data licences</h2>
          <p>
            HMLR INSPIRE Index Polygons and Natural England common land data are licensed under the Open Government
            Licence v3.0. Contains HM Land Registry data © Crown copyright and database right 2025. Contains
            Natural England data © Natural England copyright. Contains Ordnance Survey data © Crown copyright and
            database right 2025.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-zinc-900">Governing law</h2>
          <p>
            This disclaimer is governed by the laws of England and Wales. Any disputes shall be subject to the
            exclusive jurisdiction of the courts of England and Wales.
          </p>
        </section>

        <p className="text-xs text-zinc-400">Last updated: April 2026</p>
      </main>
    </div>
  )
}
