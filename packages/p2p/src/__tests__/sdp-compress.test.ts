import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

function createMockStream(transformFn: (input: Uint8Array) => Uint8Array) {
  let storedChunks: Uint8Array[] = []
  let resolveReadable: (() => void) | null = null
  let writerClosed = false

  const writable = {
    getWriter: () => ({
      write: vi.fn((chunk: Uint8Array) => {
        storedChunks.push(transformFn(chunk))
        return Promise.resolve()
      }),
      close: vi.fn(() => {
        writerClosed = true
        if (resolveReadable) resolveReadable()
        return Promise.resolve()
      }),
    }),
  }

  const readable = {
    getReader: () => {
      let index = 0
      return {
        read: vi.fn(async () => {
          if (!writerClosed) {
            await new Promise<void>((resolve) => {
              resolveReadable = resolve
            })
          }
          if (index < storedChunks.length) {
            const value = storedChunks[index]
            index++
            return { done: false, value }
          }
          return { done: true, value: undefined }
        }),
      }
    },
  }

  return { writable, readable }
}

describe('sdp-compress', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'CompressionStream',
      vi.fn(() => createMockStream((chunk) => chunk)),
    )
    vi.stubGlobal(
      'DecompressionStream',
      vi.fn(() => createMockStream((chunk) => chunk)),
    )
    vi.stubGlobal(
      'TextEncoder',
      class {
        encode(str: string): Uint8Array {
          return new Uint8Array(Array.from(str).map((c) => c.charCodeAt(0)))
        }
      },
    )
    vi.stubGlobal(
      'TextDecoder',
      class {
        decode(bytes: Uint8Array): string {
          return String.fromCharCode(...bytes)
        }
      },
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('compressSDP returns a base64 string', async () => {
    const { compressSDP } = await import('../sdp-compress')
    const result = await compressSDP('v=0\r\no=- 12345\r\n')

    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('compress + decompress roundtrip returns original string', async () => {
    const { compressSDP, decompressSDP } = await import('../sdp-compress')
    const original = 'v=0\r\no=- 46117317 2 IN IP4 127.0.0.1\r\ns=-\r\n'

    const compressed = await compressSDP(original)
    const decompressed = await decompressSDP(compressed)

    expect(decompressed).toBe(original)
  })

  it('decompressSDP returns the original input for identity transform', async () => {
    const { compressSDP, decompressSDP } = await import('../sdp-compress')
    const sdp = 'a=candidate:1 1 udp 2122260223 192.168.1.1 50000 typ host'

    const compressed = await compressSDP(sdp)
    const result = await decompressSDP(compressed)

    expect(result).toBe(sdp)
  })

  it('compressSDP produces valid base64 output', async () => {
    const { compressSDP } = await import('../sdp-compress')
    const result = await compressSDP('test sdp data')

    const base64Regex = /^[A-Za-z0-9+/]+=*$/
    expect(base64Regex.test(result)).toBe(true)
  })
})
