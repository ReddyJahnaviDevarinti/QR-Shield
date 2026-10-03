import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  label?: string;
  variant?: 'spinner' | 'skeleton';
  height?: string | number;
  style?: React.CSSProperties;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'Loading...',
  variant = 'spinner',
  height,
  style,
}) => {
  if (variant === 'skeleton') {
    return (
      <div
        className="skeleton"
        role="status"
        aria-label={label}
        style={{
          width: '100%',
          height: height || '80px',
          ...style,
        }}
      />
    );
  }

  return (
    <div
      role="status"
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8) var(--space-4)',
        gap: 'var(--space-3)',
        color: 'var(--color-text-muted)',
        minHeight: height || '140px',
        ...style,
      }}
    >
      <Loader2
        size={24}
        strokeWidth={2}
        style={{
          color: 'var(--color-brand-focus)',
          animation: 'spin 1s linear infinite',
        }}
        aria-hidden="true"
      />
      <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)' }}>
        {label}
      </span>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
