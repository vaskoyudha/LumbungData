'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, Card, Button, EmptyState } from '@repo/ui';
import type { MarketPrice } from '@repo/shared';

export default function MarketListPage() {
  const t = useTranslations('forms.market');
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'id';

  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = await import('@repo/db');
        const data = await db.listMarketPrices();
        if (!cancelled) setPrices(data);
      } catch (err: unknown) {
        console.error('Failed to load market prices:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  function formatPrice(value: number): string {
    return new Intl.NumberFormat('id-ID').format(value);
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <PageHeader
        title={t('title')}
        showBack
        onBack={() => router.push(`/${locale}`)}
        action={
          <Button variant="secondary" onClick={() => router.push(`/${locale}/market/new`)}>
            {t('addNew')}
          </Button>
        }
      />
      <div className="max-w-lg mx-auto p-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <p className="text-stone-500">...</p>
          </div>
        )}
        {!loading && prices.length === 0 && (
          <EmptyState
            title={t('empty')}
            description={t('emptyDescription')}
            action={
              <Button onClick={() => router.push(`/${locale}/market/new`)}>
                {t('addNew')}
              </Button>
            }
          />
        )}
        {!loading && prices.length > 0 && (
          <div className="space-y-3">
            {prices.map((price) => (
              <Card key={price.id} title={price.cropType} value={`Rp ${formatPrice(price.pricePerKg)}`} unit="/kg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span>{t('qualityGrade')}: {price.qualityGrade}</span>
                  <span>{t('location')}: {price.location}</span>
                  <span className="col-span-2 text-stone-400 text-xs">
                    {new Date(price.reportedAt).toLocaleDateString(locale)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
