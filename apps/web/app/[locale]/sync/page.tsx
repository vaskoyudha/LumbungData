'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader, Button, Card } from '@repo/ui';
import { PeerConnectionCard } from '@/src/components/PeerConnectionCard';

type SyncRole = 'idle' | 'initiator' | 'joiner';
type SyncStep = 'choose' | 'offer-created' | 'waiting-answer' | 'connected' | 'error';

interface SyncHistoryEntry {
  date: string;
  mode: 'cloud' | 'p2p';
  docsCount: number;
}

const MOCK_SYNC_HISTORY: SyncHistoryEntry[] = [
  { date: '2026-03-20T14:30:00Z', mode: 'cloud', docsCount: 12 },
  { date: '2026-03-19T09:15:00Z', mode: 'p2p', docsCount: 5 },
  { date: '2026-03-18T16:45:00Z', mode: 'cloud', docsCount: 8 },
];

export default function SyncPage() {
  const t = useTranslations('sync');
  const tStatus = useTranslations('syncStatus');
  const router = useRouter();
  const params = useParams();
  const locale = typeof params.locale === 'string' ? params.locale : 'id';

  const [role, setRole] = useState<SyncRole>('idle');
  const [step, setStep] = useState<SyncStep>('choose');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [offerData, setOfferData] = useState<string>('');
  const [answerInput, setAnswerInput] = useState<string>('');
  const [offerInput, setOfferInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);

  const handleStartSync = async (): Promise<void> => {
    setRole('initiator');
    setLoading(true);
    setStep('offer-created');

    try {
      const { createOffer, generateQRCode } = await import('@repo/p2p');
      const compressed = await createOffer();
      setOfferData(compressed);
      const dataUrl = await generateQRCode(compressed);
      setQrDataUrl(dataUrl);
      setStep('waiting-answer');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWithAnswer = async (): Promise<void> => {
    if (!answerInput.trim()) return;
    setLoading(true);

    try {
      const { completeConnection } = await import('@repo/p2p');
      await completeConnection(answerInput.trim());
      setStep('connected');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSync = (): void => {
    setRole('joiner');
    setStep('offer-created');
  };

  const handleCreateAnswer = async (): Promise<void> => {
    if (!offerInput.trim()) return;
    setLoading(true);

    try {
      const { createAnswer, generateQRCode } = await import('@repo/p2p');
      const compressed = await createAnswer(offerInput.trim());
      const dataUrl = await generateQRCode(compressed);
      setQrDataUrl(dataUrl);
      setOfferData(compressed);
      setStep('connected');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCloudSync = async (): Promise<void> => {
    setCloudSyncing(true);
    try {
      const { startSync } = await import('@repo/db');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      await startSync('lumbung-farmers', apiUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
    } finally {
      setCloudSyncing(false);
    }
  };

  const handleReset = (): void => {
    setRole('idle');
    setStep('choose');
    setQrDataUrl('');
    setOfferData('');
    setAnswerInput('');
    setOfferInput('');
    setErrorMessage('');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      <PageHeader
        title={t('title')}
        showBack
        onBack={() => router.push(`/${locale}`)}
      />
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Button
          onClick={() => void handleCloudSync()}
          loading={cloudSyncing}
          disabled={cloudSyncing}
        >
          {tStatus('syncNow')}
        </Button>

        <PeerConnectionCard isConnected={step === 'connected'} />

        {step === 'choose' && (
          <Card title={t('step1')}>
            <div className="flex flex-col gap-3">
              <Button onClick={() => void handleStartSync()}>
                {t('startSync')}
              </Button>
              <Button variant="secondary" onClick={handleJoinSync}>
                {t('joinSync')}
              </Button>
            </div>
          </Card>
        )}

        {role === 'initiator' && step === 'waiting-answer' && (
          <Card title={t('step2')}>
            <div className="flex flex-col items-center gap-4">
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="Offer QR Code"
                  className="w-64 h-64 border border-stone-200 rounded"
                />
              )}
              <p className="text-sm text-stone-500 text-center break-all">
                {offerData.slice(0, 60)}...
              </p>
              <p className="text-sm text-stone-600">{t('waitingForAnswer')}</p>
              <textarea
                className="w-full border border-stone-300 rounded p-2 text-sm font-mono"
                rows={3}
                placeholder={t('pasteAnswer')}
                value={answerInput}
                onChange={(e) => setAnswerInput(e.target.value)}
              />
              <Button
                onClick={() => void handleCompleteWithAnswer()}
                disabled={loading || !answerInput.trim()}
              >
                {loading ? t('generating') : t('connectionComplete')}
              </Button>
            </div>
          </Card>
        )}

        {role === 'joiner' && step === 'offer-created' && (
          <Card title={t('scanPrompt')}>
            <div className="flex flex-col gap-4">
              <div className="bg-stone-100 rounded-lg p-8 flex items-center justify-center min-h-[200px]">
                <p className="text-stone-400 text-sm">{t('scannerPlaceholder')}</p>
              </div>
              <textarea
                className="w-full border border-stone-300 rounded p-2 text-sm font-mono"
                rows={3}
                placeholder={t('pasteOffer')}
                value={offerInput}
                onChange={(e) => setOfferInput(e.target.value)}
              />
              <Button
                onClick={() => void handleCreateAnswer()}
                disabled={loading || !offerInput.trim()}
              >
                {loading ? t('generating') : t('answerGenerated')}
              </Button>
            </div>
          </Card>
        )}

        {role === 'joiner' && step === 'connected' && qrDataUrl && (
          <Card title={t('answerGenerated')}>
            <div className="flex flex-col items-center gap-4">
              <img
                src={qrDataUrl}
                alt="Answer QR Code"
                className="w-64 h-64 border border-stone-200 rounded"
              />
              <p className="text-sm text-stone-500 text-center break-all">
                {offerData.slice(0, 60)}...
              </p>
            </div>
          </Card>
        )}

        {step === 'connected' && role === 'initiator' && (
          <Card title={t('connected')}>
            <p className="text-green-600 text-center font-medium">
              ✓ {t('connected')}
            </p>
          </Card>
        )}

        {step === 'error' && (
          <Card title={t('error')}>
            <div className="flex flex-col gap-3">
              <p className="text-red-600 text-sm">{errorMessage}</p>
              <Button variant="secondary" onClick={handleReset}>
                {t('startSync')}
              </Button>
            </div>
          </Card>
        )}

        {loading && step === 'offer-created' && (
          <div className="flex items-center justify-center py-8">
            <p className="text-stone-500">{t('generating')}</p>
          </div>
        )}

        <div className="pt-4">
          <h2 className="text-lg font-semibold text-stone-800 mb-3">
            {tStatus('historyTitle')}
          </h2>
          <div className="space-y-2">
            {MOCK_SYNC_HISTORY.map((entry) => (
              <div
                key={entry.date}
                className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${
                      entry.mode === 'cloud' ? 'bg-green-500' : 'bg-blue-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-stone-700">
                      {entry.mode === 'cloud'
                        ? tStatus('modeCloud')
                        : tStatus('modeP2P')}
                    </p>
                    <p className="text-xs text-stone-400">
                      {new Date(entry.date).toLocaleDateString(locale, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-stone-500">
                  {tStatus('docsCount', { count: entry.docsCount })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
