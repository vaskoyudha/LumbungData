'use client'

import { useState, useEffect } from 'react'

export interface StorageQuotaState {
  usage: number
  quota: number
  percentage: number
  isLow: boolean
  loading: boolean
}

export function useStorageQuota(threshold = 80): StorageQuotaState {
  const [state, setState] = useState<StorageQuotaState>({
    usage: 0,
    quota: 0,
    percentage: 0,
    isLow: false,
    loading: true,
  })

  useEffect(() => {
    let cancelled = false

    async function checkQuota() {
      try {
        const { getStorageEstimate, isStorageLow } = await import('@repo/db')
        const estimate = await getStorageEstimate()
        const low = await isStorageLow(threshold)
        if (!cancelled) {
          setState({ ...estimate, isLow: low, loading: false })
        }
      } catch {
        if (!cancelled) {
          setState(prev => ({ ...prev, loading: false }))
        }
      }
    }

    void checkQuota()
    const interval = setInterval(() => { void checkQuota() }, 60_000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [threshold])

  return state
}
