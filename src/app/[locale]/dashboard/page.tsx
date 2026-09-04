import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { locales, type Locale } from '@/lib/i18n/config';
import DashboardClient from './DashboardClient';
import { getPopularTools } from '@/config/tools';
import { getToolContent } from '@/config/tool-content';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: 'Dashboard · MadPDF',
  robots: { index: false, follow: false },
};

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Popular tools with localized titles/descriptions, resolved server-side
  // (tool-content is data-only, but resolving here keeps the client bundle lean).
  const popular = getPopularTools().slice(0, 8);
  const localizedContent = popular.reduce<
    Record<string, { title: string; description: string }>
  >((acc, tool) => {
    const content = getToolContent(locale as Locale, tool.id);
    if (content) {
      acc[tool.id] = { title: content.title, description: content.metaDescription };
    }
    return acc;
  }, {});

  return (
    <DashboardClient
      locale={locale as Locale}
      popularTools={popular}
      localizedContent={localizedContent}
    />
  );
}
