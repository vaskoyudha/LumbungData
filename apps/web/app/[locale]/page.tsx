import { getTranslations } from 'next-intl/server';

export default async function HomePage() {
  const t = await getTranslations();

  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-green-600">{t('app.name')}</h1>
        <p className="mt-2 text-gray-600">
          {t('app.tagline')}
        </p>
      </div>
    </main>
  );
}
