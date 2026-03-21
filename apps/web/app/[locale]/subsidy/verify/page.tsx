'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, Card, Button, Input, EmptyState } from '@repo/ui';
import type { SubsidyDistribution } from '@repo/shared';

interface PendingTxInfo {
  id: string;
  farmerId: string;
  status: 'pending' | 'broadcast' | 'confirmed' | 'failed';
  txHash?: string;
}

type TxStatus = 'pending' | 'broadcast' | 'confirmed' | 'failed' | 'local';

function TxStatusBadge({ status, label }: { status: TxStatus; label: string }) {
  const colors: Record<TxStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    broadcast: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-800',
    local: 'bg-stone-100 text-stone-600',
  };

  const dotColors: Record<TxStatus, string> = {
    pending: 'bg-amber-500',
    broadcast: 'bg-blue-500',
    confirmed: 'bg-green-500',
    failed: 'bg-red-500',
    local: 'bg-stone-400',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColors[status]}`} />
      {label}
    </span>
  );
}

function getItemIcon(itemType: string): string {
  return itemType === 'seed' ? '🌱' : '🧴';
}

export default function SubsidyVerifyPage() {
  const t = useTranslations('subsidy');
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'id';

  const [isOnline, setIsOnline] = useState(false);
  const [farmerInput, setFarmerInput] = useState('');
  const [distributions, setDistributions] = useState<SubsidyDistribution[]>([]);
  const [pendingTxMap, setPendingTxMap] = useState<Map<string, PendingTxInfo>>(new Map());
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    function handleOnline() { setIsOnline(true); }
    function handleOffline() { setIsOnline(false); }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadDistributions = useCallback(async (farmerId: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const { listDistributions } = await import('@repo/db');
      const data = await listDistributions(farmerId);
      setDistributions(data);

      try {
        const { getPendingTransactions } = await import('@repo/blockchain');
        const pendingTxs = await getPendingTransactions();
        const txMap = new Map<string, PendingTxInfo>();
        for (const tx of pendingTxs) {
          if (tx.farmerId === farmerId) {
            txMap.set(tx.id, tx);
          }
        }
        setPendingTxMap(txMap);
      } catch {
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  function resolveStatus(dist: SubsidyDistribution): TxStatus {
    if (dist.txHash != null) {
      for (const tx of pendingTxMap.values()) {
        if (tx.txHash === dist.txHash) {
          return tx.status;
        }
      }
      return 'confirmed';
    }
    for (const tx of pendingTxMap.values()) {
      if (tx.farmerId === dist.farmerId) {
        return tx.status;
      }
    }
    return 'local';
  }

  function getStatusLabel(status: TxStatus): string {
    const labels: Record<TxStatus, string> = {
      pending: t('statusPending'),
      broadcast: t('statusBroadcast'),
      confirmed: t('statusConfirmed'),
      failed: t('statusFailed'),
      local: t('statusPending'),
    };
    return labels[status];
  }

  function handleLoad() {
    if (farmerInput.trim()) {
      void loadDistributions(farmerInput.trim());
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <PageHeader
        title={t('verifyTitle')}
        showBack
        onBack={() => router.push(`/${locale}/subsidy`)}
      />
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {!isOnline && (
          <Card title={t('verifyTitle')}>
            <p className="text-stone-500 text-sm">{t('verifyOffline')}</p>
          </Card>
        )}

        {isOnline && (
          <>
            <Card title={t('verifyOnline')}>
              <div className="flex flex-col gap-3">
                <Input
                  label={t('verifyFarmerInput')}
                  id="farmer-address"
                  value={farmerInput}
                  onChange={(e) => setFarmerInput(e.target.value)}
                />
                <Button
                  onClick={handleLoad}
                  disabled={loading || !farmerInput.trim()}
                  loading={loading}
                >
                  {t('verifyLoad')}
                </Button>
              </div>
            </Card>

            {searched && !loading && distributions.length === 0 && (
              <EmptyState
                title={t('noDistributions')}
                description=""
              />
            )}

            {distributions.length > 0 && (
              <div className="space-y-3">
                {distributions.map((dist) => {
                  const status = resolveStatus(dist);
                  return (
                    <Card
                      key={dist.id}
                      title={`${getItemIcon(dist.itemType)} ${dist.itemName}`}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-stone-600">
                            {dist.quantity} {dist.unit}
                          </span>
                          <TxStatusBadge
                            status={status}
                            label={getStatusLabel(status)}
                          />
                        </div>
                        {status === 'confirmed' && (
                          <span className="text-xs font-medium text-green-700">
                            {t('verifiedOnChain')}
                          </span>
                        )}
                        <span className="text-xs text-stone-400">
                          {new Date(dist.timestamp).toLocaleDateString(locale)}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
