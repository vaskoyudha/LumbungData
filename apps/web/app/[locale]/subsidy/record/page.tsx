'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, Input, NumberInput, Select, Button, Toast } from '@repo/ui';

const PROFILE_STORAGE_KEY = 'lumbung_farmer_id';
const WALLET_ADDRESS_KEY = 'lumbung_wallet_address';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? '0x0000000000000000000000000000000000000000';
const RPC_URL = process.env.NEXT_PUBLIC_BESU_RPC_URL ?? 'http://localhost:8545';

void RPC_URL;

export default function SubsidyRecordPage() {
  const t = useTranslations('subsidy');
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'id';

  const farmerId = typeof window !== 'undefined'
    ? localStorage.getItem(PROFILE_STORAGE_KEY) ?? ''
    : '';

  const [itemType, setItemType] = useState<'seed' | 'fertilizer'>('seed');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [unit, setUnit] = useState('kg');
  const [distributorId, setDistributorId] = useState('');
  const [pin, setPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState(false);

  const handleDismissToast = useCallback(() => {
    setShowToast(false);
  }, []);

  function showFeedback(message: string, type: 'success' | 'error') {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  }

  async function handleSubmit() {
    if (!itemName.trim() || quantity <= 0 || !pin.trim()) return;

    setSaving(true);
    try {
      const walletAddress = localStorage.getItem(WALLET_ADDRESS_KEY);
      if (!walletAddress) {
        showFeedback(t('errorNoWallet'), 'error');
        setSaving(false);
        return;
      }

      const { loadStoredWallet } = await import('@repo/blockchain');
      const walletInfo = await loadStoredWallet(walletAddress);
      if (!walletInfo) {
        showFeedback(t('errorNoWallet'), 'error');
        setSaving(false);
        return;
      }

      const { signDistributionTx } = await import('@repo/blockchain');
      const signingResult = await signDistributionTx(
        { encryptedKey: walletInfo.encryptedKey, pin },
        CONTRACT_ADDRESS,
        farmerId,
        itemType,
        itemName.trim(),
        quantity,
        unit,
      );

      const { queueTransaction } = await import('@repo/blockchain');
      await queueTransaction(signingResult.signedTx, signingResult.nonce, farmerId);

      const { createDistribution } = await import('@repo/db');
      await createDistribution({
        farmerId,
        itemType,
        itemName: itemName.trim(),
        quantity,
        unit,
        distributorId: distributorId.trim() || 'distributor-001',
        signature: signingResult.signedTx.slice(0, 66),
        timestamp: new Date().toISOString(),
      });

      showFeedback(t('successMessage'), 'success');
      setTimeout(() => {
        router.push(`/${locale}/subsidy`);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('incorrect') || message.includes('password') || message.includes('invalid')) {
        showFeedback(t('errorWrongPin'), 'error');
      } else {
        showFeedback(t('errorSigningFailed'), 'error');
      }
    } finally {
      setSaving(false);
    }
  }

  const itemTypeOptions = [
    { value: 'seed', label: t('itemTypeSeed') },
    { value: 'fertilizer', label: t('itemTypeFertilizer') },
  ];

  const unitOptions = [
    { value: 'kg', label: t('unitKg') },
    { value: 'bag', label: t('unitBag') },
    { value: 'liter', label: t('unitLiter') },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <PageHeader
        title={t('recordDistribution')}
        showBack
        onBack={() => router.push(`/${locale}/subsidy`)}
      />
      <div className="max-w-lg mx-auto p-4 space-y-2">
        <Input
          label={t('farmerId')}
          id="farmer-id"
          value={farmerId}
          onChange={() => undefined}
          disabled
        />
        <Select
          label={t('itemType')}
          id="item-type"
          value={itemType}
          onChange={(e) => setItemType(e.target.value as 'seed' | 'fertilizer')}
          options={itemTypeOptions}
        />
        <Input
          label={t('itemName')}
          id="item-name"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          required
        />
        <NumberInput
          label={t('quantity')}
          id="quantity"
          value={quantity}
          onChange={setQuantity}
          min={0}
          step={1}
        />
        <Select
          label={t('unit')}
          id="unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          options={unitOptions}
        />
        <Input
          label={t('distributorId')}
          id="distributor-id"
          value={distributorId}
          onChange={(e) => setDistributorId(e.target.value)}
        />
        <div className="flex flex-col mb-4">
          <label htmlFor="pin" className="text-sm font-medium text-stone-700 mb-1">
            {t('pin')}
          </label>
          <input
            type="password"
            id="pin"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder={t('pinPlaceholder')}
            className="min-h-12 w-full px-4 py-3 text-base border border-stone-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-green-700 transition-colors"
          />
        </div>
        <div className="pt-4">
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            loading={saving}
            disabled={saving || !itemName.trim() || quantity <= 0 || !pin.trim()}
          >
            {t('submit')}
          </Button>
        </div>
      </div>
      {showToast && (
        <Toast message={toastMessage} type={toastType} onDismiss={handleDismissToast} />
      )}
    </div>
  );
}
