import { broadcastPendingTransactions } from './broadcaster.js';

let onlineHandler: (() => void) | null = null;

export function startAutoBroadcast(rpcUrl: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  stopAutoBroadcast();

  onlineHandler = () => {
    void broadcastPendingTransactions(rpcUrl);
  };

  window.addEventListener('online', onlineHandler);
}

export function stopAutoBroadcast(): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (onlineHandler !== null) {
    window.removeEventListener('online', onlineHandler);
    onlineHandler = null;
  }
}
