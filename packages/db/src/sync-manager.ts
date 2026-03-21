import type { SyncStatus } from '@repo/shared';
import { DB_NAMES } from './databases';
import type { SyncHandle } from './sync';

export interface SyncState {
  status: SyncStatus;
  lastSyncTime: string | null;
  error: string | null;
  isOnline: boolean;
}

type SyncStateListener = (state: SyncState) => void;

const ALL_DB_NAMES = Object.values(DB_NAMES);

function makeStatus(mode: SyncStatus['mode'], isOnline: boolean): SyncStatus {
  return {
    mode,
    lastSynced: new Date().toISOString(),
    pendingChanges: 0,
    isOnline,
  };
}

export class SyncManager {
  private handles: SyncHandle[] = [];

  private state: SyncState = {
    status: makeStatus('local', typeof navigator !== 'undefined' ? navigator.onLine : false),
    lastSyncTime: null,
    error: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
  };

  private listeners: SyncStateListener[] = [];
  private remoteBaseUrl: string;

  constructor(remoteBaseUrl: string) {
    this.remoteBaseUrl = remoteBaseUrl;
  }

  subscribe(listener: SyncStateListener): () => void {
    this.listeners.push(listener);
    listener({ ...this.state });
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  async start(): Promise<void> {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    if (this.state.isOnline) {
      await this.startAllSyncs();
    }
  }

  stop(): void {
    this.stopAllSyncs();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = async (): Promise<void> => {
    this.state = {
      ...this.state,
      isOnline: true,
      status: makeStatus('cloud', true),
      error: null,
    };
    this.notify();
    await this.startAllSyncs();
  };

  private handleOffline = (): void => {
    this.stopAllSyncs();
    this.state = {
      ...this.state,
      isOnline: false,
      status: makeStatus('local', false),
    };
    this.notify();
  };

  private async startAllSyncs(): Promise<void> {
    if (this.handles.length > 0) return;

    const { startSync } = await import('./sync');

    for (const dbName of ALL_DB_NAMES) {
      const remoteUrl = `${this.remoteBaseUrl}/sync/${dbName}`;
      try {
        const handle = await startSync(dbName, remoteUrl);
        handle.on('change', (status) => {
          this.state = {
            ...this.state,
            status,
            lastSyncTime: new Date().toISOString(),
            error: null,
          };
          this.notify();
        });
        handle.on('error', (err) => {
          this.state = {
            ...this.state,
            error: err.message,
          };
          this.notify();
          console.error(err);
        });
        handle.on('active', () => {
          this.state = {
            ...this.state,
            status: makeStatus('cloud', this.state.isOnline),
          };
          this.notify();
        });
        handle.on('paused', () => {
          this.state = {
            ...this.state,
            status: makeStatus('local', this.state.isOnline),
          };
          this.notify();
        });
        this.handles.push(handle);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.state = {
          ...this.state,
          error: message,
        };
        this.notify();
        console.error(err);
      }
    }
  }

  private stopAllSyncs(): void {
    for (const handle of this.handles) {
      handle.cancel();
    }
    this.handles = [];
  }

  getState(): SyncState {
    return { ...this.state };
  }
}
