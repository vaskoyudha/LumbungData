import type { ReactNode } from 'react';
import { setRequestLocale, getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { routing } from '@/src/i18n/routing';
import { SyncProvider } from '@/src/providers/SyncProvider';
import { OfflineBanner } from '@/src/components/OfflineBanner';
import { SyncStatusBar } from '@/src/components/SyncStatusBar';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <OfflineBanner />
        <SyncProvider>
          <NextIntlClientProvider messages={messages}>
            {children}
            <SyncStatusBar />
          </NextIntlClientProvider>
        </SyncProvider>
      </body>
    </html>
  );
}
