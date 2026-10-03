import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export type DropzoneState =
  'idle' | 'hover' | 'dragover' | 'uploading' | 'processing' | 'success' | 'failure';

export interface FileDropzoneProps {
  state?: DropzoneState;
  onFileSelect?: (file: File) => void;
  onFileSelected?: (file: File) => void;
  fileName?: string;
  errorMessage?: string;
  disabled?: boolean;
  supportedFormats?: string;
  maxSizeLabel?: string;
  style?: React.CSSProperties;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  state: controlledState,
  onFileSelect,
  onFileSelected,
  fileName,
  errorMessage,
  disabled = false,
  supportedFormats = 'PNG, JPG or WEBP',
  maxSizeLabel = 'Max 10 MB',
  style,
}) => {
  const [internalState, setInternalState] = useState<DropzoneState>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentState = controlledState || internalState;

  const handleFile = (file: File) => {
    if (onFileSelect) onFileSelect(file);
    if (onFileSelected) onFileSelected(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setInternalState('dragover');
  };

  const handleDragLeave = () => {
    if (disabled) return;
    setInternalState('idle');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setInternalState('idle');
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleMouseEnter = () => {
    if (disabled || controlledState) return;
    if (internalState === 'idle') {
      setInternalState('hover');
    }
  };

  const handleMouseLeave = () => {
    if (disabled || controlledState) return;
    if (internalState === 'hover') {
      setInternalState('idle');
    }
  };

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const getBorderColor = () => {
    switch (currentState) {
      case 'dragover':
        return 'var(--color-brand-primary)';
      case 'hover':
        return 'var(--color-border-strong)';
      case 'success':
        return 'var(--color-status-verified)';
      case 'failure':
        return 'var(--color-status-mismatch)';
      default:
        return 'var(--color-border-subtle)';
    }
  };

  const getBackgroundColor = () => {
    switch (currentState) {
      case 'dragover':
        return 'var(--color-brand-subtle)';
      case 'success':
        return 'var(--color-status-verified-bg)';
      case 'failure':
        return 'var(--color-status-mismatch-bg)';
      default:
        return 'var(--color-surface-default)';
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="Upload QR code image"
      style={{
        border: `2px dashed ${getBorderColor()}`,
        backgroundColor: getBackgroundColor(),
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-8) var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'border-color 150ms ease-out, background-color 150ms ease-out',
        minHeight: '200px',
        gap: 'var(--space-3)',
        ...style,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleInputChange}
        disabled={disabled}
        style={{ display: 'none' }}
      />

      {currentState === 'uploading' && (
        <>
          <Loader2
            size={32}
            style={{
              color: 'var(--color-brand-focus)',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div style={{ fontWeight: 600 }}>Uploading QR image...</div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Reading image stream into memory
          </p>
        </>
      )}

      {currentState === 'processing' && (
        <>
          <Loader2
            size={32}
            style={{
              color: 'var(--color-brand-focus)',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div style={{ fontWeight: 600 }}>Analyzing image...</div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Running deterministic binarization and matrix detection
          </p>
        </>
      )}

      {currentState === 'success' && (
        <>
          <CheckCircle2 size={32} style={{ color: 'var(--color-status-verified)' }} />
          <div style={{ fontWeight: 600, color: 'var(--color-status-verified)' }}>
            Image Uploaded Successfully
          </div>
          {fileName && (
            <code style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              {fileName}
            </code>
          )}
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Click or drop another image to replace
          </p>
        </>
      )}

      {currentState === 'failure' && (
        <>
          <AlertCircle size={32} style={{ color: 'var(--color-status-mismatch)' }} />
          <div style={{ fontWeight: 600, color: 'var(--color-status-mismatch)' }}>
            Image Ingestion Failed
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-status-mismatch)' }}>
            {errorMessage || 'Unsupported file format or unreadable image data.'}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {supportedFormats} ({maxSizeLabel})
          </p>
        </>
      )}

      {(currentState === 'idle' ||
        currentState === 'hover' ||
        currentState === 'dragover') && (
        <>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-secondary)',
            }}
          >
            <UploadCloud size={24} strokeWidth={1.75} />
          </div>

          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: 'var(--color-text-primary)',
              }}
            >
              Upload a QR image
            </div>
            <p
              style={{
                fontSize: '0.8125rem',
                marginTop: '4px',
                color: 'var(--color-text-secondary)',
              }}
            >
              Drag and drop your image file here, or click to browse
            </p>
          </div>

          <div
            style={{
              display: 'inline-flex',
              gap: '6px',
              padding: '2px 8px',
              backgroundColor: 'var(--color-surface-raised)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.6875rem',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            {supportedFormats} ({maxSizeLabel})
          </div>
        </>
      )}
    </div>
  );
};
