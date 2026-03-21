// Storage quota monitoring and cleanup utilities

export interface StorageEstimate {
  usage: number
  quota: number
  percentage: number
}

export async function getStorageEstimate(): Promise<StorageEstimate> {
  const estimate = await navigator.storage.estimate()
  const usage = estimate.usage ?? 0
  const quota = estimate.quota ?? 1
  const percentage = Math.round((usage / quota) * 100)
  return { usage, quota, percentage }
}

export async function isStorageLow(threshold = 80): Promise<boolean> {
  const { percentage } = await getStorageEstimate()
  return percentage > threshold
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage.persist) return false
  return navigator.storage.persist()
}

export async function cleanupSyncedData(olderThan: Date): Promise<number> {
  // Import databases dynamically to avoid circular deps
  const { getDatabase } = await import('./databases')
  const dbNames = ['soil_readings', 'market_prices', 'farmer_profiles', 'subsidy_distributions'] as const
  let deleted = 0

  for (const dbName of dbNames) {
    const db = await getDatabase(dbName as never)
    const result = await db.allDocs({ include_docs: true })
    for (const row of result.rows) {
      const doc = row.doc
      if (!doc) continue
      // Only delete docs that have been synced (have a _rev from CouchDB) and are old
      const docData = doc as unknown as Record<string, unknown>
      const recordedAt = docData['recordedAt'] as string | undefined
      const reportedAt = docData['reportedAt'] as string | undefined
      const dateStr = recordedAt ?? reportedAt ?? '0'
      const docDate = new Date(dateStr)
      const rev = doc._rev
      if (docDate < olderThan && typeof rev === 'string' && rev.startsWith('2-')) {
        await db.remove(doc._id, rev)
        deleted++
      }
    }
  }

  return deleted
}
