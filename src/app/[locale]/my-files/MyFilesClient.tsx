/**
 * MyFilesClient — "Il mio spazio" manager (pdf.madweb.it).
 *
 * Full file/folder management over the live cloud API: browse with
 * breadcrumbs, upload, create/rename/move/delete folders, and
 * download/rename/move/delete files — with the per-user quota bar.
 *
 * AGPL-3.0 — part of the it_purecraft fork.
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Loader2,
  Pencil,
  Trash2,
  UploadCloud,
  X,
  ArrowRight,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { api, ApiError, type CloudItem } from '@/lib/api';
import { useSession } from '@/lib/contexts/SessionContext';
import { type Locale } from '@/lib/i18n/config';

interface Crumb {
  id: string | null;
  name: string;
}

interface DialogState {
  kind: 'create' | 'rename' | 'delete' | 'move';
  item?: CloudItem;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Map API error codes to localized strings. */
function errorMessage(t: ReturnType<typeof useTranslations<'cloud'>>, err: unknown): string {
  const code = err instanceof ApiError ? err.code : '';
  if (code === 'name_exists') return t('errors.nameExists');
  if (code === 'name_required') return t('errors.nameRequired');
  if (code === 'cannot_move_into_self') return t('errors.moveInvalid');
  if (code === 'quota_exceeded') return t('errors.quotaExceeded');
  return t('errors.operationFailed');
}

interface MoveDialogProps {
  item: CloudItem;
  onClose: () => void;
  onMoved: () => void;
  onError: (msg: string) => void;
}

/** Folder-target browser for the move action. */
function MoveDialog({ item, onClose, onMoved, onError }: MoveDialogProps) {
  const t = useTranslations('cloud');
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, name: '' }]);
  const current = crumbs[crumbs.length - 1];
  const [folders, setFolders] = useState<CloudItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);

  const load = useCallback(async (folderId: string | null) => {
    setLoading(true);
    try {
      const res = await api.listCloud(folderId);
      setFolders(res.items.filter((i) => i.type === 'folder' && i.id !== item.id));
    } catch {
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [item.id]);

  useEffect(() => {
    void load(current.id);
  }, [current.id, load]);

  const handleMoveHere = async () => {
    if (moving) return;
    setMoving(true);
    try {
      if (item.type === 'folder') {
        await api.moveCloudFolder(item.id, current.id);
      } else {
        await api.moveCloudFile(item.id, current.id);
      }
      onMoved();
    } catch (err) {
      onError(errorMessage(t, err));
      setMoving(false);
    }
  };

  const back = () => setCrumbs((prev) => prev.slice(0, prev.length - 1));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="flex h-[min(480px,85vh)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[hsl(var(--color-card))] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('move')}
      >
        <div className="flex items-center justify-between border-b border-[hsl(var(--color-border))] px-5 py-3.5">
          <h3 className="flex min-w-0 items-center gap-2 text-base font-semibold">
            <ArrowRight size={16} className="shrink-0 text-[hsl(var(--color-primary))]" aria-hidden />
            <span className="truncate">
              {t('move')} — <span className="text-[hsl(var(--color-muted-foreground))]">{item.name}</span>
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('close')}
            className="rounded-full p-2 text-[hsl(var(--color-muted-foreground))] hover:bg-[hsl(var(--color-muted))]"
          >
            <X size={17} aria-hidden />
          </button>
        </div>

        {/* Destination breadcrumbs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-[hsl(var(--color-border))] px-4 py-2 text-sm">
          {crumbs.length > 1 && (
            <ChevronLeft
              size={15}
              aria-hidden
              className="shrink-0 cursor-pointer opacity-70 hover:opacity-100"
              onClick={back}
            />
          )}
          {crumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight size={13} className="shrink-0 opacity-40" aria-hidden />}
              <button
                type="button"
                onClick={() => setCrumbs((prev) => prev.slice(0, index + 1))}
                className={`shrink-0 rounded-md px-1.5 py-0.5 hover:bg-[hsl(var(--color-muted))] ${index === crumbs.length - 1 ? 'font-medium' : 'text-[hsl(var(--color-muted-foreground))]'}`}
              >
                {index === 0 ? t('root') : crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex h-full items-center justify-center text-[hsl(var(--color-muted-foreground))]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
              <span className="text-sm">{t('loading')}</span>
            </div>
          ) : folders.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center px-4">
              <p className="text-sm font-medium text-[hsl(var(--color-muted-foreground))]">{t('empty')}</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {folders.map((folder) => (
                <li key={folder.id}>
                  <button
                    type="button"
                    onClick={() => setCrumbs((prev) => [...prev, { id: folder.id, name: folder.name }])}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[hsl(var(--color-muted))]"
                  >
                    <FolderOpen size={18} className="shrink-0 text-[hsl(var(--color-primary))]" aria-hidden />
                    <span className="truncate text-sm font-medium">{folder.name}</span>
                    <ChevronRight size={15} className="ml-auto shrink-0 opacity-40" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[hsl(var(--color-border))] px-5 py-3.5">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={moving}>
            {t('close')}
          </Button>
          <Button variant="primary" size="sm" onClick={handleMoveHere} disabled={moving} loading={moving}>
            {t('moveHere')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MyFilesClient({ locale }: { locale: Locale }) {
  const t = useTranslations('cloud');
  const tCommon = useTranslations('common');
  const { session, refresh } = useSession();

  const [crumbs, setCrumbs] = useState<Crumb[]>([{ id: null, name: '' }]);
  const current = crumbs[crumbs.length - 1];
  const [items, setItems] = useState<CloudItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [dialogName, setDialogName] = useState('');
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

  const reload = async () => {
    await load(current.id);
    await refresh();
  };

  const jumpTo = (index: number) => setCrumbs((prev) => prev.slice(0, index + 1));
  const openFolder = (folder: CloudItem) => setCrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || uploading) return;
    setUploading(true);
    setError(null);
    try {
      await api.uploadCloud(file, file.name, current.id, undefined);
      await reload();
    } catch (err) {
      setError(errorMessage(t, err));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (item: CloudItem) => {
    if (busyId) return;
    setBusyId(item.id);
    setError(null);
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
      setError(t('errors.downloadFailed'));
    } finally {
      setBusyId(null);
    }
  };

  const openDialog = (kind: DialogState['kind'], item?: CloudItem) => {
    setDialog({ kind, item });
    setDialogName(item?.name ?? '');
    setError(null);
  };

  const closeDialog = () => {
    setDialog(null);
    setDialogName('');
  };

  const submitNameDialog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dialog || (dialog.kind !== 'create' && dialog.kind !== 'rename')) return;
    const name = dialogName.trim();
    if (!name) {
      setError(t('errors.nameRequired'));
      return;
    }
    setError(null);
    try {
      if (dialog.kind === 'create') {
        await api.createFolder(name, current.id);
      } else if (dialog.item) {
        if (dialog.item.type === 'folder') {
          await api.renameCloudFolder(dialog.item.id, name);
        } else {
          await api.renameCloudFile(dialog.item.id, name);
        }
      }
      closeDialog();
      await reload();
    } catch (err) {
      setError(errorMessage(t, err));
    }
  };

  const confirmDelete = async () => {
    if (!dialog || dialog.kind !== 'delete' || !dialog.item) return;
    setError(null);
    try {
      if (dialog.item.type === 'folder') {
        await api.deleteCloudFolder(dialog.item.id);
      } else {
        await api.deleteCloudFile(dialog.item.id);
      }
      closeDialog();
      await reload();
    } catch {
      setError(t('errors.operationFailed'));
      closeDialog();
    }
  };

  const quota = session.status === 'authed' ? session : null;
  const pct =
    quota && quota.quotaBytes > 0
      ? Math.min(100, Math.round((quota.usedBytes / quota.quotaBytes) * 100))
      : 0;

  const dialogItem = dialog?.item;

  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} />

      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto max-w-3xl px-4">
          {/* Heading */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[hsl(var(--color-primary)/0.12)] text-[hsl(var(--color-primary))]">
                <HardDrive size={20} aria-hidden />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{t('title')}</h1>
                {quota && (
                  <p className="text-sm text-[hsl(var(--color-muted-foreground))]">
                    {quota.user.displayName} · {formatBytes(quota.usedBytes)} / {formatBytes(quota.quotaBytes)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quota bar */}
          {quota && (
            <div className="mb-5">
              <div className="h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--color-muted))]">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 95 ? 'bg-[hsl(var(--color-destructive))]' : 'bg-[hsl(var(--color-primary))]'}`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <p
              className="mb-4 rounded-xl bg-[hsl(var(--color-destructive)/0.1)] px-4 py-2.5 text-sm text-[hsl(var(--color-destructive))]"
              role="alert"
            >
              {error}
            </p>
          )}

          {/* Toolbar */}
          <Card variant="outlined" className="mb-4">
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              {/* Breadcrumbs */}
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-sm">
                {crumbs.length > 1 && (
                  <ChevronLeft
                    size={15}
                    aria-hidden
                    className="shrink-0 cursor-pointer opacity-70 hover:opacity-100"
                    onClick={() => jumpTo(crumbs.length - 2)}
                  />
                )}
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

              <input ref={uploadRef} type="file" onChange={handleUpload} className="hidden" aria-hidden />
              <Button
                variant="ghost"
                size="sm"
                disabled={uploading}
                onClick={() => uploadRef.current?.click()}
                title={t('uploadHere')}
              >
                <UploadCloud size={15} className="mr-1.5" aria-hidden />
                {uploading ? t('uploading') : t('uploadHere')}
              </Button>
              <Button variant="primary" size="sm" onClick={() => openDialog('create')}>
                <FolderPlus size={15} className="mr-1.5" aria-hidden />
                {t('newFolder')}
              </Button>
            </div>
          </Card>

          {/* Item list */}
          <Card variant="outlined">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-[hsl(var(--color-muted-foreground))]">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                <span className="text-sm">{t('loading')}</span>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <FolderOpen size={32} className="mb-3 opacity-30" aria-hidden />
                <p className="text-sm font-medium">{t('empty')}</p>
                <p className="mt-1 text-xs text-[hsl(var(--color-muted-foreground))]">
                  {t('emptyHint')} — {t('newFolder')} o {t('uploadHere')}.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[hsl(var(--color-border))]">
                {items.map((item) =>
                  item.type === 'folder' ? (
                    <li
                      key={item.id}
                      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[hsl(var(--color-muted)/0.4)]"
                    >
                      <button
                        type="button"
                        onClick={() => openFolder(item)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <FolderOpen size={18} className="shrink-0 text-[hsl(var(--color-primary))]" aria-hidden />
                        <span className="block min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                        <IconBtn label={t('rename')} onClick={() => openDialog('rename', item)}>
                          <Pencil size={15} aria-hidden />
                        </IconBtn>
                        <IconBtn label={t('move')} onClick={() => openDialog('move', item)}>
                          <ArrowRight size={15} aria-hidden />
                        </IconBtn>
                        <IconBtn label={t('delete')} destructive onClick={() => openDialog('delete', item)}>
                          <Trash2 size={15} aria-hidden />
                        </IconBtn>
                      </div>
                    </li>
                  ) : (
                    <li
                      key={item.id}
                      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[hsl(var(--color-muted)/0.4)]"
                    >
                      <FileText size={18} className="shrink-0 opacity-70" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.name}</span>
                        {typeof item.size === 'number' && (
                          <span className="block text-xs text-[hsl(var(--color-muted-foreground))]">
                            {formatBytes(item.size)}
                          </span>
                        )}
                      </span>
                      <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                        <IconBtn label={t('downloadFile')} onClick={() => handleDownload(item)} loading={busyId === item.id}>
                          <Download size={15} aria-hidden />
                        </IconBtn>
                        <IconBtn label={t('rename')} onClick={() => openDialog('rename', item)}>
                          <Pencil size={15} aria-hidden />
                        </IconBtn>
                        <IconBtn label={t('move')} onClick={() => openDialog('move', item)}>
                          <ArrowRight size={15} aria-hidden />
                        </IconBtn>
                        <IconBtn label={t('delete')} destructive onClick={() => openDialog('delete', item)}>
                          <Trash2 size={15} aria-hidden />
                        </IconBtn>
                      </div>
                    </li>
                  )
                )}
              </ul>
            )}
          </Card>
        </div>
      </main>

      {/* --- Dialogs --- */}
      {dialog && dialog.kind === 'create' && (
        <NameDialog
          title={t('newFolder')}
          label={t('folderName')}
          value={dialogName}
          submitLabel={t('createFolder')}
          onChange={setDialogName}
          onClose={closeDialog}
          onSubmit={submitNameDialog}
        />
      )}
      {dialog && dialog.kind === 'rename' && dialogItem && (
        <NameDialog
          title={t('rename')}
          label={t('rename')}
          value={dialogName}
          submitLabel={t('rename')}
          onChange={setDialogName}
          onClose={closeDialog}
          onSubmit={submitNameDialog}
        />
      )}
      {dialog && dialog.kind === 'delete' && dialogItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          onClick={(e) => {
            e.stopPropagation();
            closeDialog();
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/10 bg-[hsl(var(--color-card))] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-label={dialogItem.type === 'folder' ? t('deleteFolderTitle') : t('deleteFileTitle')}
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--color-destructive)/0.12)] text-[hsl(var(--color-destructive))]">
              <Trash2 size={19} aria-hidden />
            </div>
            <h3 className="text-lg font-bold">
              {dialogItem.type === 'folder' ? t('deleteFolderTitle') : t('deleteFileTitle')}
            </h3>
            <p className="mt-1.5 text-sm break-words text-[hsl(var(--color-muted-foreground))]">
              {dialogItem.type === 'folder'
                ? t('deleteFolderConfirm', { name: dialogItem.name })
                : t('deleteFileConfirm', { name: dialogItem.name })}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={closeDialog}>
                {tCommon('buttons.cancel')}
              </Button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-lg bg-[hsl(var(--color-destructive))] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
      {dialog && dialog.kind === 'move' && dialogItem && (
        <MoveDialog
          item={dialogItem}
          onClose={closeDialog}
          onMoved={async () => {
            closeDialog();
            await reload();
          }}
          onError={setError}
        />
      )}

      <Footer locale={locale} />
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
  destructive = false,
  loading = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      title={label}
      className={`rounded-lg p-2 transition-colors disabled:opacity-50 ${
        destructive
          ? 'text-[hsl(var(--color-muted-foreground))] hover:bg-[hsl(var(--color-destructive)/0.12)] hover:text-[hsl(var(--color-destructive))]'
          : 'text-[hsl(var(--color-muted-foreground))] hover:bg-[hsl(var(--color-muted))] hover:text-[hsl(var(--color-foreground))]'
      }`}
    >
      {loading ? <Loader2 size={15} className="animate-spin" aria-hidden /> : children}
    </button>
  );
}

function NameDialog({
  title,
  label,
  value,
  submitLabel,
  onChange,
  onClose,
  onSubmit,
}: {
  title: string;
  label: string;
  value: string;
  submitLabel: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const tCommon = useTranslations('common');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-[hsl(var(--color-card))] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={tCommon('buttons.close')}
            className="rounded-full p-2 text-[hsl(var(--color-muted-foreground))] hover:bg-[hsl(var(--color-muted))]"
          >
            <X size={16} aria-hidden />
          </button>
        </div>
        <form onSubmit={onSubmit} className="mt-4">
          <label className="block text-xs font-medium text-[hsl(var(--color-muted-foreground))]">{label}</label>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="off"
            className="mt-1.5 w-full rounded-[var(--radius-md)] border border-[hsl(var(--color-input))] bg-[hsl(var(--color-muted)/0.4)] px-4 py-2.5 text-sm text-[hsl(var(--color-foreground))] placeholder:text-zinc-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[hsl(var(--color-primary))]"
          />
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              {tCommon('buttons.cancel')}
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
