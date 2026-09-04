/**
 * Header account chip — the in-app face of the madweb.it session:
 *  - anonymous: "Accedi" link to the branded login page,
 *  - authenticated: display name, cloud-space usage and a logout button.
 *
 * AGPL-3.0 — part of the it_purecraft fork.
 */

'use client';

import React from 'react';
import { localePath } from '@/lib/i18n/config';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { HardDrive, LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/contexts/SessionContext';
import { Button } from '@/components/ui/Button';

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const AccountChip: React.FC<{ locale: string }> = ({ locale }) => {
  const { session, refresh } = useSession();
  const router = useRouter();
  const t = useTranslations('account');

  if (session.status === 'loading') {
    return <div className="h-9 w-24 animate-pulse rounded-full bg-[hsl(var(--color-muted))]" aria-hidden />;
  }

  if (session.status === 'anon') {
    return (
      <Link href={localePath(locale, '/login')}>
        <Button size="sm" variant="primary">
          {t('signIn')}
        </Button>
      </Link>
    );
  }

  const pct =
    session.quotaBytes > 0 ? Math.min(100, Math.round((session.usedBytes / session.quotaBytes) * 100)) : 0;

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      await refresh();
      router.push(localePath(locale, '/login'));
    }
  }

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-[hsl(var(--color-border))] py-1.5 pl-2.5 pr-1.5"
      title={t('quota', {
        used: formatBytes(session.usedBytes),
        total: formatBytes(session.quotaBytes),
      })}
    >
      <Link href={localePath(locale, '/dashboard')}
        title={t('dashboard')}
        aria-label={t('dashboard')}
        className="flex items-center gap-2 rounded-full text-[hsl(var(--color-muted-foreground))] transition-colors hover:text-[hsl(var(--color-foreground))]"
      >
        <HardDrive size={15} aria-hidden />
        <span className="hidden flex-col items-end leading-tight sm:flex">
          <span className="max-w-32 truncate text-xs font-medium text-[hsl(var(--color-foreground))]">
            {session.user.displayName}
          </span>
          <span className="text-[10px]">{pct}%</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={handleLogout}
        aria-label={t('logout')}
        title={t('logout')}
        className="rounded-full p-2 text-[hsl(var(--color-muted-foreground))] transition-colors hover:bg-[hsl(var(--color-muted))] hover:text-[hsl(var(--color-foreground))]"
      >
        <LogOut size={15} aria-hidden />
      </button>
    </div>
  );
};