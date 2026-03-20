import type { ReactNode } from 'react';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/src/i18n/routing';

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

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}
