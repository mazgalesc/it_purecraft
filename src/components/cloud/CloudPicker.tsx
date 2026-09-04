/**
 * CloudPicker — modal browser of the user's pdf.madweb.it space.
 *
 * Lets a tool open stored files: navigating folders, uploading into the
 * current folder, and picking file(s) (downloaded as Blob-backed Files that
 * then flow through the tool's normal file pipeline).
 *
 * Single-file tools (multiple = false) pick on row click; multi-file tools
 * (multiple = true, e.g. Merge PDF) show a checkbox selection plus an
 * "Open N" confirm, and can restrict the visible files via `accept`.
 *
 * AGPL-3.0 — part of the it_purecraft fork.
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, FolderOpen, FileText, UploadCloud, Loader2, Check, X, HardDrive, Circle } from 'lucide-react';
import { api, ApiError, type CloudItem } from '@/lib/api';
import { useSession } from '@/lib/contexts/SessionContext';

interface Crumb {
  id: string | null;
  name: string;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Same accept semantics as FileUploader.validateFiles: extensions, wildcard or exact MIME types. */
function matchesAccept(name: string, mime: string | undefined, accept: string[] | undefined): boolean {
  if (!accept || accept.length === 0) return true;
  const lowerName = name.toLowerCase();
  const fileMime = mime || '';
  return accept.some((type) => {
    if (type === '*/*' || type === '*') return true;
    if (type.startsWith('.')) return lowerName.endsWith(type.toLowerCase());
    if (type.endsWith('/*')) return fileMime.startsWith(type.slice(0, -2));
    return fileMime === type;
  });
}

export interface CloudPickerProps {
  onClose: () => void;
  /** Called with downloaded, Blob-backed Files when the user picks one or more. */
  onPickFiles: (files: File[]) => void;
  /** Multi-file selection mode (Merge-style tools). Defaults to single pick. */
  multiple?: boolean;
  /** Restrict pickable files to the tool's accepted types (folders always shown). */
  accept?: string[];
}

export const CloudPicker: React.FC<CloudPickerProps> = ({ onClose, onPickFiles, multiple = false, accept }) => {
  const t = useTranslations('cloud');
  const { session } = useSession();

  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, name: '' }]);
  const current = crumbs[crumbs.length - 1];

  const [items, setItems] = useState<CloudItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null); // single-pick / open-in-progress
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [opening, setOpening] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const load = useCallback(
    async (folderId: string | null) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listCloud(folderId);
        setItems(res.items);
      } catch {
        setError(t('errors.loadFailed'));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void load(current.id);
  }, [current.id, load]);

  // Drop selections pointing at files that disappeared (folder change, delete…).
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const ids = new Set(items.map((i) => i.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  const pushFolder = (folder: CloudItem) => {
    setCrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const jumpTo = (index: number) => {
    setCrumbs((prev) => prev.slice(0, index + 1));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      await api.uploadCloud(file, file.name, current.id, undefined);
      await load(current.id);
    } catch (err) {
      setError(err instanceof ApiError && err.code === 'quota_exceeded' ? t('errors.quotaExceeded') : t('errors.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  /** Download one stored file and turn it into a Blob-backed File. */
  const materialize = async (item: CloudItem): Promise<File> => {
    const blob = await api.downloadCloud(item.id);
    return new File([blob], item.name, { type: item.mime || 'application/octet-stream' });
  };

  /** Single-file tools: click a file to open it right away (previous behavior). */
  const handlePickSingle = async (item: CloudItem) => {
    if (busyId) return;
    setBusyId(item.id);
    setError(null);
    try {
      const file = await materialize(item);
      setPickedId(item.id);
      setTimeout(() => onPickFiles([file]), 250);
    } catch {
      setError(t('errors.downloadFailed'));
      setBusyId(null);
    }
  };

  const toggleSelect = (item: CloudItem) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  };

  const handleOpenSelected = async () => {
    const chosen = items.filter((i) => i.type === 'file' && selected.has(i.id));
    if (chosen.length === 0 || opening) return;
    setOpening(true);
    setError(null);
    try {
      const files = await Promise.all(chosen.map(materialize));
      setTimeout(() => onPickFiles(files), 250);
    } catch {
      setError(t('errors.openFailed'));
      setOpening(false);
    }
  };

  const visibleItems = multiple
    ? items.filter((i) => i.type === 'folder' || matchesAccept(i.name, i.mime, accept))
    : items;

  const quota = session.status === 'authed' ? session : null;
  const pct =
    quota && quota.quotaBytes > 0
      ? Math.min(100, Math.round((quota.usedBytes / quota.quotaBytes) * 100))
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="flex h-[min(680px,85vh)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[hsl(var(--color-card))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[hsl(var(--color-border))] px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <HardDrive size={17} className="shrink-0 text-[hsl(var(--color-primary))]" aria-hidden />
            <h2 className="truncate text-base font-semibold">{t('title')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="rounded-full p-2 text-[hsl(var(--color-muted-foreground))] hover:bg-[hsl(var(--color-muted))] hover:text-[hsl(var(--color-foreground))]"
          >
            <X size={17} aria-hidden />
          </button>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-[hsl(var(--color-border))] px-4 py-2 text-sm">
          <ChevronLeft
            size={15}
            aria-hidden
            className={`shrink-0 transition-opacity ${crumbs.length > 1 ? 'cursor-pointer opacity-70 hover:opacity-100' : 'opacity-20'}`}
            onClick={() => crumbs.length > 1 && jumpTo(crumbs.length - 2)}
          />
          {crumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight size={13} className="shrink-0 opacity-40" aria-hidden />}
              <button
                type="button"
                onClick={() => jumpTo(index)}
                className={`shrink-0 rounded-md px-1.5 py-0.5 hover:bg-[hsl(var(--color-muted))] ${index === crumbs.length - 1 ? 'font-medium' : 'text-[hsl(var(--color-muted-foreground))]'}`}
              >
                {index === 0 ? t('root') : crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3">
          {error && (
            <p className="mb-3 rounded-xl bg-[hsl(var(--color-destructive)/0.1)] px-4 py-2.5 text-sm text-[hsl(var(--color-destructive))]">
              {error}
            </p>
          )}

          {multiple && !loading && visibleItems.some((i) => i.type === 'file') && (
            <p className="mb-2 px-1 text-xs text-[hsl(var(--color-muted-foreground))]">{t('selectHint')}</p>
          )}

          {loading ? (
            <div className="flex h-full items-center justify-center text-[hsl(var(--color-muted-foreground))]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
              <span className="text-sm">{t('loading')}</span>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <FileText size={30} className="mb-3 opacity-40" aria-hidden />
              <p className="text-sm font-medium">{t('empty')}</p>
              <p className="mt-1 text-xs text-[hsl(var(--color-muted-foreground))]">{t('emptyHint')}</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {visibleItems.map((item) =>
                item.type === 'folder' ? (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => pushFolder(item)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[hsl(var(--color-muted))]"
                    >
                      <FolderOpen size={18} className="shrink-0 text-[hsl(var(--color-primary))]" aria-hidden />
                      <span className="truncate text-sm font-medium">{item.name}</span>
                      <ChevronRight size={15} className="ml-auto shrink-0 opacity-40" aria-hidden />
                    </button>
                  </li>
                ) : (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => (multiple ? toggleSelect(item) : handlePickSingle(item))}
                      disabled={multiple ? opening : !!busyId}
                      aria-pressed={multiple ? selected.has(item.id) : undefined}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[hsl(var(--color-muted))] disabled:opacity-60"
                    >
                      <FileText size={18} className="shrink-0 opacity-70" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{item.name}</span>
                        {typeof item.size === 'number' && (
                          <span className="block text-xs text-[hsl(var(--color-muted-foreground))]">
                            {formatBytes(item.size)}
                          </span>
                        )}
                      </span>
                      {multiple ? (
                        selected.has(item.id) ? (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--color-primary))] text-[hsl(var(--color-primary-foreground))]" aria-hidden>
                            <Check size={12} strokeWidth={3} />
                          </span>
                        ) : (
                          <Circle size={17} className="shrink-0 opacity-40" aria-hidden />
                        )
                      ) : busyId === item.id ? (
                        <Loader2 size={16} className="shrink-0 animate-spin text-[hsl(var(--color-primary))]" aria-hidden />
                      ) : pickedId === item.id ? (
                        <Check size={16} className="shrink-0 text-green-500" aria-hidden />
                      ) : (
                        <span className="shrink-0 text-xs font-medium text-[hsl(var(--color-primary))]">{t('open')}</span>
                      )}
                    </button>
                  </li>
                )
              )}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[hsl(var(--color-border))] px-5 py-3.5">
          <input ref={uploadRef} type="file" onChange={handleUpload} className="hidden" aria-hidden />
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={uploading}
              onClick={() => uploadRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--color-primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--color-primary-foreground))] hover:bg-[hsl(var(--color-primary-hover))] disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 size={15} className="animate-spin" aria-hidden />
              ) : (
                <UploadCloud size={15} aria-hidden />
              )}
              {uploading ? t('uploading') : t('uploadHere')}
            </button>

            {multiple && (
              <button
                type="button"
                disabled={selected.size === 0 || opening}
                onClick={handleOpenSelected}
                className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--color-primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--color-primary-foreground))] hover:bg-[hsl(var(--color-primary-hover))] disabled:opacity-50"
              >
                {opening ? (
                  <>
                    <Loader2 size={15} className="animate-spin" aria-hidden />
                    {t('opening')}
                  </>
                ) : (
                  <>
                    <Check size={15} aria-hidden />
                    {t('openCount', { count: selected.size })}
                  </>
                )}
              </button>
            )}

            {quota && (
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between text-[11px] text-[hsl(var(--color-muted-foreground))]">
                  <span>{t('quotaLabel', { used: formatBytes(quota.usedBytes), total: formatBytes(quota.quotaBytes) })}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[hsl(var(--color-muted))]">
                  <div
                    className={`h-full rounded-full ${pct >= 95 ? 'bg-[hsl(var(--color-destructive))]' : 'bg-[hsl(var(--color-primary))]'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudPicker;
