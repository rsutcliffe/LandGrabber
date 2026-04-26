'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function RemoveParcelButton({ parcelId }: { parcelId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRemove() {
    setLoading(true)
    await fetch(`/api/parcel/${parcelId}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={loading}
      className="text-xs text-zinc-400 hover:text-red-500 disabled:opacity-40 shrink-0"
      aria-label="Remove saved parcel"
    >
      {loading ? '…' : 'Remove'}
    </button>
  )
}
