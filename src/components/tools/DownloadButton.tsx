'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, type ButtonProps } from '../ui/Button';
import { addRecentFile } from '@/lib/storage/recent-files';
import { useToolContext } from '@/lib/contexts/ToolContext';
import { sanitizeFilename } from '@/lib/utils/sanitize';
import { CloudUpload, Check, Loader2, X } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useSession } from '@/lib/contexts/SessionContext';

export interface DownloadButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  /** Blob data to download */
  file: Blob | null;
  /** Filename for the download */
  filename: string;
  /** Custom button text */
  label?: string;
  /** Callback after download starts */
  onDownloadStart?: () => void;
  /** Callback after download completes */
  onDownloadComplete?: () => void;
  /** Auto-revoke blob URL after download (default: true) */
  autoRevoke?: boolean;
  /** Show file size in button */
  showFileSize?: boolean;
  /** Tool slug for recent files tracking (optional, uses context if not provided) */
  toolSlug?: string;
  /** Tool display name for recent files tracking (optional, uses context if not provided) */
  toolName?: string;
  /** Show a companion "save to cloud space" button when a result exists (default: true) */
  saveToCloud?: boolean;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * DownloadButton Component
 * Requirements: 5.4
 * 
 * Generates download link from Blob with custom filename.
 * Uses blob URLs that are revoked after download for security.
 */
export const DownloadButton: React.FC<DownloadButtonProps> = ({
  file,
  filename,
  label,
  onDownloadStart,
  onDownloadComplete,
  autoRevoke = true,
  showFileSize = true,
  saveToCloud = true,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  toolSlug: propToolSlug,
  toolName: propToolName,
  ...buttonProps
}) => {
  const t = useTranslations('common');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [cloudState, setCloudState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [cloudNote, setCloudNote] = useState<string | null>(null);
  const tCloud = useTranslations('cloud');
  const { session } = useSession();
  
  // Get tool info from context if not provided via props
  const toolContext = useToolContext();
  const toolSlug = propToolSlug || toolContext?.toolSlug;
  const toolName = propToolName || toolContext?.toolName;

  // Create blob URL when file changes
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setBlobUrl(url);
      
      // Cleanup function to revoke URL when component unmounts or file changes
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setBlobUrl(null);
    }
  }, [file]);

  /**
   * Handle download click
   */
  const handleDownload = useCallback(() => {
    if (!file || !blobUrl || isDownloading) return;

    setIsDownloading(true);
    onDownloadStart?.();

    // Sanitize filename to prevent path traversal
    const safeFilename = sanitizeFilename(filename, 'download.pdf');

    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = safeFilename;
    link.style.display = 'none';
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Revoke the blob URL after a short delay to ensure download starts
    if (autoRevoke) {
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
        
        // Recreate URL for potential re-download
        if (file) {
          const newUrl = URL.createObjectURL(file);
          setBlobUrl(newUrl);
        }
      }, 100);
    }

    // Mark download as complete
    setTimeout(() => {
      setIsDownloading(false);
      onDownloadComplete?.();
      
      // Record to recent files if tool info is provided
      if (toolSlug && file) {
        addRecentFile(filename, file.size, toolSlug, toolName);
      }
    }, 500);
  }, [file, blobUrl, filename, isDownloading, autoRevoke, onDownloadStart, onDownloadComplete, toolSlug, toolName]);

  // Determine if button should be disabled
  const isDisabled = disabled || !file || !blobUrl;

  // Build button text
  const buttonText = label || t('buttons.download');
  const fileSizeText = showFileSize && file ? ` (${formatFileSize(file.size)})` : '';

  /** Upload the result blob to the user's cloud space (root folder). */
  const handleSaveToCloud = useCallback(async () => {
    if (!file) return;
    setCloudState('saving');
    setCloudNote(null);
    try {
      await api.uploadCloud(file, sanitizeFilename(filename, 'download.pdf'), null, toolSlug);
      setCloudState('saved');
      setCloudNote(tCloud('saved'));
      window.setTimeout(() => {
        setCloudState('idle');
        setCloudNote(null);
      }, 3000);
    } catch (err) {
      setCloudState('error');
      setCloudNote(
        err instanceof ApiError && err.code === 'quota_exceeded'
          ? tCloud('errors.quotaExceeded')
          : tCloud('errors.saveFailed')
      );
      window.setTimeout(() => {
        setCloudState('idle');
        setCloudNote(null);
      }, 6000);
    }
  }, [file, filename, toolSlug, tCloud]);

  const downloadButton = (
    <Button
      variant={variant}
      size={size}
      disabled={isDisabled}
      loading={isDownloading}
      onClick={handleDownload}
      className={className}
      aria-label={`${buttonText}${fileSizeText}`}
      {...buttonProps}
    >
      {/* Download icon */}
      {!isDownloading && (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      )}
      
      <span>
        {buttonText}
        {fileSizeText}
      </span>
    </Button>
  );

  const cloudEnabled = saveToCloud && !!file && session.status === 'authed';
  if (!cloudEnabled) {
    return downloadButton;
  }

  const cloudTone =
    cloudState === 'saved'
      ? 'text-green-500 border-green-500/40'
      : cloudState === 'error'
        ? 'text-[hsl(var(--color-destructive))] border-[hsl(var(--color-destructive)/0.4)]'
        : '';

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {downloadButton}
      <Button
        type="button"
        variant="outline"
        size={size}
        disabled={cloudState === 'saving'}
        onClick={handleSaveToCloud}
        className={cloudTone}
        aria-label={tCloud('saveToCloud')}
        title={cloudNote ?? tCloud('saveToCloud')}
      >
        {cloudState === 'saving' ? (
          <Loader2 size={16} className="animate-spin" aria-hidden />
        ) : cloudState === 'saved' ? (
          <Check size={16} aria-hidden />
        ) : cloudState === 'error' ? (
          <X size={16} aria-hidden />
        ) : (
          <CloudUpload size={16} aria-hidden />
        )}
        {size !== 'icon' && (
          <span>
            {cloudState === 'saving'
              ? tCloud('saving')
              : cloudState === 'saved'
                ? tCloud('saved')
                : tCloud('saveToCloud')}
          </span>
        )}
      </Button>
      {cloudNote && (
        <p
          className={`w-full text-center text-xs font-medium ${
            cloudState === 'error' ? 'text-[hsl(var(--color-destructive))]' : 'text-green-500'
          }`}
          aria-live="polite"
        >
          {cloudNote}
        </p>
      )}
    </div>
  );
};

export default DownloadButton;
