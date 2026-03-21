'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { SyncState } from '@repo/db';

type SyncContextValue = SyncState;

const SyncContext = createContext<SyncContextValue>({
  status: {
    mode: 'local',
    lastSynced: '',
    pendingChanges: 0,
    isOnline: false,
  },
  isOnline: false,
  lastSyncTime: null,
  error: null,
});

export function useSyncStatus(): SyncContextValue {
  return useContext(SyncContext);
}

interface SyncProviderProps {
  children: ReactNode;
  apiUrl?: string;
}

export function SyncProvider({
  children,
  apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
}: SyncProviderProps) {
  const [syncState, setSyncState] = useState<SyncContextValue>({
    status: {
      mode: 'local',
      lastSynced: '',
      pendingChanges: 0,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
    },
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : false,
    lastSyncTime: null,
    error: null,
  });
  const managerRef = useRef<import('@repo/db').SyncManager | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let mounted = true;

    async function initSync() {
      if (typeof window === 'undefined') return;

      const { SyncManager } = await import('@repo/db');
      if (!mounted) return;

      const manager = new SyncManager(apiUrl);
      managerRef.current = manager;

      unsubscribe = manager.subscribe((state) => {
        setSyncState(state);
      });

      await manager.start();
    }

    void initSync();

    return () => {
      mounted = false;
      if (unsubscribe !== null) unsubscribe();
      if (managerRef.current !== null) managerRef.current.stop();
      managerRef.current = null;
    };
  }, [apiUrl]);

  return <SyncContext value={syncState}>{children}</SyncContext>;
}
