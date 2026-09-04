/**
 * Login wall (client-side). Wraps the app inside SessionProvider:
 *  - while the session loads, renders nothing (no flash of gated content),
 *  - anonymous visitors on any page except /login are redirected to
 *    /<locale>/login?next=<original path>,
 *  - authenticated visitors pass through untouched.
 *
 * The server-side nginx gate (deploy-time hardening) complements this; the
 * product rule is enforced here in the app itself.
 *
 * AGPL-3.0 — part of the it_purecraft fork.
 */

'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useSession } from '@/lib/contexts/SessionContext';

export const SessionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useSession();
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();

  const loginPath = `/${locale}/login`;
  const isLoginPage = pathname === loginPath || pathname === `${loginPath}/`;

  useEffect(() => {
    if (session.status === 'anon' && !isLoginPage) {
      const home = `/${locale}`;
      const next =
        pathname && pathname !== home && pathname !== `${home}/`
          ? `?next=${encodeURIComponent(pathname)}`
          : '';
      router.replace(`${loginPath}${next}`);
    }
  }, [session.status, isLoginPage, loginPath, pathname, locale, router]);

  if (session.status === 'loading' || (session.status === 'anon' && !isLoginPage)) {
    return null;
  }

  return <>{children}</>;
};