/**
 * Branded in-app login page.
 *
 * Credentials are checked by the cloud API, which delegates to WordPress core
 * (wp_signon): the accounts, password rules and session cookie are madweb.it's
 * own. Registration and password reset intentionally live on madweb.it —
 * "Registrati" points to madweb.it/registrazione/, and a fresh registration
 * logs the user in there, so coming back here skips login automatically (SSO).
 *
 * AGPL-3.0 — part of the it_purecraft fork.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { localePath } from '@/lib/i18n/config';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, FileText, Lock } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/contexts/SessionContext';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';

const REGISTER_URL = 'https://madweb.it/registrazione/';
const LOST_PASSWORD_URL = 'https://madweb.it/login/?action=lostpassword';

const inputClass =
  'w-full px-3 py-2 rounded-[var(--radius-md)] border border-[hsl(var(--color-border))] ' +
  'bg-[hsl(var(--color-background))] text-[hsl(var(--color-foreground))] ' +
  'placeholder:text-[hsl(var(--color-muted-foreground))] focus:outline-none ' +
  'focus:ring-2 focus:ring-[hsl(var(--color-primary))]';

export default function LoginClient() {
  const t = useTranslations('auth');
  const { session, refresh } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();

  // Only accept same-site relative paths to avoid open redirects.
  const nextRaw = searchParams.get('next') ?? '';
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already authenticated (valid madweb.it session cookie) → skip the form.
  useEffect(() => {
    if (session.status === 'authed') {
      router.replace(next ?? localePath(locale, '/dashboard'));
    }
  }, [session.status, next, locale, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.login(email.trim(), password);
      await refresh();
      router.replace(next ?? localePath(locale, '/dashboard'));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'too_many_attempts') {
          setError(t('errors.tooManyAttempts'));
        } else if (err.code === 'invalid_credentials' || err.status === 401) {
          setError(t('errors.invalidCredentials'));
        } else {
          setError(t('errors.unknown'));
        }
      } else {
        setError(t('errors.networkError'));
      }
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]">
            <FileText size={22} aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="mt-1 text-sm text-[hsl(var(--color-muted-foreground))]">
            {t('subtitle')}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-[hsl(var(--color-border))] bg-[hsl(var(--color-card))] p-6 shadow-sm"
        >
          <FormField label={t('emailLabel')} name="email" required>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@esempio.it"
            />
          </FormField>

          <FormField label={t('passwordLabel')} name="password" required>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </FormField>

          {error ? (
            <p role="alert" className="flex items-start gap-2 text-sm text-[hsl(var(--color-destructive))]">
              <Lock size={15} className="mt-0.5 shrink-0" aria-hidden />
              <span>{error}</span>
            </p>
          ) : null}

          <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
            {submitting ? t('signingIn') : t('signIn')}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <a
              href={LOST_PASSWORD_URL}
              className="text-[hsl(var(--color-primary))] hover:underline"
            >
              {t('forgotPassword')}
            </a>
          </div>
        </form>

        <div className="mt-5 rounded-2xl border border-dashed border-[hsl(var(--color-border))] p-4 text-center text-sm">
          <p className="text-[hsl(var(--color-muted-foreground))]">{t('registerPrompt')}</p>
          <a
            href={REGISTER_URL}
            className="mt-2 inline-block font-medium text-[hsl(var(--color-primary))] hover:underline"
          >
            {t('register')}
          </a>
        </div>

        <div className="mt-6 text-center">
          <Link
            href={localePath(locale, '/')}
            className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--color-muted-foreground))] hover:text-[hsl(var(--color-foreground))]"
          >
            <ArrowLeft size={15} aria-hidden />
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </main>
  );
}