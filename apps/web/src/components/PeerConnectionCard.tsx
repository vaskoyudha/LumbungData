'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@repo/ui';

interface PeerConnectionCardProps {
  isConnected: boolean;
}

export function PeerConnectionCard({ isConnected }: PeerConnectionCardProps) {
  const t = useTranslations('syncStatus');

  if (!isConnected) {
    return null;
  }

  return (
    <Card title={t('peerConnected')}>
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-green-500" />
        </span>
        <span className="text-sm text-stone-600">{t('readyToExchange')}</span>
      </div>
    </Card>
  );
}
