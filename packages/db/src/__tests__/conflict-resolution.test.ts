import { vi, describe, it, expect, beforeEach } from 'vitest'

const mockPut = vi.fn()
const mockGet = vi.fn()
const mockAllDocs = vi.fn()
const mockRemove = vi.fn()

vi.mock('../databases', () => ({
  getDatabase: vi.fn(() =>
    Promise.resolve({
      put: mockPut,
      get: mockGet,
      allDocs: mockAllDocs,
      remove: mockRemove,
    }),
  ),
}))

describe('conflict-resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolveConflicts does nothing when there are no conflicts', async () => {
    mockAllDocs.mockResolvedValue({
      rows: [
        {
          doc: {
            _id: 'doc1',
            _rev: '1-abc',
            recordedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      ],
    })

    const { resolveConflicts } = await import('../conflict-resolution')
    await resolveConflicts('soil_readings')

    expect(mockRemove).not.toHaveBeenCalled()
  })

  it('resolveConflicts picks the doc with later timestamp as winner', async () => {
    const olderDoc = {
      _id: 'doc1',
      _rev: '2-aaa',
      recordedAt: '2026-01-01T00:00:00.000Z',
      _conflicts: ['2-bbb'],
    }
    const newerDoc = {
      _id: 'doc1',
      _rev: '2-bbb',
      recordedAt: '2026-03-01T00:00:00.000Z',
    }

    mockAllDocs.mockResolvedValue({
      rows: [{ doc: olderDoc }],
    })
    mockGet.mockResolvedValue(newerDoc)
    mockRemove.mockResolvedValue({ ok: true })

    const { resolveConflicts } = await import('../conflict-resolution')
    await resolveConflicts('soil_readings')

    expect(mockRemove).toHaveBeenCalledWith('doc1', '2-aaa')
  })

  it('resolveConflicts uses rev comparison for same timestamp', async () => {
    const docA = {
      _id: 'doc1',
      _rev: '2-aaa',
      recordedAt: '2026-01-01T00:00:00.000Z',
      _conflicts: ['2-zzz'],
    }
    const docB = {
      _id: 'doc1',
      _rev: '2-zzz',
      recordedAt: '2026-01-01T00:00:00.000Z',
    }

    mockAllDocs.mockResolvedValue({
      rows: [{ doc: docA }],
    })
    mockGet.mockResolvedValue(docB)
    mockRemove.mockResolvedValue({ ok: true })

    const { resolveConflicts } = await import('../conflict-resolution')
    await resolveConflicts('soil_readings')

    expect(mockRemove).toHaveBeenCalledWith('doc1', '2-aaa')
  })

  it('resolveConflicts removes all losing revisions', async () => {
    const baseDoc = {
      _id: 'doc1',
      _rev: '3-base',
      recordedAt: '2026-06-01T00:00:00.000Z',
      _conflicts: ['3-old1', '3-old2'],
    }

    mockAllDocs.mockResolvedValue({
      rows: [{ doc: baseDoc }],
    })
    mockGet
      .mockResolvedValueOnce({
        _id: 'doc1',
        _rev: '3-old1',
        recordedAt: '2026-01-01T00:00:00.000Z',
      })
      .mockResolvedValueOnce({
        _id: 'doc1',
        _rev: '3-old2',
        recordedAt: '2026-03-01T00:00:00.000Z',
      })
    mockRemove.mockResolvedValue({ ok: true })

    const { resolveConflicts } = await import('../conflict-resolution')
    await resolveConflicts('soil_readings')

    expect(mockRemove).toHaveBeenCalledTimes(2)
    expect(mockRemove).toHaveBeenCalledWith('doc1', '3-old1')
    expect(mockRemove).toHaveBeenCalledWith('doc1', '3-old2')
  })
})
