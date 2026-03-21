'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { PageHeader, Input, Button, Toast } from '@repo/ui';
import { useRouter } from 'next/navigation';
import type { FarmerProfile } from '@repo/shared';

const PROFILE_STORAGE_KEY = 'lumbung_farmer_id';

export default function ProfilePage() {
  const t = useTranslations('forms.profile');
  const router = useRouter();

  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [phone, setPhone] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; village?: string }>({});

  const loadProfile = useCallback(async () => {
    try {
      const storedId = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (storedId) {
        const { getFarmerProfile } = await import('@repo/db');
        const profile = await getFarmerProfile(storedId);
        if (profile) {
          setProfileId(profile.id);
          setName(profile.name);
          setVillage(profile.village);
          setPhone(profile.phone);
        }
      } else {
        const { listFarmerProfiles } = await import('@repo/db');
        const profiles = await listFarmerProfiles();
        const first = profiles[0];
        if (first) {
          setProfileId(first.id);
          setName(first.name);
          setVillage(first.village);
          setPhone(first.phone);
          localStorage.setItem(PROFILE_STORAGE_KEY, first.id);
        }
      }
    } catch (err: unknown) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  function validate(): boolean {
    const newErrors: { name?: string; village?: string } = {};
    if (!name.trim()) {
      newErrors.name = t('nameRequired');
    }
    if (!village.trim()) {
      newErrors.village = t('villageRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    setSaving(true);
    try {
      if (profileId) {
        const { updateFarmerProfile } = await import('@repo/db');
        await updateFarmerProfile(profileId, {
          name: name.trim(),
          village: village.trim(),
          phone: phone.trim(),
        });
      } else {
        const { createFarmerProfile } = await import('@repo/db');
        const created = await createFarmerProfile({
          name: name.trim(),
          village: village.trim(),
          phone: phone.trim(),
          createdAt: new Date().toISOString(),
        });
        setProfileId(created.id);
        localStorage.setItem(PROFILE_STORAGE_KEY, created.id);
      }
      setShowToast(true);
    } catch (err: unknown) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  }

  const handleDismissToast = useCallback(() => {
    setShowToast(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <PageHeader title={t('title')} showBack onBack={() => router.back()} />
        <div className="flex items-center justify-center py-12">
          <p className="text-stone-500">{t('save')}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <PageHeader title={t('title')} showBack onBack={() => router.back()} />
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Input
          label={t('name')}
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          error={errors.name}
        />
        <Input
          label={t('village')}
          id="profile-village"
          value={village}
          onChange={(e) => setVillage(e.target.value)}
          required
          error={errors.village}
        />
        <Input
          label={t('phone')}
          id="profile-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
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
