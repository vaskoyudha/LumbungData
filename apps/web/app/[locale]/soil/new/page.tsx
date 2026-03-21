'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, Input, NumberInput, Button, Toast } from '@repo/ui';

const PROFILE_STORAGE_KEY = 'lumbung_farmer_id';

export default function SoilNewPage() {
  const t = useTranslations('forms.soil');
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'id';

  const [pH, setPH] = useState(7);
  const [nitrogen, setNitrogen] = useState(0);
  const [phosphorus, setPhosphorus] = useState(0);
  const [potassium, setPotassium] = useState(0);
  const [moisture, setMoisture] = useState(0);
  const [organicMatter, setOrganicMatter] = useState(0);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [errors, setErrors] = useState<{ location?: string; ph?: string }>({});

  function validate(): boolean {
    const newErrors: { location?: string; ph?: string } = {};
    if (!location.trim()) {
      newErrors.location = t('locationRequired');
    }
    if (pH < 0 || pH > 14) {
      newErrors.ph = t('phRange');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    setSaving(true);
    try {
      let farmerId = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (!farmerId) {
        farmerId = crypto.randomUUID();
        localStorage.setItem(PROFILE_STORAGE_KEY, farmerId);
      }

      const { createSoilReading } = await import('@repo/db');
      await createSoilReading({
        farmerId,
        pH,
        nitrogen,
        phosphorus,
        potassium,
        moisture,
        organicMatter,
        location: location.trim(),
        notes: notes.trim(),
        recordedAt: new Date().toISOString(),
      });
      setShowToast(true);
      setTimeout(() => {
        router.push(`/${locale}/soil`);
      }, 1500);
    } catch (err: unknown) {
      console.error('Failed to save soil reading:', err);
    } finally {
      setSaving(false);
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
        onBack={() => router.push(`/${locale}/soil`)}
      />
      <div className="max-w-lg mx-auto p-4 space-y-2">
        <NumberInput
          label={t('ph')}
          id="soil-ph"
          value={pH}
          onChange={setPH}
          min={0}
          max={14}
          step={0.1}
          error={errors.ph}
        />
        <NumberInput
          label={t('nitrogen')}
          id="soil-nitrogen"
          value={nitrogen}
          onChange={setNitrogen}
          min={0}
          step={1}
          unit="mg/kg"
        />
        <NumberInput
          label={t('phosphorus')}
          id="soil-phosphorus"
          value={phosphorus}
          onChange={setPhosphorus}
          min={0}
          step={1}
          unit="mg/kg"
        />
        <NumberInput
          label={t('potassium')}
          id="soil-potassium"
          value={potassium}
          onChange={setPotassium}
          min={0}
          step={1}
          unit="mg/kg"
        />
        <NumberInput
          label={t('moisture')}
          id="soil-moisture"
          value={moisture}
          onChange={setMoisture}
          min={0}
          max={100}
          step={0.1}
          unit="%"
        />
        <NumberInput
          label={t('organicMatter')}
          id="soil-organic"
          value={organicMatter}
          onChange={setOrganicMatter}
          min={0}
          max={100}
          step={0.1}
          unit="%"
        />
        <Input
          label={t('location')}
          id="soil-location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
          error={errors.location}
        />
        <Input
          label={t('notes')}
          id="soil-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
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
