import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockPut = vi.fn()
const mockGet = vi.fn()
const mockAllDocs = vi.fn()
const mockRemove = vi.fn()

vi.mock('../databases', () => ({
  DB_NAMES: { market: 'market_prices' },
  getDatabase: vi.fn(() =>
    Promise.resolve({
      put: mockPut,
      get: mockGet,
      allDocs: mockAllDocs,
      remove: mockRemove,
    }),
  ),
}))

vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'market-uuid-5678'),
})

const baseMarketData = {
  cropType: 'Padi',
  pricePerKg: 12000,
  currency: 'IDR' as const,
  location: 'Pasar Bogor',
  qualityGrade: 'A' as const,
  reportedBy: 'farmer-1',
  reportedAt: '2026-01-15T10:00:00.000Z',
}

describe('market CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPut.mockResolvedValue({ id: 'market-uuid-5678', rev: '1-abc', ok: true })
  })

  it('createMarketPrice returns a MarketPrice with generated ID', async () => {
    const { createMarketPrice } = await import('../market')
    const result = await createMarketPrice(baseMarketData)

    expect(result.id).toBe('market-uuid-5678')
    expect(result.cropType).toBe('Padi')
    expect(result.pricePerKg).toBe(12000)
    expect(mockPut).toHaveBeenCalledOnce()
  })

  it('getMarketPrice returns the correct price', async () => {
    mockGet.mockResolvedValue({
      _id: 'price-1',
      _rev: '1-abc',
      ...baseMarketData,
    })

    const { getMarketPrice } = await import('../market')
    const result = await getMarketPrice('price-1')

    expect(result).not.toBeNull()
    expect(result?.id).toBe('price-1')
    expect(result?.cropType).toBe('Padi')
  })

  it('getMarketPrice returns null when not found', async () => {
    mockGet.mockRejectedValue({ status: 404, message: 'not found' })

    const { getMarketPrice } = await import('../market')
    const result = await getMarketPrice('nonexistent')

    expect(result).toBeNull()
  })

  it('listMarketPrices returns all prices when no location specified', async () => {
    mockAllDocs.mockResolvedValue({
      rows: [
        { doc: { _id: 'p1', _rev: '1-a', ...baseMarketData } },
        { doc: { _id: 'p2', _rev: '1-b', ...baseMarketData, location: 'Jakarta' } },
      ],
    })

    const { listMarketPrices } = await import('../market')
    const results = await listMarketPrices()

    expect(results).toHaveLength(2)
  })

  it('listMarketPrices filters by location', async () => {
    mockAllDocs.mockResolvedValue({
      rows: [
        { doc: { _id: 'p1', _rev: '1-a', ...baseMarketData, location: 'Bogor' } },
        { doc: { _id: 'p2', _rev: '1-b', ...baseMarketData, location: 'Jakarta' } },
      ],
    })

    const { listMarketPrices } = await import('../market')
    const results = await listMarketPrices('Bogor')

    expect(results).toHaveLength(1)
    expect(results[0]?.location).toBe('Bogor')
  })

  it('updateMarketPrice returns updated document', async () => {
    mockGet.mockResolvedValue({
      _id: 'price-1',
      _rev: '1-abc',
      ...baseMarketData,
    })
    mockPut.mockResolvedValue({ id: 'price-1', rev: '2-def', ok: true })

    const { updateMarketPrice } = await import('../market')
    const result = await updateMarketPrice('price-1', { pricePerKg: 15000 })

    expect(result.pricePerKg).toBe(15000)
    expect(result.cropType).toBe('Padi')
  })

  it('deleteMarketPrice resolves without error', async () => {
    mockGet.mockResolvedValue({ _id: 'price-1', _rev: '1-abc' })
    mockRemove.mockResolvedValue({ ok: true })

    const { deleteMarketPrice } = await import('../market')
    await expect(deleteMarketPrice('price-1')).resolves.toBeUndefined()
    expect(mockRemove).toHaveBeenCalledWith({ _id: 'price-1', _rev: '1-abc' })
  })

  it('listMarketPricesByCrop filters by crop type', async () => {
    mockAllDocs.mockResolvedValue({
      rows: [
        { doc: { _id: 'p1', _rev: '1-a', ...baseMarketData, cropType: 'Padi' } },
        { doc: { _id: 'p2', _rev: '1-b', ...baseMarketData, cropType: 'Jagung' } },
        { doc: { _id: 'p3', _rev: '1-c', ...baseMarketData, cropType: 'Padi' } },
      ],
    })

    const { listMarketPricesByCrop } = await import('../market')
    const results = await listMarketPricesByCrop('Padi')

    expect(results).toHaveLength(2)
    expect(results.every((p) => p.cropType === 'Padi')).toBe(true)
  })
})
