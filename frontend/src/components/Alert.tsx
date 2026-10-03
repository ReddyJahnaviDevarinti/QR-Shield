import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export interface AlertProps {
  variant?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  action,
  style,
}) => {
  const getVariantConfig = () => {
    switch (variant) {
      case 'success':
        return {
          icon: <CheckCircle2 size={18} strokeWidth={2} />,
          borderColor: 'var(--color-status-verified-border)',
          backgroundColor: 'var(--color-status-verified-bg)',
          textColor: 'var(--color-status-verified)',
          role: 'status',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={18} strokeWidth={2} />,
          borderColor: 'var(--color-status-suspicious-border)',
          backgroundColor: 'var(--color-status-suspicious-bg)',
          textColor: 'var(--color-status-suspicious)',
          role: 'alert',
        };
      case 'error':
        return {
          icon: <AlertCircle size={18} strokeWidth={2} />,
          borderColor: 'var(--color-status-mismatch-border)',
          backgroundColor: 'var(--color-status-mismatch-bg)',
          textColor: 'var(--color-status-mismatch)',
          role: 'alert',
        };
      case 'info':
      default:
        return {
          icon: <Info size={18} strokeWidth={2} />,
          borderColor: 'var(--color-border-subtle)',
          backgroundColor: 'var(--color-surface-raised)',
          textColor: 'var(--color-brand-focus)',
          role: 'status',
        };
    }
  };

  const config = getVariantConfig();

  return (
    <div
      role={config.role}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 'var(--space-3)',
        padding: 'var(--space-3) var(--space-4)',
        backgroundColor: config.backgroundColor,
        border: `1px solid ${config.borderColor}`,
        borderRadius: 'var(--radius-md)',
        fontSize: '0.875rem',
        ...style,
      }}
    >
      <span
        style={{
          color: config.textColor,
          display: 'inline-flex',
          marginTop: '2px',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {config.icon}
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {title && (
          <div
            style={{
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: '2px',
            }}
          >
            {title}
          </div>
        )}
        <div style={{ color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
          {children}
        </div>
      </div>

      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
};
