import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: React.CSSProperties;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'An error occurred',
  message,
  onRetry,
  retryLabel = 'Try again',
  style,
}) => {
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-8) var(--space-4)',
        border: '1px solid var(--color-status-mismatch-border)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--color-status-mismatch-bg)',
        ...style,
      }}
    >
      <div
        style={{
          color: 'var(--color-status-mismatch)',
          marginBottom: 'var(--space-3)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden="true"
      >
        <AlertCircle size={32} strokeWidth={2} />
      </div>

      <h4
        style={{
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-1)',
        }}
      >
        {title}
      </h4>

      <p
        style={{
          fontSize: '0.8125rem',
          color: 'var(--color-text-secondary)',
          maxWidth: '420px',
          lineHeight: 1.45,
          marginBottom: onRetry ? 'var(--space-4)' : 0,
        }}
      >
        {message}
      </p>

      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRetry}
          icon={<RefreshCw size={14} />}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
