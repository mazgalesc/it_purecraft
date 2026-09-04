import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { locales, type Locale } from '@/lib/i18n/config';
import MyFilesClient from './MyFilesClient';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'I miei file · PDFCraft',
  robots: { index: false, follow: false },
};

export default async function MyFilesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Enable static rendering.
  setRequestLocale(locale);

  return <MyFilesClient locale={locale as Locale} />;
}
