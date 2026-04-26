import type { Metadata } from 'next'
import InfoNav from '@/components/InfoNav'

export const metadata: Metadata = {
  title: 'Glossary — LandGrabber',
}

const terms = [
  {
    term: 'Adverse possession',
    definition:
      'A legal process by which a person who has openly occupied land continuously for 12 years (or 30 years for Crown land) without the owner\'s permission may apply to register the land in their name. Form ADV1 is used to apply to HM Land Registry.',
  },
  {
    term: 'Unregistered land',
    definition:
      'Land whose ownership has not been registered at HM Land Registry. The owner holds paper title deeds instead. Unregistered land is not the same as ownerless land — an unregistered owner exists but their identity is not publicly visible in HMLR records.',
  },
  {
    term: 'INSPIRE Index Polygons',
    definition:
      'A monthly dataset published by HM Land Registry showing the boundary of every registered freehold title in England and Wales. Gaps in this dataset may indicate unregistered land but are not definitive proof.',
  },
  {
    term: 'Common land',
    definition:
      'Land registered under the Commons Registration Act 1965 or Commons Act 2006. It is privately owned but the public has rights of access. Acquisition routes are very limited and require specialist legal advice.',
  },
  {
    term: 'Bona vacantia',
    definition:
      'Property that has no owner — for example, assets of a dissolved company or an estate where someone dies intestate with no traceable heirs. Such property passes to the Crown (or Duchy of Lancaster or Cornwall). It can sometimes be purchased from the Crown.',
  },
  {
    term: 'Village green',
    definition:
      'Land registered as a town or village green under the Commons Act 2006. The public has rights to indulge in lawful sports and pastimes. Registration as a village green prevents development.',
  },
  {
    term: 'HM Land Registry (HMLR)',
    definition:
      'The government body responsible for registering ownership of land and property in England and Wales. Registration of freehold land has been compulsory on sale since the 1990s but many older titles remain unregistered.',
  },
  {
    term: 'OGL v3',
    definition:
      'Open Government Licence version 3. The licence under which HMLR and Natural England publish the datasets used by this tool. You are free to use, share, and adapt the data as long as you acknowledge the source.',
  },
]

export default function GlossaryPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <InfoNav />
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-xl font-semibold text-zinc-900 mb-8">Glossary</h1>
        <dl className="space-y-6">
          {terms.map(({ term, definition }) => (
            <div key={term}>
              <dt className="text-sm font-semibold text-zinc-900">{term}</dt>
              <dd className="mt-1 text-sm text-zinc-600 leading-relaxed">{definition}</dd>
            </div>
          ))}
        </dl>
      </main>
    </div>
  )
}
