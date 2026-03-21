'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, Card, Button, EmptyState } from '@repo/ui';
import type { SubsidyDistribution } from '@repo/shared';

const PROFILE_STORAGE_KEY = 'lumbung_farmer_id';

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

export default function SubsidyListPage() {
  const t = useTranslations('subsidy');
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'id';

  const [distributions, setDistributions] = useState<SubsidyDistribution[]>([]);
  const [pendingTxMap, setPendingTxMap] = useState<Map<string, PendingTxInfo>>(new Map());
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const farmerId = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!farmerId) {
        setLoading(false);
        return;
      }

      const { listDistributions } = await import('@repo/db');
      const data = await listDistributions(farmerId);
      setDistributions(data);

      try {
        const { getPendingTransactions } = await import('@repo/blockchain');
        const pendingTxs = await getPendingTransactions();
        const txMap = new Map<string, PendingTxInfo>();
        for (const tx of pendingTxs) {
          txMap.set(tx.farmerId, tx);
        }
        setPendingTxMap(txMap);
      } catch {
      }
    } catch (_err: unknown) {
      void _err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function resolveStatus(dist: SubsidyDistribution): TxStatus {
    if (dist.txHash != null) {
      const pending = pendingTxMap.get(dist.farmerId);
      if (pending?.txHash === dist.txHash) {
        return pending.status;
      }
      return 'confirmed';
    }
    const pending = pendingTxMap.get(dist.farmerId);
    if (pending) {
      return pending.status;
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

  return (
    <div className="min-h-screen bg-stone-50">
      <PageHeader
        title={t('title')}
        showBack
        onBack={() => router.push(`/${locale}`)}
        action={
          <Button
            variant="secondary"
            onClick={() => router.push(`/${locale}/subsidy/record`)}
          >
            {t('recordDistribution')}
          </Button>
        }
      />
      <div className="max-w-lg mx-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-stone-500">...</p>
          </div>
        )}
        {!loading && distributions.length === 0 && (
          <EmptyState
            title={t('empty')}
            description={t('emptyDescription')}
            action={
              <Button onClick={() => router.push(`/${locale}/subsidy/record`)}>
                {t('recordDistribution')}
              </Button>
            }
          />
        )}
        {!loading && distributions.length > 0 && (
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
                    <span className="text-xs text-stone-400">
                      {new Date(dist.timestamp).toLocaleDateString(locale)}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
