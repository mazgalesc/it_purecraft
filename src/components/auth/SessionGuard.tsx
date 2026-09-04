/**
 * Login wall (client-side). Wraps the app inside SessionProvider.
 *
 * Product rule (madweb fork): marketing/info pages are PUBLIC — anonymous
 * visitors can read the homepage, browse the tools catalog, and open about,
 * FAQ, privacy, terms, cookies and contact. The wall only guards actually
 * USING the product: opening a tool (/tools/<slug>), the workflow builder,
 * the dashboard and the cloud file manager. There, anonymous visitors are
 * redirected to /login?next=<original path> (the login page links to the
 * madweb.it registration), so they land back where they intended.
 *
 * AGPL-3.0 — part of the it_purecraft fork.
 */

'use client';

import React, { useEffect } from 'react';
import { localePath } from '@/lib/i18n/config';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useSession } from '@/lib/contexts/SessionContext';

/** Route segments (locale prefix stripped) whose first segment gates the app. */
const GATED_SEGMENTS = new Set(['workflow', 'dashboard', 'my-files']);

/**
 * True when the path requires an account. Public: '', about, faq, privacy,
 * terms, cookies, contact, the /tools catalog and its /tools/category/...
 * listings. Gated: /tools/<slug> (using a tool), workflow, dashboard,
 * my-files.
 */
function isGatedPath(pathname: string | null): boolean {
  if (!pathname) return false;
  // Strip the locale prefix (English /en/...; legacy /it/... just in case).
  const bare = pathname.replace(/^\/(?:en|it)(\/|$)/, '/');
  const segments = bare.split('/').filter(Boolean);
  if (segments.length === 0) return false; // homepage
  const [first, second] = segments;
  if (first === 'tools') {
    // Catalog (/tools) and category listings (/tools/category/...) stay public;
    // a concrete tool page (/tools/<slug>) requires login.
    return Boolean(second) && second !== 'category';
  }
  return GATED_SEGMENTS.has(first);
}

export const SessionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useSession();
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();

  const loginPath = localePath(locale, '/login');
  const isLoginPage = pathname === loginPath || pathname === `${loginPath}/`;
  const gated = isGatedPath(pathname);

  useEffect(() => {
    if (session.status === 'anon' && gated && !isLoginPage) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`${loginPath}${next}`);
    }
  }, [session.status, gated, isLoginPage, loginPath, pathname, router]);

  // Hold rendering only where it matters: gated pages while the session
  // loads (no flash of gated content) and while redirecting anon visitors.
  if (gated && (session.status === 'loading' || (session.status === 'anon' && !isLoginPage))) {
    return null;
  }

  return <>{children}</>;
};
