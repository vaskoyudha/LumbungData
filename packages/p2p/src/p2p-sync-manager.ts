import type { SyncStatus } from '@repo/shared';

import { startP2PReplication, type P2PSyncHandle } from './replication';

export class P2PSyncManager {
  private readonly localDb: PouchDB.Database;

  private handle: P2PSyncHandle | undefined;

  private channel: RTCDataChannel | undefined;

  private readonly status: SyncStatus = {
    mode: 'p2p',
    lastSynced: '',
    pendingChanges: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
  };

  private readonly onChannelOpen = (): void => {
    this.status.isOnline = true;
  };

  private readonly onChannelClose = (): void => {
    this.status.isOnline = false;
  };

  private readonly onChannelError = (): void => {
    this.status.isOnline = false;
  };

  constructor(localDb: PouchDB.Database) {
    this.localDb = localDb;
  }

  connect(channel: RTCDataChannel): void {
    this.disconnect();

    this.channel = channel;
    this.status.isOnline = channel.readyState === 'open';

    channel.addEventListener('open', this.onChannelOpen);
    channel.addEventListener('close', this.onChannelClose);
    channel.addEventListener('error', this.onChannelError);

    const handle = startP2PReplication(channel, this.localDb);
    handle.on('change', () => {
      const pending = handle.progress.total - handle.progress.sent;
      this.status.pendingChanges = pending > 0 ? pending : 0;
    });

    handle.on('complete', () => {
      this.status.lastSynced = new Date().toISOString();
      this.status.pendingChanges = 0;
    });

    handle.on('error', () => {
      this.status.isOnline = false;
    });

    this.handle = handle;
  }

  getStatus(): SyncStatus {
    return {
      mode: this.status.mode,
      lastSynced: this.status.lastSynced,
      pendingChanges: this.status.pendingChanges,
      isOnline: this.status.isOnline,
    };
  }

  disconnect(): void {
    if (this.channel) {
      this.channel.removeEventListener('open', this.onChannelOpen);
      this.channel.removeEventListener('close', this.onChannelClose);
      this.channel.removeEventListener('error', this.onChannelError);
    }

    this.handle?.cancel();
    this.handle = undefined;
    this.channel = undefined;
    this.status.isOnline = false;
  }
}
