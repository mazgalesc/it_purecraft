/**
 * DashboardClient — the logged-in home (pdf.madweb.it/dashboard).
 *
 * One screen with everything a returning user needs, kept deliberately
 * simple: a greeting with cloud-space usage, the newest files in their
 * space (open/download/delete), quick actions, and the popular tools.
 *
 * AGPL-3.0 — part of the it_purecraft fork.
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CloudUpload,
  Download,
  FileText,
  FolderOpen,
  Loader2,
  Trash2,
  Wrench,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ToolCard } from '@/components/tools/ToolCard';
import { api, ApiError, type CloudItem } from '@/lib/api';
import { useSession } from '@/lib/contexts/SessionContext';
import { localePath, type Locale } from '@/lib/i18n/config';
import type { Tool } from '@/types/tool';

interface DashboardClientProps {
  locale: Locale;
  popularTools: Tool[];
  localizedContent: Record<string, { title: string; description: string }>;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function formatRelative(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 30) return rtf.format(-days, 'day');
  return new Date(iso).toLocaleDateString(locale);
}

export default function DashboardClient({
  locale,
  popularTools,
  localizedContent,
}: DashboardClientProps) {
  const t = useTranslations('dashboard');
  const { session } = useSession();

  const [recent, setRecent] = useState<CloudItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRecent = useCallback(async () => {
    try {
      const res = await api.recentCloud(8);
      setRecent(res.items);
      setLoadError(null);
    } catch {
      setRecent([]);
      setLoadError(t('recent.loadError'));
    }
  }, [t]);

  useEffect(() => {
    void loadRecent();
  }, [loadRecent]);

  const handleDownload = async (item: CloudItem) => {
    if (busyId) return;
    setBusyId(item.id);
    try {
      const blob = await api.downloadCloud(item.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setLoadError(t('recent.downloadError'));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (item: CloudItem) => {
    if (busyId) return;
    setBusyId(item.id);
    try {
      await api.deleteCloudFile(item.id);
      setRecent((prev) => prev?.filter((f) => f.id !== item.id) ?? null);
    } catch (err) {
      setLoadError(
        err instanceof ApiError && err.code === 'not_found'
          ? t('recent.alreadyDeleted')
          : t('recent.deleteError')
      );
    } finally {
      setBusyId(null);
    }
  };

  const authed = session.status === 'authed';
  const pct =
    authed && session.quotaBytes > 0
      ? Math.min(100, Math.round((session.usedBytes / session.quotaBytes) * 100))
      : 0;
  const firstName = authed && session.user.displayName ? session.user.displayName.split('@')[0] : '';

  return (
    <div className="min-h-screen flex flex-col">
      <Header locale={locale} />

      <main className="flex-container flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Greeting + quota */}
          <section aria-label={t('greeting.heading')}>
            <h1 className="text-3xl font-bold text-[hsl(var(--color-foreground))] mb-2">
              {authed
                ? t('greeting.hello', { name: firstName || t('greeting.fallbackName') })
                : t('greeting.loading')}
            </h1>
            <p className="text-[hsl(var(--color-muted-foreground))] mb-6">{t('greeting.subtitle')}</p>

            {authed && (
              <Card className="p-5 mb-10">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <span className="text-sm font-medium text-[hsl(var(--color-foreground))]">
                    {t('quota.title')}
                  </span>
                  <span className="text-sm text-[hsl(var(--color-muted-foreground))]">
                    {t('quota.usage', {
                      used: formatBytes(session.usedBytes),
                      total: formatBytes(session.quotaBytes),
                    })}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[hsl(var(--color-muted))] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[hsl(var(--color-primary))] transition-all"
                    style={{ width: `${Math.max(2, pct)}%` }}
                    role="progressbar"
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t('quota.title')}
                  />
                </div>
                <div className="mt-3 text-right">
                  <a
                    href={localePath(locale, '/my-files')}
                    className="text-sm text-[hsl(var(--color-primary))] hover:underline"
                  >
                    {t('quota.manage')}
                  </a>
                </div>
              </Card>
            )}
          </section>

          {/* Quick actions */}
          <section className="mb-10" aria-label={t('quick.title')}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <a href={localePath(locale, '/tools')}>
                <Card className="p-5 h-full hover:-translate-y-0.5 transition-transform" hover={false}>
                  <Wrench className="h-6 w-6 text-[hsl(var(--color-primary))] mb-3" aria-hidden />
                  <div className="font-semibold text-[hsl(var(--color-foreground))]">{t('quick.tools')}</div>
                  <div className="text-sm text-[hsl(var(--color-muted-foreground))]">{t('quick.toolsHint')}</div>
                </Card>
              </a>
              <a href={localePath(locale, '/my-files')}>
                <Card className="p-5 h-full hover:-translate-y-0.5 transition-transform" hover={false}>
                  <FolderOpen className="h-6 w-6 text-[hsl(var(--color-primary))] mb-3" aria-hidden />
                  <div className="font-semibold text-[hsl(var(--color-foreground))]">{t('quick.myFiles')}</div>
                  <div className="text-sm text-[hsl(var(--color-muted-foreground))]">{t('quick.myFilesHint')}</div>
                </Card>
              </a>
              <a href={localePath(locale, '/tools')}>
                <Card className="p-5 h-full hover:-translate-y-0.5 transition-transform md:hidden" hover={false}>
                  <CloudUpload className="h-6 w-6 text-[hsl(var(--color-primary))] mb-3" aria-hidden />
                  <div className="font-semibold text-[hsl(var(--color-foreground))]">{t('quick.upload')}</div>
                  <div className="text-sm text-[hsl(var(--color-muted-foreground))]">{t('quick.uploadHint')}</div>
                </Card>
              </a>
            </div>
          </section>

          {/* Recent cloud files */}
          <section className="mb-12" aria-label={t('recent.title')}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[hsl(var(--color-foreground))]">{t('recent.title')}</h2>
              <a
                href={localePath(locale, '/my-files')}
                className="text-sm text-[hsl(var(--color-primary))] hover:underline"
              >
                {t('recent.seeAll')}
              </a>
            </div>

            {recent === null ? (
              <div className="flex items-center gap-2 text-sm text-[hsl(var(--color-muted-foreground))] py-8 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t('recent.loading')}
              </div>
            ) : recent.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="h-8 w-8 mx-auto text-[hsl(var(--color-muted-foreground))] mb-3" aria-hidden />
                <p className="text-[hsl(var(--color-muted-foreground))] mb-4">{t('recent.empty')}</p>
                <a href={localePath(locale, '/tools')}>
                  <Button variant="primary">{t('recent.emptyCta')}</Button>
                </a>
              </Card>
            ) : (
              <ul className="flex flex-col gap-2">
                {recent.map((item) => (
                  <li key={item.id}>
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <FileText
                          className="h-5 w-5 flex-shrink-0 text-[hsl(var(--color-primary))]"
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-[hsl(var(--color-foreground))] truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-[hsl(var(--color-muted-foreground))] truncate">
                            {[
                              formatBytes(item.size ?? 0),
                              item.folderName ? `${t('recent.in')} ${item.folderName}` : t('recent.rootFolder'),
                              formatRelative(item.created, locale),
                            ].join(' · ')}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDownload(item)}
                          disabled={busyId === item.id}
                          className="p-2 rounded-lg text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-primary))] hover:bg-[hsl(var(--color-muted))] disabled:opacity-50"
                          aria-label={`${t('recent.download')} ${item.name}`}
                          title={t('recent.download')}
                        >
                          {busyId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <Download className="h-4 w-4" aria-hidden />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item)}
                          disabled={busyId === item.id}
                          className="p-2 rounded-lg text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-foreground))] hover:bg-[hsl(var(--color-muted))] disabled:opacity-50"
                          aria-label={`${t('recent.delete')} ${item.name}`}
                          title={t('recent.delete')}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
            {loadError && (
              <p className="mt-3 text-sm text-[hsl(var(--color-foreground))]" role="alert">
                {loadError}
              </p>
            )}
          </section>

          {/* Popular tools */}
          <section aria-label={t('popular.title')}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[hsl(var(--color-foreground))]">{t('popular.title')}</h2>
              <a
                href={localePath(locale, '/tools')}
                className="text-sm text-[hsl(var(--color-primary))] hover:underline"
              >
                {t('popular.seeAll')}
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {popularTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  locale={locale}
                  localizedContent={localizedContent[tool.id]}
                />
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}
