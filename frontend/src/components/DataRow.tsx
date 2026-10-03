import React from 'react';

export interface DataRowProps {
  label: string;
  value: React.ReactNode;
  isMonospace?: boolean;
  annotation?: React.ReactNode;
  style?: React.CSSProperties;
}

export const DataRow: React.FC<DataRowProps> = ({
  label,
  value,
  isMonospace = true,
  annotation,
  style,
}) => {
  return (
    <div
      className="data-row"
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        padding: 'var(--space-2) 0',
        borderBottom: '1px solid var(--color-border-subtle)',
        gap: 'var(--space-4)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span
          className="data-row__label"
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {label}
        </span>
        {annotation && (
          <span
            style={{
              fontSize: '0.6875rem',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-sans)',
              marginTop: '1px',
            }}
          >
            {annotation}
          </span>
        )}
      </div>

      <div
        className="data-row__value"
        style={{
          fontFamily: isMonospace ? 'var(--font-mono)' : 'var(--font-sans)',
          fontSize: '0.8125rem',
          color: 'var(--color-text-primary)',
          textAlign: 'right',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </div>
    </div>
  );
};
