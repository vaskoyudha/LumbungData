'use client';

import { useTranslations } from 'next-intl';
import { useSyncStatus } from '@/src/providers/SyncProvider';

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return '< 1 menit';
  if (diffMinutes < 60) return `${String(diffMinutes)} menit lalu`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${String(diffHours)} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  return `${String(diffDays)} hari lalu`;
}

interface StatusConfig {
  bgClass: string;
  textClass: string;
  labelKey: string;
}

function getStatusConfig(
  mode: 'local' | 'p2p' | 'cloud' | 'blockchain',
  isOnline: boolean,
): StatusConfig {
  if (!isOnline) {
    return {
      bgClass: 'bg-stone-400',
      textClass: 'text-white',
      labelKey: 'offline',
    };
  }

  switch (mode) {
    case 'local':
      return {
        bgClass: 'bg-yellow-500',
        textClass: 'text-yellow-950',
        labelKey: 'readyToSync',
      };
    case 'cloud':
      return {
        bgClass: 'bg-green-600',
        textClass: 'text-white',
        labelKey: 'syncingCloud',
      };
    case 'p2p':
      return {
        bgClass: 'bg-blue-600',
        textClass: 'text-white',
        labelKey: 'syncingP2P',
      };
    case 'blockchain':
      return {
        bgClass: 'bg-purple-600',
        textClass: 'text-white',
        labelKey: 'syncingBlockchain',
      };
  }
}

export function SyncStatusBar() {
  const t = useTranslations('syncStatus');
  const { status } = useSyncStatus();
  const lastSynced = status.lastCloudSync ?? status.lastP2PSync;

  const config = getStatusConfig(status.mode, status.isOnline);

  return (
    <div
      data-testid="sync-status-bar"
      className={`fixed bottom-0 left-0 right-0 z-40 ${config.bgClass} ${config.textClass} px-4 shadow-[0_-2px_8px_rgba(0,0,0,0.1)]`}
      style={{ minHeight: '48px' }}
    >
      <div className="flex items-center justify-between min-h-[48px] max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{t(config.labelKey)}</span>
          {status.pendingDocs > 0 && (
            <span className="text-xs opacity-80">
              ({t('pendingChanges', { count: status.pendingDocs })})
            </span>
          )}
        </div>
        <span className="text-xs opacity-80" suppressHydrationWarning>
          {lastSynced !== null ? t('lastSynced', { time: formatRelativeTime(lastSynced) }) : null}
        </span>
      </div>
    </div>
  );
}
