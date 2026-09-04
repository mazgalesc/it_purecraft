/**
 * Session context — bridges the app to the madweb.it account session.
 *
 * On mount it calls GET /api/me (WP session cookie). The result drives:
 *  - the login wall (SessionGuard redirects anonymous visitors to /login),
 *  - the account chip in the header (user + quota),
 *  - SSO: a valid madweb.it cookie anywhere on *.madweb.it means the user is
 *    already authed here — the wall is skipped automatically.
 *
 * AGPL-3.0 — part of the it_purecraft fork.
 */

'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, ApiError, type MePayload } from '@/lib/api';

export type SessionState =
  | { status: 'loading' }
  | { status: 'anon' }
  | { status: 'authed'; user: MePayload['user']; quotaBytes: number; usedBytes: number };

interface SessionContextValue {
  session: SessionState;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionState>({ status: 'loading' });

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setSession({
        status: 'authed',
        user: me.user,
        quotaBytes: me.quotaBytes,
        usedBytes: me.usedBytes,
      });
    } catch (err) {
      // 401 => not logged in; network errors => treat as anonymous (nothing
      // account-dependent can work anyway).
      void err;
      setSession({ status: 'anon' });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // SSO pickup: if the user logs in on madweb.it in another tab and comes
  // back here, re-check the session on window focus.
  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  return (
    <SessionContext.Provider value={{ session, refresh }}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used inside <SessionProvider>');
  }
  return ctx;
}