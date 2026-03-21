'use client'

import { useState, useEffect } from 'react'

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true)

  useEffect(() => {
    // Initialize with current navigator.onLine status (safe SSR)
    if (typeof window !== 'undefined') {
      setIsOnline(window.navigator.onLine)
    }

    // Event handlers
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    // Attach event listeners
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
