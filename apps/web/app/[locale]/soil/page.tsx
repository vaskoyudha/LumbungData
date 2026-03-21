'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, Card, Button, EmptyState } from '@repo/ui';
import type { SoilReading } from '@repo/shared';

const PROFILE_STORAGE_KEY = 'lumbung_farmer_id';

export default function SoilListPage() {
  const t = useTranslations('forms.soil');
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'id';

  const [readings, setReadings] = useState<SoilReading[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReadings = useCallback(async () => {
    try {
      const farmerId = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (farmerId) {
        const { listSoilReadings } = await import('@repo/db');
        const data = await listSoilReadings(farmerId);
        setReadings(data);
      }
    } catch (err: unknown) {
      console.error('Failed to load soil readings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReadings();
  }, [loadReadings]);

  return (
    <div className="min-h-screen bg-stone-50">
      <PageHeader
        title={t('title')}
        showBack
        onBack={() => router.push(`/${locale}`)}
        action={
          <Button variant="secondary" onClick={() => router.push(`/${locale}/soil/new`)}>
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
        {!loading && readings.length === 0 && (
          <EmptyState
            title={t('empty')}
            description={t('emptyDescription')}
            action={
              <Button onClick={() => router.push(`/${locale}/soil/new`)}>
                {t('addNew')}
              </Button>
            }
          />
        )}
        {!loading && readings.length > 0 && (
          <div className="space-y-3">
            {readings.map((reading) => (
              <Card key={reading.id} title={`pH ${reading.pH}`}>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span>N: {reading.nitrogen} mg/kg</span>
                  <span>P: {reading.phosphorus} mg/kg</span>
                  <span>K: {reading.potassium} mg/kg</span>
                  <span>{t('moisture')}: {reading.moisture}%</span>
                  <span className="col-span-2">{t('location')}: {reading.location}</span>
                  <span className="col-span-2 text-stone-400 text-xs">
                    {new Date(reading.recordedAt).toLocaleDateString(locale)}
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
