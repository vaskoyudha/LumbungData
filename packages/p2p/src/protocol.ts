const MAX_SAFE_PAYLOAD_BYTES = 14 * 1024;
const CHUNK_PAYLOAD_BYTES = 12 * 1024;
const MAX_BUFFERED_AMOUNT = 65536;

export type P2PMessageType =
  | 'rev-map'
  | 'doc-request'
  | 'doc-response'
  | 'chunk'
  | 'chunk-end'
  | 'sync-complete'
  | 'error';

export interface P2PMessage {
  type: P2PMessageType;
  seq: number;
  payload: unknown;
}

export interface P2PChunk {
  type: 'chunk';
  seq: number;
  index: number;
  total: number;
  data: string;
}

interface P2PChunkEnd {
  type: 'chunk-end';
  seq: number;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function serialize(msg: P2PMessage): string {
  return JSON.stringify(msg);
}

export function deserialize(raw: string): P2PMessage {
  const parsed: unknown = JSON.parse(raw);
  if (!isObjectRecord(parsed)) {
    throw new Error('Invalid P2P message: not an object');
  }

  const { type, seq, payload } = parsed;
  if (typeof type !== 'string') {
    throw new Error('Invalid P2P message: type is missing');
  }
  if (typeof seq !== 'number' || !Number.isFinite(seq)) {
    throw new Error('Invalid P2P message: seq is missing');
  }

  return {
    type: type as P2PMessageType,
    seq,
    payload,
  };
}

export function canSend(channel: RTCDataChannel): boolean {
  return channel.bufferedAmount < MAX_BUFFERED_AMOUNT;
}

export function chunk(msg: P2PMessage): string[] {
  const serialized = serialize(msg);
  if (serialized.length <= MAX_SAFE_PAYLOAD_BYTES) {
    return [serialized];
  }

  const total = Math.ceil(serialized.length / CHUNK_PAYLOAD_BYTES);
  const chunks: string[] = [];

  for (let index = 0; index < total; index += 1) {
    const start = index * CHUNK_PAYLOAD_BYTES;
    const end = start + CHUNK_PAYLOAD_BYTES;
    const data = serialized.slice(start, end);
    const part: P2PChunk = {
      type: 'chunk',
      seq: msg.seq,
      index,
      total,
      data,
    };
    chunks.push(JSON.stringify(part));
  }

  const endMarker: P2PChunkEnd = {
    type: 'chunk-end',
    seq: msg.seq,
  };
  chunks.push(JSON.stringify(endMarker));

  return chunks;
}

export function isComplete(chunks: P2PChunk[]): boolean {
  if (chunks.length === 0) {
    return false;
  }

  const [first] = chunks;
  if (!first) {
    return false;
  }

  const expectedTotal = first.total;
  if (chunks.length !== expectedTotal) {
    return false;
  }

  const indexes = new Set<number>();
  for (const part of chunks) {
    if (part.seq !== first.seq || part.total !== expectedTotal) {
      return false;
    }
    indexes.add(part.index);
  }

  for (let index = 0; index < expectedTotal; index += 1) {
    if (!indexes.has(index)) {
      return false;
    }
  }

  return true;
}

export function reassemble(chunks: P2PChunk[]): P2PMessage {
  if (!isComplete(chunks)) {
    throw new Error('Cannot reassemble incomplete chunk list');
  }

  const sorted = [...chunks].sort((a, b) => a.index - b.index);
  let serialized = '';
  for (const part of sorted) {
    serialized += part.data;
  }

  return deserialize(serialized);
}

export function isChunkMessage(message: unknown): message is P2PChunk {
  if (!isObjectRecord(message)) {
    return false;
  }

  return (
    message.type === 'chunk' &&
    typeof message.seq === 'number' &&
    typeof message.index === 'number' &&
    typeof message.total === 'number' &&
    typeof message.data === 'string'
  );
}

export function isChunkEndMessage(message: unknown): message is P2PChunkEnd {
  if (!isObjectRecord(message)) {
    return false;
  }

  return message.type === 'chunk-end' && typeof message.seq === 'number';
}
