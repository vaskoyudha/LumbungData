'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useSyncStatus } from '../providers/SyncProvider';
import { useStorageQuota } from '../hooks/useStorageQuota';
import { DashboardCard } from './DashboardCard';
import { QuickActionGrid } from './QuickActionGrid';

interface DashboardContentProps {
  locale: string;
}

export function DashboardContent({ locale }: DashboardContentProps) {
  const t = useTranslations();
  const { status } = useSyncStatus();
  const { percentage: storagePercent } = useStorageQuota();
  const [farmerName, setFarmerName] = useState<string>('');
  const [soilCount, setSoilCount] = useState<number>(0);
  const [marketCount, setMarketCount] = useState<number>(0);
  const [subsidyCount, setSubsidyCount] = useState<number>(0);

  useEffect(() => {
    const farmerId = localStorage.getItem('lumbung_farmer_id');
    if (farmerId) {
      import('@repo/db').then(({ getFarmerProfile }) => {
        getFarmerProfile(farmerId).then((profile) => {
          if (profile) setFarmerName(profile.name);
        }).catch(() => {/* ignore */});
      }).catch(() => {/* ignore */});
    }
  }, []);

  useEffect(() => {
    const farmerId = localStorage.getItem('lumbung_farmer_id') ?? '';
    import('@repo/db').then(({ listSoilReadings, listMarketPrices, listDistributions }) => {
      Promise.all([
        listSoilReadings(farmerId),
        listMarketPrices(),
        listDistributions(farmerId),
      ]).then(([soil, market, subsidy]) => {
        setSoilCount(soil.length);
        setMarketCount(market.length);
        setSubsidyCount(subsidy.filter((d) => !d.txHash).length);
      }).catch(() => {/* ignore */});
    }).catch(() => {/* ignore */});
  }, []);

  const syncModeLabel = status.isOnline
    ? (status.isPeerConnected ? t('syncStatus.syncingP2P') : t('syncStatus.readyToSync'))
    : t('syncStatus.offline');

  const lastSyncDisplay = status.lastCloudSync
    ? new Date(status.lastCloudSync).toLocaleTimeString()
    : t('dashboard.never');

  const actions = [
    { icon: '🌱', label: t('dashboard.recordSoil'), href: `/${locale}/soil/new`, 'data-testid': 'quick-action' },
    { icon: '💰', label: t('dashboard.checkPrices'), href: `/${locale}/market`, 'data-testid': 'quick-action' },
    { icon: '🔄', label: t('dashboard.sync'), href: `/${locale}/sync`, 'data-testid': 'quick-action' },
    { icon: '📋', label: t('dashboard.subsidy'), href: `/${locale}/subsidy`, 'data-testid': 'quick-action' },
  ];

  return (
    <main className="flex min-h-screen flex-col bg-white px-4 py-6">
      <div className="w-full max-w-lg mx-auto space-y-6">
        {/* Welcome header */}
        <div>
          <h1 className="text-2xl font-bold text-green-700">
            {farmerName
              ? t('dashboard.welcome', { name: farmerName })
              : t('app.name')}
          </h1>
          <p className="text-sm text-stone-500 mt-1">{syncModeLabel}</p>
        </div>

        {/* Sync status strip */}
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-stone-600">
            {t('dashboard.lastSync')}: {lastSyncDisplay}
          </span>
          {status.pendingDocs > 0 && (
            <span className="text-xs text-amber-600 font-medium">
              {t('dashboard.pendingChanges', { count: status.pendingDocs })}
            </span>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <DashboardCard
            icon="🌾"
            value={soilCount}
            label={t('dashboard.soilReadings')}
            data-testid="soil-count"
          />
          <DashboardCard icon="📈" value={marketCount} label={t('dashboard.marketPrices')} />
          <DashboardCard icon="📦" value={subsidyCount} label={t('dashboard.subsidyPending')} />
          <DashboardCard
            icon="💾"
            value={`${storagePercent ?? 0}%`}
            label={t('dashboard.storage')}
          />
        </div>

        {/* Quick actions */}
        <QuickActionGrid actions={actions} />
      </div>
    </main>
  );
}