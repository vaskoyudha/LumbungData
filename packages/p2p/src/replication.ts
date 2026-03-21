import {
  canSend,
  chunk,
  deserialize,
  isChunkEndMessage,
  isChunkMessage,
  isComplete,
  reassemble,
  type P2PChunk,
  type P2PMessage,
} from './protocol';

type ChangeHandler = () => void;
type CompleteHandler = () => void;
type ErrorHandler = (error: Error) => void;

interface RevMapPayload {
  docIds: string[];
  revs: Record<string, string>;
}

interface DocResponsePayload {
  doc: PouchDB.Core.IdMeta & PouchDB.Core.GetMeta & Record<string, unknown>;
}

interface PouchAllDocsRow {
  id: string;
  value?: {
    rev?: string;
  };
}

export interface P2PSyncHandle {
  cancel(): void;
  on(event: 'change' | 'complete' | 'error', handler: Function): void;
  progress: {
    sent: number;
    received: number;
    total: number;
  };
}

const BACKPRESSURE_LIMIT = 65536;
const BACKPRESSURE_POLL_INTERVAL_MS = 10;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRevMapPayload(payload: unknown): payload is RevMapPayload {
  if (!isObjectRecord(payload)) {
    return false;
  }

  if (!Array.isArray(payload.docIds) || !isObjectRecord(payload.revs)) {
    return false;
  }

  for (const docId of payload.docIds) {
    if (typeof docId !== 'string') {
      return false;
    }
  }

  for (const value of Object.values(payload.revs)) {
    if (typeof value !== 'string') {
      return false;
    }
  }

  return true;
}

function isDocResponsePayload(payload: unknown): payload is DocResponsePayload {
  if (!isObjectRecord(payload)) {
    return false;
  }

  const doc = payload.doc;
  if (!isObjectRecord(doc)) {
    return false;
  }

  return typeof doc._id === 'string';
}

async function buildLocalRevMap(localDb: PouchDB.Database): Promise<RevMapPayload> {
  const allDocsResult = await localDb.allDocs();
  const rows = allDocsResult.rows as PouchAllDocsRow[];

  const docIds: string[] = [];
  const revs: Record<string, string> = {};

  for (const row of rows) {
    docIds.push(row.id);
    const rev = row.value?.rev;
    if (typeof rev === 'string') {
      revs[row.id] = rev;
    }
  }

  return { docIds, revs };
}

export function startP2PReplication(
  channel: RTCDataChannel,
  localDb: PouchDB.Database,
): P2PSyncHandle {
  let cancelled = false;
  let localCompleteSent = false;
  let remoteCompleteReceived = false;
  let completionEmitted = false;
  let sequence = 1;
  let didSendRevMap = false;

  const handlers: {
    change: ChangeHandler[];
    complete: CompleteHandler[];
    error: ErrorHandler[];
  } = {
    change: [],
    complete: [],
    error: [],
  };

  const pendingChunks = new Map<number, P2PChunk[]>();
  const chunkEndReceived = new Set<number>();

  const progress = {
    sent: 0,
    received: 0,
    total: 0,
  };

  function emitChange(): void {
    for (const handler of handlers.change) {
      handler();
    }
  }

  function emitComplete(): void {
    for (const handler of handlers.complete) {
      handler();
    }
  }

  function emitError(error: Error): void {
    for (const handler of handlers.error) {
      handler(error);
    }
  }

  function cancel(): void {
    if (cancelled) {
      return;
    }

    cancelled = true;
    channel.removeEventListener('message', onMessage);
    channel.removeEventListener('error', onChannelError);
    channel.removeEventListener('close', onChannelClose);
    channel.removeEventListener('open', onChannelOpen);
  }

  function finalizeIfComplete(): void {
    if (localCompleteSent && remoteCompleteReceived && !cancelled && !completionEmitted) {
      completionEmitted = true;
      emitComplete();
    }
  }

  async function sendRaw(raw: string): Promise<void> {
    while (!cancelled && (!canSend(channel) || channel.bufferedAmount > BACKPRESSURE_LIMIT)) {
      await delay(BACKPRESSURE_POLL_INTERVAL_MS);
    }

    if (cancelled || channel.readyState !== 'open') {
      throw new Error('RTC data channel is not open');
    }

    channel.send(raw);
  }

  async function sendMessage(message: P2PMessage): Promise<void> {
    const packets = chunk(message);
    for (const packet of packets) {
      await sendRaw(packet);
    }
  }

  async function sendSyncComplete(): Promise<void> {
    if (localCompleteSent || cancelled) {
      return;
    }

    await sendMessage({
      type: 'sync-complete',
      seq: sequence,
      payload: { completedAt: new Date().toISOString() },
    });
    sequence += 1;
    localCompleteSent = true;
    finalizeIfComplete();
  }

  async function processRevMap(payload: RevMapPayload): Promise<void> {
    const localMap = await buildLocalRevMap(localDb);
    const docsToSend: string[] = [];

    const remoteRevs = payload.revs;
    for (const localDocId of localMap.docIds) {
      const localRev = localMap.revs[localDocId];
      if (typeof localRev !== 'string') {
        continue;
      }

      const remoteRev = remoteRevs[localDocId];
      if (typeof remoteRev !== 'string' || remoteRev !== localRev) {
        docsToSend.push(localDocId);
      }
    }

    progress.total = docsToSend.length;
    emitChange();

    for (const docId of docsToSend) {
      if (cancelled) {
        return;
      }

      const doc = await localDb.get(docId);
      const message: P2PMessage = {
        type: 'doc-response',
        seq: sequence,
        payload: {
          doc,
        },
      };

      await sendMessage(message);
      sequence += 1;
      progress.sent += 1;
      emitChange();
    }

    await sendSyncComplete();
  }

  async function processDocResponse(payload: DocResponsePayload): Promise<void> {
    try {
      await localDb.put(payload.doc);
      progress.received += 1;
      emitChange();
      return;
    } catch (error) {
      if (isObjectRecord(error) && error.status === 409) {
        return;
      }

      throw error;
    }
  }

  async function processMessage(message: P2PMessage): Promise<void> {
    if (cancelled) {
      return;
    }

    if (message.type === 'rev-map') {
      if (!isRevMapPayload(message.payload)) {
        throw new Error('Invalid rev-map payload');
      }

      await processRevMap(message.payload);
      return;
    }

    if (message.type === 'doc-response') {
      if (!isDocResponsePayload(message.payload)) {
        throw new Error('Invalid doc-response payload');
      }

      await processDocResponse(message.payload);
      return;
    }

    if (message.type === 'sync-complete') {
      remoteCompleteReceived = true;
      finalizeIfComplete();
      return;
    }

    if (message.type === 'error') {
      const payload = isObjectRecord(message.payload) ? message.payload : undefined;
      const reason = payload?.reason;
      const reasonText = typeof reason === 'string' ? reason : 'Remote peer reported an error';
      throw new Error(reasonText);
    }
  }

  async function tryProcessChunked(seq: number): Promise<void> {
    const chunks = pendingChunks.get(seq);
    if (!chunks || !chunkEndReceived.has(seq)) {
      return;
    }

    if (!isComplete(chunks)) {
      throw new Error(`Incomplete chunks for seq ${seq}`);
    }

    const reassembled = reassemble(chunks);
    pendingChunks.delete(seq);
    chunkEndReceived.delete(seq);
    await processMessage(reassembled);
  }

  async function onMessage(event: MessageEvent): Promise<void> {
    if (cancelled) {
      return;
    }

    const rawData = event.data;
    if (typeof rawData !== 'string') {
      emitError(new Error('Unsupported RTC message type; expected string'));
      cancel();
      return;
    }

    try {
      const parsed: unknown = JSON.parse(rawData);

      if (isChunkMessage(parsed)) {
        const existing = pendingChunks.get(parsed.seq) ?? [];
        existing.push(parsed);
        pendingChunks.set(parsed.seq, existing);
        await tryProcessChunked(parsed.seq);
        return;
      }

      if (isChunkEndMessage(parsed)) {
        chunkEndReceived.add(parsed.seq);
        await tryProcessChunked(parsed.seq);
        return;
      }

      const message = deserialize(rawData);
      await processMessage(message);
    } catch (error) {
      const resolvedError = error instanceof Error ? error : new Error(String(error));
      emitError(resolvedError);
      cancel();
    }
  }

  function onChannelError(): void {
    emitError(new Error('RTC data channel error'));
    cancel();
  }

  function onChannelClose(): void {
    if (!cancelled) {
      emitError(new Error('RTC data channel closed'));
      cancel();
    }
  }

  async function sendInitialRevMap(): Promise<void> {
    if (cancelled || didSendRevMap) {
      return;
    }

    didSendRevMap = true;

    try {
      const localMap = await buildLocalRevMap(localDb);
      await sendMessage({
        type: 'rev-map',
        seq: sequence,
        payload: localMap,
      });
      sequence += 1;
    } catch (error) {
      const resolvedError = error instanceof Error ? error : new Error(String(error));
      emitError(resolvedError);
      cancel();
    }
  }

  function onChannelOpen(): void {
    void sendInitialRevMap();
  }

  channel.addEventListener('message', onMessage);
  channel.addEventListener('error', onChannelError);
  channel.addEventListener('close', onChannelClose);
  channel.addEventListener('open', onChannelOpen);

  if (channel.readyState === 'open') {
    void sendInitialRevMap();
  }

  const handle: P2PSyncHandle = {
    cancel,
    on(event: 'change' | 'complete' | 'error', handler: Function): void {
      if (event === 'change') {
        handlers.change.push(handler as ChangeHandler);
      } else if (event === 'complete') {
        handlers.complete.push(handler as CompleteHandler);
      } else {
        handlers.error.push(handler as ErrorHandler);
      }
    },
    progress,
  };

  return handle;
}
