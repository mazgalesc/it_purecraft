/**
 * Typed client for the MadPDF cloud API (same-origin; WP ".madweb.it"
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
    headers.set('X-MadPDF-Request', '1');
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

export interface CloudItem {
  type: 'folder' | 'file';
  id: string;
  name: string;
  size?: number;
  mime?: string;
  tool?: string;
  created: string;
  /** Present only in ?recent= responses: folder the file lives in ('' = root). */
  folderName?: string;
}

export interface CloudListResponse {
  items: CloudItem[];
  folder: string;
}

function apiErrorFrom(res: Response): ApiError {
  return new ApiError(`http_${res.status}`, res.status);
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

  /* ---- cloud files & folders ---- */

  recentCloud: (limit = 8) =>
    request<{ items: CloudItem[] }>(`/api/files?recent=${limit}`),

  listCloud: (folderId: string | null) => {
    const query = folderId ? `?folder=${encodeURIComponent(folderId)}` : '';
    return request<CloudListResponse>(`/api/files${query}`);
  },

  downloadCloud: async (fileId: string): Promise<Blob> => {
    let res: Response;
    try {
      res = await fetch(`/api/files/${fileId}/download`, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
    } catch {
      throw new ApiError('network_error', 0);
    }
    if (!res.ok) throw apiErrorFrom(res);
    return res.blob();
  },

  uploadCloud: (blob: Blob | File, name: string, folderId: string | null, tool?: string) => {
    const fd = new FormData();
    fd.append('file', blob, name);
    if (folderId) fd.append('folder', folderId);
    if (tool) fd.append('tool', tool);
    return request<{ item: CloudItem }>('/api/files', { method: 'POST', body: fd }).then(
      (b) => b.item
    );
  },

  /* ---- cloud management (files & folders) ---- */

  /** PATCH /api/{kind}/{id} — {name?, folder?} rename/move (folder '' = root). */
  patchCloudItem: (
    kind: 'files' | 'folders',
    id: string,
    changes: { name?: string; folderId?: string | null }
  ) => {
    const body: Record<string, string> = {};
    if (changes.name !== undefined) body.name = changes.name;
    if (changes.folderId !== undefined) body.folder = changes.folderId ?? '';
    return request<{ item: CloudItem }>(`/api/${kind}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify(body),
    }).then((b) => b.item);
  },

  renameCloudFile: (id: string, name: string) =>
    api.patchCloudItem('files', id, { name }),

  moveCloudFile: (id: string, folderId: string | null) =>
    api.patchCloudItem('files', id, { folderId }),

  deleteCloudFile: (id: string) =>
    request<{ ok: boolean }>(`/api/files/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  createFolder: (name: string, folderId: string | null) =>
    request<{ item: CloudItem }>('/api/folders', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ name, folder: folderId ?? '' }),
    }).then((b) => b.item),

  renameCloudFolder: (id: string, name: string) =>
    api.patchCloudItem('folders', id, { name }),

  moveCloudFolder: (id: string, folderId: string | null) =>
    api.patchCloudItem('folders', id, { folderId }),

  deleteCloudFolder: (id: string) =>
    request<{ ok: boolean }>(`/api/folders/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};