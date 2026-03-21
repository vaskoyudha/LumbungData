import type { SyncStatus } from '@repo/shared';

type SyncEventHandler = (status: SyncStatus) => void;
type SyncErrorHandler = (err: Error) => void;

interface PouchSyncObject {
  cancel(): void;
  on(event: 'change', handler: (info: unknown) => void): this;
  on(event: 'error', handler: (err: unknown) => void): this;
  on(event: 'paused', handler: () => void): this;
  on(event: 'active', handler: () => void): this;
}

interface SyncableDatabase {
  sync(remote: unknown, options: { live: boolean; retry: boolean }): PouchSyncObject;
}

export interface SyncHandle {
  cancel(): void;
  on(event: 'change', handler: SyncEventHandler): this;
  on(event: 'error', handler: SyncErrorHandler): this;
  on(event: 'paused', handler: () => void): this;
  on(event: 'active', handler: () => void): this;
}

function toSyncStatus(mode: SyncStatus['mode']): SyncStatus {
  return {
    mode,
    lastSynced: new Date().toISOString(),
    pendingChanges: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
  };
}

export async function startSync(dbName: string, remoteUrl: string): Promise<SyncHandle> {
  const { getDatabase } = await import('./databases');
  const localDb = (await getDatabase(dbName as never)) as unknown as SyncableDatabase;

  const PouchDB = (await import('./pouchdb')).getDBConstructor;
  const Ctor = await PouchDB();
  const remoteDb = new Ctor(remoteUrl);

  const syncHandlers: {
    change: SyncEventHandler[];
    error: SyncErrorHandler[];
    paused: Array<() => void>;
    active: Array<() => void>;
  } = { change: [], error: [], paused: [], active: [] };

  const syncObj = localDb.sync(remoteDb, {
    live: true,
    retry: true,
  });

  syncObj.on('change', (info) => {
    const direction =
      typeof info === 'object' && info !== null && 'direction' in info
        ? (info as { direction?: string }).direction
        : undefined;
    const status = direction === 'pull' ? toSyncStatus('local') : toSyncStatus('cloud');
    for (const handler of syncHandlers.change) {
      handler(status);
    }
  });

  syncObj.on('error', (err) => {
    const error = err instanceof Error ? err : new Error(String(err));
    for (const handler of syncHandlers.error) {
      handler(error);
    }
  });

  syncObj.on('paused', () => {
    for (const handler of syncHandlers.paused) {
      handler();
    }
  });

  syncObj.on('active', () => {
    for (const handler of syncHandlers.active) {
      handler();
    }
  });

  const handle: SyncHandle = {
    cancel() {
      syncObj.cancel();
    },
    on(event: 'change' | 'error' | 'paused' | 'active', handler: unknown): SyncHandle {
      if (event === 'change') syncHandlers.change.push(handler as SyncEventHandler);
      else if (event === 'error') syncHandlers.error.push(handler as SyncErrorHandler);
      else if (event === 'paused') syncHandlers.paused.push(handler as () => void);
      else if (event === 'active') syncHandlers.active.push(handler as () => void);
      return handle;
    },
  };

  return handle;
}
