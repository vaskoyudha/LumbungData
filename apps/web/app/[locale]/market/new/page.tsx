'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, Input, NumberInput, Select, Button, Toast } from '@repo/ui';

const PROFILE_STORAGE_KEY = 'lumbung_farmer_id';

const CROP_OPTIONS = [
  { value: 'Padi', label: 'Padi' },
  { value: 'Jagung', label: 'Jagung' },
  { value: 'Kedelai', label: 'Kedelai' },
  { value: 'Singkong', label: 'Singkong' },
  { value: 'Kelapa Sawit', label: 'Kelapa Sawit' },
];

const GRADE_OPTIONS = [
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
];

export default function MarketNewPage() {
  const t = useTranslations('forms.market');
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'id';

  const [cropType, setCropType] = useState('Padi');
  const [pricePerKg, setPricePerKg] = useState(0);
  const [qualityGrade, setQualityGrade] = useState<'A' | 'B' | 'C'>('A');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [errors, setErrors] = useState<{ location?: string; price?: string }>({});

  function validate(): boolean {
    const newErrors: { location?: string; price?: string } = {};
    if (!location.trim()) {
      newErrors.location = t('locationRequired');
    }
    if (pricePerKg <= 0) {
      newErrors.price = t('priceRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    setSaving(true);
    try {
      const reportedBy = localStorage.getItem(PROFILE_STORAGE_KEY) ?? 'anonymous';

      const { createMarketPrice } = await import('@repo/db');
      await createMarketPrice({
        cropType,
        pricePerKg,
        currency: 'IDR',
        location: location.trim(),
        qualityGrade,
        reportedBy,
        reportedAt: new Date().toISOString(),
      });
      setShowToast(true);
      setTimeout(() => {
        router.push(`/${locale}/market`);
      }, 1500);
    } catch (err: unknown) {
      console.error('Failed to save market price:', err);
    } finally {
      setSaving(false);
    }
  }

  function handleGradeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === 'A' || val === 'B' || val === 'C') {
      setQualityGrade(val);
    }
  }

  const handleDismissToast = useCallback(() => {
    setShowToast(false);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      <PageHeader
        title={t('addNew')}
        showBack
        onBack={() => router.push(`/${locale}/market`)}
      />
      <div className="max-w-lg mx-auto p-4 space-y-2">
        <Select
          label={t('cropType')}
          id="market-crop"
          value={cropType}
          onChange={(e) => setCropType(e.target.value)}
          options={CROP_OPTIONS}
          required
        />
        <NumberInput
          label={t('pricePerKg')}
          id="market-price"
          value={pricePerKg}
          onChange={setPricePerKg}
          min={0}
          step={500}
          unit="IDR"
          error={errors.price}
        />
        <Select
          label={t('qualityGrade')}
          id="market-grade"
          value={qualityGrade}
          onChange={handleGradeChange}
          options={GRADE_OPTIONS}
          required
        />
        <Input
          label={t('location')}
          id="market-location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          error={errors.location}
        />
        <div className="pt-4">
          <Button type="button" onClick={handleSave} loading={saving} disabled={saving}>
            {t('save')}
          </Button>
        </div>
      </div>
      {showToast && (
        <Toast message={t('saved')} type="success" onDismiss={handleDismissToast} />
      )}
    </div>
  );
}
