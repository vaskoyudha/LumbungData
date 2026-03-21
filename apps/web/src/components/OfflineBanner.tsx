'use client'

import { useOnlineStatus } from '@/src/hooks/useOnlineStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 text-yellow-900 px-4 py-3 shadow-md">
      <div className="flex items-center justify-center min-h-[48px]">
        <span className="font-medium text-center">Tidak ada koneksi internet</span>
      </div>
    </div>
  )
}
