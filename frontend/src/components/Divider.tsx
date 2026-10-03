import React from 'react';

export interface DividerProps {
  label?: string;
  spacing?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export const Divider: React.FC<DividerProps> = ({ label, spacing = 'md', style }) => {
  const getMargin = () => {
    switch (spacing) {
      case 'sm':
        return 'var(--space-2) 0';
      case 'lg':
        return 'var(--space-6) 0';
      case 'md':
      default:
        return 'var(--space-4) 0';
    }
  };

  if (!label) {
    return (
      <hr
        style={{
          border: 'none',
          borderTop: '1px solid var(--color-border-subtle)',
          margin: getMargin(),
          width: '100%',
          ...style,
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        margin: getMargin(),
        gap: 'var(--space-3)',
        width: '100%',
        ...style,
      }}
    >
      <div
        style={{
          flex: 1,
          height: '1px',
          backgroundColor: 'var(--color-border-subtle)',
        }}
      />
      <span
        style={{
          fontSize: '0.6875rem',
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--color-text-muted)',
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: '1px',
          backgroundColor: 'var(--color-border-subtle)',
        }}
      />
    </div>
  );
};
