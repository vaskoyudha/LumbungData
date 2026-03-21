'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { OrchestratorStatus, SyncOrchestrator } from '@repo/db';

import { useOnlineStatus } from '@/src/hooks/useOnlineStatus';

type SyncContextValue = {
  status: OrchestratorStatus;
  connectPeer: (channel: RTCDataChannel) => void;
  disconnectPeer: () => void;
};

const SyncContext = createContext<SyncContextValue>({
  status: {
    mode: 'local',
    isOnline: false,
    isPeerConnected: false,
    lastCloudSync: null,
    lastP2PSync: null,
    pendingDocs: 0,
    pendingTxs: 0,
  },
  connectPeer: () => {
  },
  disconnectPeer: () => {
  },
});

function getInitialStatus(): OrchestratorStatus {
  return {
    mode: 'local',
    isOnline: false,
    isPeerConnected: false,
    lastCloudSync: null,
    lastP2PSync: null,
    pendingDocs: 0,
    pendingTxs: 0,
  };
}

export function useSyncStatus(): SyncContextValue {
  return useContext(SyncContext);
}

interface SyncProviderProps {
  children: ReactNode;
  apiUrl?: string;
  besuRpcUrl?: string;
  contractAddress?: string;
}

export function SyncProvider({
  children,
  apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  besuRpcUrl = process.env.NEXT_PUBLIC_BESU_RPC_URL ?? 'http://localhost:8545',
  contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? '',
}: SyncProviderProps) {
  const [status, setStatus] = useState<OrchestratorStatus>(getInitialStatus);
  const orchestratorRef = useRef<SyncOrchestrator | null>(null);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    async function initOrchestrator() {
      if (typeof window === 'undefined') return;

      const { SyncOrchestrator: SyncOrchestratorClass } = await import('@repo/db');
      if (!mounted) return;

      if (orchestratorRef.current === null) {
        orchestratorRef.current = new SyncOrchestratorClass({
          couchDbUrl: apiUrl,
          besuRpcUrl,
          contractAddress,
          createP2PManager: async () => {
            const [{ P2PSyncManager }, { getDatabase, DB_NAMES }] = await Promise.all([
              import('@repo/p2p'),
              import('@repo/db'),
            ]);

            const localDb = await getDatabase(DB_NAMES.farmers);
            return new P2PSyncManager(localDb);
          },
          blockchain: {
            getPendingTxCount: async () => {
              const { getPendingTransactions } = await import('@repo/blockchain');
              const pending = await getPendingTransactions();
              return pending.length;
            },
            broadcastPendingTransactions: async (rpcUrl) => {
              const { broadcastPendingTransactions } = await import('@repo/blockchain');
              await broadcastPendingTransactions(rpcUrl);
            },
            startAutoBroadcast: (rpcUrl) => {
              void import('@repo/blockchain').then(({ startAutoBroadcast }) => {
                startAutoBroadcast(rpcUrl);
              });
            },
            stopAutoBroadcast: () => {
              void import('@repo/blockchain').then(({ stopAutoBroadcast }) => {
                stopAutoBroadcast();
              });
            },
          },
        });
      }

      const orchestrator = orchestratorRef.current;
      unsubscribe = orchestrator.onStatusChange((nextStatus) => {
        setStatus(nextStatus);
      });

      await orchestrator.start();
    }

    void initOrchestrator();

    return () => {
      mounted = false;
      if (unsubscribe !== null) unsubscribe();
      if (orchestratorRef.current !== null) {
        void orchestratorRef.current.stop();
      }
      orchestratorRef.current = null;
    };
  }, [apiUrl, besuRpcUrl, contractAddress]);

  useEffect(() => {
    orchestratorRef.current?.setOnline(isOnline);
  }, [isOnline]);

  const value: SyncContextValue = {
    status,
    connectPeer: (channel) => {
      orchestratorRef.current?.connectPeer(channel);
    },
    disconnectPeer: () => {
      orchestratorRef.current?.disconnectPeer();
    },
  };

  return <SyncContext value={value}>{children}</SyncContext>;
}
