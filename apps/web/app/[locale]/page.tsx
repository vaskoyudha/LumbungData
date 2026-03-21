import { getTranslations } from 'next-intl/server';
import { DashboardContent } from '../../src/components/DashboardContent';

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await getTranslations(); // ensures messages are loaded for the locale
  return <DashboardContent locale={locale} />;
}
