import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockPut = vi.fn()
const mockGet = vi.fn()
const mockAllDocs = vi.fn()
const mockRemove = vi.fn()

vi.mock('../databases', () => ({
  DB_NAMES: { soil: 'soil_readings' },
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
  randomUUID: vi.fn(() => 'test-uuid-1234'),
})

const baseSoilData = {
  farmerId: 'farmer-1',
  pH: 6.5,
  nitrogen: 40,
  phosphorus: 30,
  potassium: 20,
  moisture: 55,
  organicMatter: 3.2,
  notes: 'Test notes',
  location: 'Test Village',
  recordedAt: '2026-01-01T00:00:00.000Z',
}

describe('soil CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPut.mockResolvedValue({ id: 'test-uuid-1234', rev: '1-abc', ok: true })
  })

  it('createSoilReading returns a SoilReading with generated ID', async () => {
    const { createSoilReading } = await import('../soil')
    const result = await createSoilReading(baseSoilData)

    expect(result.id).toBe('test-uuid-1234')
    expect(result.farmerId).toBe('farmer-1')
    expect(result.pH).toBe(6.5)
    expect(mockPut).toHaveBeenCalledOnce()
  })

  it('createSoilReading passes correct document to db.put', async () => {
    const { createSoilReading } = await import('../soil')
    await createSoilReading(baseSoilData)

    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: 'test-uuid-1234',
        farmerId: 'farmer-1',
        pH: 6.5,
      }),
    )
  })

  it('getSoilReading returns the correct reading', async () => {
    mockGet.mockResolvedValue({
      _id: 'test-id',
      _rev: '1-abc',
      ...baseSoilData,
    })

    const { getSoilReading } = await import('../soil')
    const result = await getSoilReading('test-id')

    expect(result).not.toBeNull()
    expect(result?.id).toBe('test-id')
    expect(result?.pH).toBe(6.5)
    expect(mockGet).toHaveBeenCalledWith('test-id')
  })

  it('getSoilReading returns null when not found', async () => {
    mockGet.mockRejectedValue({ status: 404, message: 'not found' })

    const { getSoilReading } = await import('../soil')
    const result = await getSoilReading('nonexistent')

    expect(result).toBeNull()
  })

  it('listSoilReadings returns array filtered by farmerId', async () => {
    mockAllDocs.mockResolvedValue({
      rows: [
        { doc: { _id: 'r1', _rev: '1-a', ...baseSoilData, farmerId: 'farmer-1' } },
        { doc: { _id: 'r2', _rev: '1-b', ...baseSoilData, farmerId: 'farmer-2' } },
        { doc: { _id: 'r3', _rev: '1-c', ...baseSoilData, farmerId: 'farmer-1' } },
      ],
    })

    const { listSoilReadings } = await import('../soil')
    const results = await listSoilReadings('farmer-1')

    expect(results).toHaveLength(2)
    expect(results.every((r) => r.farmerId === 'farmer-1')).toBe(true)
  })

  it('listSoilReadings returns empty array when no matches', async () => {
    mockAllDocs.mockResolvedValue({ rows: [] })

    const { listSoilReadings } = await import('../soil')
    const results = await listSoilReadings('nobody')

    expect(results).toHaveLength(0)
  })

  it('updateSoilReading returns updated document', async () => {
    mockGet.mockResolvedValue({
      _id: 'test-id',
      _rev: '1-abc',
      ...baseSoilData,
    })
    mockPut.mockResolvedValue({ id: 'test-id', rev: '2-def', ok: true })

    const { updateSoilReading } = await import('../soil')
    const result = await updateSoilReading('test-id', { pH: 7.0 })

    expect(result.pH).toBe(7.0)
    expect(result.nitrogen).toBe(40)
    expect(mockPut).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'test-id', _rev: '1-abc', pH: 7.0 }),
    )
  })

  it('deleteSoilReading resolves without error', async () => {
    mockGet.mockResolvedValue({ _id: 'test-id', _rev: '1-abc' })
    mockRemove.mockResolvedValue({ ok: true })

    const { deleteSoilReading } = await import('../soil')
    await expect(deleteSoilReading('test-id')).resolves.toBeUndefined()
    expect(mockRemove).toHaveBeenCalledWith({ _id: 'test-id', _rev: '1-abc' })
  })
})
