import type { SyncStatus } from '@repo/shared';

import { SyncManager } from './sync-manager';

export type OrchestratorStatus = {
  mode: 'local' | 'p2p' | 'cloud' | 'blockchain';
  isOnline: boolean;
  isPeerConnected: boolean;
  lastCloudSync: string | null;
  lastP2PSync: string | null;
  pendingDocs: number;
  pendingTxs: number;
};

export type OrchestratorConfig = {
  couchDbUrl: string;
  besuRpcUrl: string;
  contractAddress: string;
  createP2PManager?: () => Promise<P2PManagerLike>;
  blockchain?: BlockchainAdapter;
};

export interface P2PManagerLike {
  connect(channel: RTCDataChannel): void;
  disconnect(): void;
  getStatus(): SyncStatus;
}

export interface BlockchainAdapter {
  getPendingTxCount: () => Promise<number>;
  broadcastPendingTransactions: (rpcUrl: string) => Promise<void>;
  startAutoBroadcast: (rpcUrl: string) => void;
  stopAutoBroadcast: () => void;
}

type StatusListener = (status: OrchestratorStatus) => void;

const TX_POLL_INTERVAL_MS = 10_000;
const P2P_POLL_INTERVAL_MS = 1_000;

function resolveMode(status: OrchestratorStatus): OrchestratorStatus['mode'] {
  if (status.isOnline && status.pendingTxs > 0) {
    return 'blockchain';
  }

  if (status.isOnline) {
    return 'cloud';
  }

  if (status.isPeerConnected) {
    return 'p2p';
  }

  return 'local';
}

function toTimestamp(lastSynced: string): string | null {
  return lastSynced === '' ? null : lastSynced;
}

export class SyncOrchestrator {
  private readonly syncManager: SyncManager;

  private p2pManager: P2PManagerLike | null = null;

  private cloudUnsubscribe: (() => void) | null = null;

  private readonly listeners: StatusListener[] = [];

  private txPollTimer: ReturnType<typeof setInterval> | null = null;

  private p2pPollTimer: ReturnType<typeof setInterval> | null = null;

  private autoBroadcastRunning = false;

  private started = false;

  private readonly status: OrchestratorStatus = {
    mode: 'local',
    isOnline: false,
    isPeerConnected: false,
    lastCloudSync: null,
    lastP2PSync: null,
    pendingDocs: 0,
    pendingTxs: 0,
  };

  constructor(private readonly config: OrchestratorConfig) {
    void this.config.contractAddress;
    this.syncManager = new SyncManager(config.couchDbUrl);
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.started = true;
    this.status.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
    this.status.mode = resolveMode(this.status);

    this.cloudUnsubscribe = this.syncManager.subscribe((state) => {
      const cloudStatus = state.status;
      this.status.isOnline = state.isOnline;
      this.status.pendingDocs = Math.max(
        this.pendingChangesFromCloud(cloudStatus),
        this.pendingChangesFromP2P(),
      );

      if (cloudStatus.mode === 'cloud') {
        this.status.lastCloudSync = state.lastSyncTime;
      }

      this.reconcileBlockchainAutoBroadcast();
      this.emitStatus();
    });

    await this.syncManager.start();
    await this.refreshPendingTxs();

    this.txPollTimer = setInterval(() => {
      void this.refreshPendingTxs();
    }, TX_POLL_INTERVAL_MS);

    this.reconcileBlockchainAutoBroadcast();
    this.emitStatus();
  }

  async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    this.started = false;

    if (this.cloudUnsubscribe !== null) {
      this.cloudUnsubscribe();
      this.cloudUnsubscribe = null;
    }

    if (this.txPollTimer !== null) {
      clearInterval(this.txPollTimer);
      this.txPollTimer = null;
    }

    if (this.p2pPollTimer !== null) {
      clearInterval(this.p2pPollTimer);
      this.p2pPollTimer = null;
    }

    this.syncManager.stop();
    this.p2pManager?.disconnect();
    this.p2pManager = null;
    this.status.isPeerConnected = false;
    this.status.pendingDocs = this.pendingChangesFromCloud(this.syncManager.getState().status);
    await this.stopBlockchainAutoBroadcast();

    this.status.mode = resolveMode(this.status);
    this.emitStatus();
  }

  setOnline(online: boolean): void {
    this.status.isOnline = online;

    void this.refreshPendingTxs();
    this.reconcileBlockchainAutoBroadcast();
    this.emitStatus();
  }

  connectPeer(peer: RTCDataChannel): void {
    void this.ensureP2PManager().then((manager) => {
      manager.connect(peer);
      this.startP2PPolling();
      this.status.isPeerConnected = true;

      const p2pStatus = manager.getStatus();
      this.status.pendingDocs = Math.max(
        this.pendingChangesFromCloud(this.syncManager.getState().status),
        p2pStatus.pendingChanges,
      );
      this.status.lastP2PSync = toTimestamp(p2pStatus.lastSynced);
      this.status.mode = resolveMode(this.status);
      this.emitStatus();
    });
  }

  disconnectPeer(): void {
    this.p2pManager?.disconnect();
    this.status.isPeerConnected = false;
    if (this.p2pPollTimer !== null) {
      clearInterval(this.p2pPollTimer);
      this.p2pPollTimer = null;
    }
    this.status.pendingDocs = this.pendingChangesFromCloud(this.syncManager.getState().status);
    this.status.mode = resolveMode(this.status);
    this.emitStatus();
  }

  onStatusChange(cb: (status: OrchestratorStatus) => void): () => void {
    this.listeners.push(cb);
    cb(this.getStatus());

    return () => {
      const idx = this.listeners.indexOf(cb);
      if (idx >= 0) {
        this.listeners.splice(idx, 1);
      }
    };
  }

  getStatus(): OrchestratorStatus {
    return {
      mode: this.status.mode,
      isOnline: this.status.isOnline,
      isPeerConnected: this.status.isPeerConnected,
      lastCloudSync: this.status.lastCloudSync,
      lastP2PSync: this.status.lastP2PSync,
      pendingDocs: this.status.pendingDocs,
      pendingTxs: this.status.pendingTxs,
    };
  }

  private pendingChangesFromCloud(status: SyncStatus): number {
    return status.pendingChanges;
  }

  private pendingChangesFromP2P(): number {
    if (this.p2pManager === null) {
      return 0;
    }

    const p2pStatus = this.p2pManager.getStatus();
    this.status.lastP2PSync = toTimestamp(p2pStatus.lastSynced);
    return p2pStatus.pendingChanges;
  }

  private startP2PPolling(): void {
    if (this.p2pPollTimer !== null) {
      return;
    }

    this.p2pPollTimer = setInterval(() => {
      const pending = this.pendingChangesFromP2P();
      this.status.pendingDocs = Math.max(
        this.pendingChangesFromCloud(this.syncManager.getState().status),
        pending,
      );
      this.emitStatus();
    }, P2P_POLL_INTERVAL_MS);
  }

  private async refreshPendingTxs(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    const adapter = this.config.blockchain;
    if (adapter === undefined) {
      this.status.pendingTxs = 0;
      this.reconcileBlockchainAutoBroadcast();
      this.emitStatus();
      return;
    }

    this.status.pendingTxs = await adapter.getPendingTxCount();

    if (this.status.isOnline && this.status.pendingTxs > 0) {
      await adapter.broadcastPendingTransactions(this.config.besuRpcUrl);
      this.status.pendingTxs = await adapter.getPendingTxCount();
    }

    this.reconcileBlockchainAutoBroadcast();
    this.emitStatus();
  }

  private async stopBlockchainAutoBroadcast(): Promise<void> {
    if (!this.autoBroadcastRunning || this.config.blockchain === undefined) {
      return;
    }

    this.config.blockchain.stopAutoBroadcast();
    this.autoBroadcastRunning = false;
  }

  private reconcileBlockchainAutoBroadcast(): void {
    const shouldRun = this.status.isOnline && this.status.pendingTxs > 0;
    const adapter = this.config.blockchain;

    if (adapter === undefined) {
      this.autoBroadcastRunning = false;
      return;
    }

    if (shouldRun && !this.autoBroadcastRunning) {
      adapter.startAutoBroadcast(this.config.besuRpcUrl);
      this.autoBroadcastRunning = true;
      this.emitStatus();
      return;
    }

    if (!shouldRun && this.autoBroadcastRunning) {
      void this.stopBlockchainAutoBroadcast().then(() => {
        this.emitStatus();
      });
    }
  }

  private async ensureP2PManager(): Promise<P2PManagerLike> {
    if (this.p2pManager !== null) {
      return this.p2pManager;
    }

    if (this.config.createP2PManager === undefined) {
      throw new Error('P2P manager factory is not configured');
    }

    this.p2pManager = await this.config.createP2PManager();
    return this.p2pManager;
  }

  private emitStatus(): void {
    this.status.mode = resolveMode(this.status);
    const snapshot = this.getStatus();

    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
