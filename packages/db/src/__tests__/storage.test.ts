import { vi, describe, it, expect, beforeEach } from 'vitest'

describe('storage utilities', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('getStorageEstimate returns usage, quota, and percentage', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 500_000, quota: 1_000_000 }),
        persist: vi.fn().mockResolvedValue(true),
      },
    })

    const { getStorageEstimate } = await import('../storage')
    const est = await getStorageEstimate()

    expect(est.usage).toBe(500_000)
    expect(est.quota).toBe(1_000_000)
    expect(est.percentage).toBe(50)
  })

  it('getStorageEstimate handles undefined usage/quota gracefully', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: undefined, quota: undefined }),
        persist: vi.fn().mockResolvedValue(true),
      },
    })

    const { getStorageEstimate } = await import('../storage')
    const est = await getStorageEstimate()

    expect(est.usage).toBe(0)
    expect(est.quota).toBe(1)
    expect(est.percentage).toBe(0)
  })

  it('isStorageLow returns true when usage exceeds threshold', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 900_000, quota: 1_000_000 }),
        persist: vi.fn().mockResolvedValue(true),
      },
    })

    const { isStorageLow } = await import('../storage')
    const low = await isStorageLow(80)

    expect(low).toBe(true)
  })

  it('isStorageLow returns false when usage is below threshold', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 100_000, quota: 1_000_000 }),
        persist: vi.fn().mockResolvedValue(true),
      },
    })

    const { isStorageLow } = await import('../storage')
    const low = await isStorageLow(80)

    expect(low).toBe(false)
  })

  it('requestPersistentStorage returns false if persist is not available', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 1 }),
      },
    })

    const { requestPersistentStorage } = await import('../storage')
    const result = await requestPersistentStorage()

    expect(result).toBe(false)
  })

  it('requestPersistentStorage calls navigator.storage.persist', async () => {
    const mockPersist = vi.fn().mockResolvedValue(true)
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 1 }),
        persist: mockPersist,
      },
    })

    const { requestPersistentStorage } = await import('../storage')
    const result = await requestPersistentStorage()

    expect(result).toBe(true)
    expect(mockPersist).toHaveBeenCalledOnce()
  })
})
