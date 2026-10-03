import React from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  style,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--space-8) var(--space-4)',
        border: '1px dashed var(--color-border-subtle)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'rgba(17, 25, 39, 0.4)',
        minHeight: '160px',
        ...style,
      }}
    >
      <div
        style={{
          color: 'var(--color-text-muted)',
          marginBottom: 'var(--space-3)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--color-surface-raised)',
          border: '1px solid var(--color-border-subtle)',
        }}
        aria-hidden="true"
      >
        {icon || <Inbox size={20} strokeWidth={1.75} />}
      </div>

      <h4
        style={{
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: description ? 'var(--space-1)' : 0,
        }}
      >
        {title}
      </h4>

      {description && (
        <p
          style={{
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)',
            maxWidth: '380px',
            lineHeight: 1.45,
            marginBottom: action ? 'var(--space-4)' : 0,
          }}
        >
          {description}
        </p>
      )}

      {action && <div>{action}</div>}
    </div>
  );
};
