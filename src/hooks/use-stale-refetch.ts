'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const ONE_MINUTE = 60 * 1000

export function useStaleRefetch(staleTimeMs = ONE_MINUTE) {
  const router = useRouter()
  const lastFetchedAt = useRef(Date.now())

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastFetchedAt.current < staleTimeMs) return
      lastFetchedAt.current = Date.now()
      router.refresh()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [router, staleTimeMs])
}
