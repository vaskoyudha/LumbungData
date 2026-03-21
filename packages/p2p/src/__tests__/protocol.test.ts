import { describe, it, expect } from 'vitest'
import {
  serialize,
  deserialize,
  canSend,
  chunk,
  isComplete,
  reassemble,
  isChunkMessage,
  isChunkEndMessage,
  type P2PMessage,
  type P2PChunk,
} from '../protocol'

const makeMessage = (payloadSize: number, seq = 1): P2PMessage => ({
  type: 'doc-response',
  seq,
  payload: 'x'.repeat(payloadSize),
})

describe('protocol', () => {
  it('serialize produces valid JSON', () => {
    const msg: P2PMessage = { type: 'rev-map', seq: 1, payload: { foo: 'bar' } }
    const json = serialize(msg)
    const parsed = JSON.parse(json)

    expect(parsed.type).toBe('rev-map')
    expect(parsed.seq).toBe(1)
  })

  it('deserialize restores a serialized message', () => {
    const msg: P2PMessage = { type: 'doc-request', seq: 42, payload: [1, 2, 3] }
    const result = deserialize(serialize(msg))

    expect(result.type).toBe('doc-request')
    expect(result.seq).toBe(42)
    expect(result.payload).toEqual([1, 2, 3])
  })

  it('deserialize throws on invalid input', () => {
    expect(() => deserialize('not json')).toThrow()
    expect(() => deserialize('"just a string"')).toThrow('not an object')
    expect(() => deserialize('{"seq":1}')).toThrow('type is missing')
    expect(() => deserialize('{"type":"rev-map"}')).toThrow('seq is missing')
  })

  it('canSend returns true when bufferedAmount is low', () => {
    const channel = { bufferedAmount: 0 } as RTCDataChannel
    expect(canSend(channel)).toBe(true)
  })

  it('canSend returns false when bufferedAmount exceeds threshold', () => {
    const channel = { bufferedAmount: 100_000 } as RTCDataChannel
    expect(canSend(channel)).toBe(false)
  })

  it('chunk returns single element for small messages', () => {
    const small = makeMessage(100)
    const result = chunk(small)

    expect(result).toHaveLength(1)
    expect(JSON.parse(result[0]!).type).toBe('doc-response')
  })

  it('chunk splits large messages into multiple chunks + end marker', () => {
    const large = makeMessage(50_000)
    const result = chunk(large)

    expect(result.length).toBeGreaterThan(2)

    const lastParsed = JSON.parse(result[result.length - 1]!)
    expect(lastParsed.type).toBe('chunk-end')

    const firstParsed = JSON.parse(result[0]!)
    expect(firstParsed.type).toBe('chunk')
    expect(firstParsed.index).toBe(0)
  })

  it('reassemble restores original message from chunks', () => {
    const original = makeMessage(50_000, 7)
    const parts = chunk(original)

    const chunkParts: P2PChunk[] = parts
      .map((p) => JSON.parse(p))
      .filter((p: Record<string, unknown>) => p.type === 'chunk') as P2PChunk[]

    const restored = reassemble(chunkParts)

    expect(restored.type).toBe('doc-response')
    expect(restored.seq).toBe(7)
    expect(restored.payload).toBe(original.payload)
  })

  it('isComplete returns false for empty array', () => {
    expect(isComplete([])).toBe(false)
  })

  it('isComplete returns true when all chunks present', () => {
    const parts = chunk(makeMessage(50_000))
    const chunkParts: P2PChunk[] = parts
      .map((p) => JSON.parse(p))
      .filter((p: Record<string, unknown>) => p.type === 'chunk') as P2PChunk[]

    expect(isComplete(chunkParts)).toBe(true)
  })

  it('isChunkMessage validates chunk objects', () => {
    expect(isChunkMessage({ type: 'chunk', seq: 1, index: 0, total: 2, data: 'abc' })).toBe(true)
    expect(isChunkMessage({ type: 'rev-map', seq: 1 })).toBe(false)
    expect(isChunkMessage(null)).toBe(false)
  })

  it('isChunkEndMessage validates chunk-end objects', () => {
    expect(isChunkEndMessage({ type: 'chunk-end', seq: 1 })).toBe(true)
    expect(isChunkEndMessage({ type: 'chunk', seq: 1 })).toBe(false)
  })
})
