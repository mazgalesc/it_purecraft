/**
 * Typed client for the PDFCraft cloud API (same-origin; WP ".madweb.it"
 * session-cookie auth — no tokens stored in the app).
 *
 * AGPL-3.0 — part of the it_purecraft fork (madweb.it deployment).
 */

export interface ApiUser {
  id: number;
  email: string;
  displayName: string;
}

export interface MePayload {
  user: ApiUser;
  quotaBytes: number;
  usedBytes: number;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

const JSON_HEADERS: Record<string, string> = { 'Content-Type': 'application/json' };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  // Required by the backend for every state-changing call (CSRF defense).
  if (init.method && init.method !== 'GET') {
    headers.set('X-PDFCraft-Request', '1');
  }

  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('network_error', 0);
  }

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON error page — fall through to the generic error
  }

  if (!res.ok) {
    const code =
      body && typeof body === 'object' && 'error' in body
        ? String((body as { error: unknown }).error)
        : `http_${res.status}`;
    throw new ApiError(code, res.status);
  }

  return body as T;
}

export const api = {
  me: () => request<MePayload>('/api/me'),

  login: (email: string, password: string) =>
    request<MePayload>('/api/auth/login', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
};