import React from 'react';
import { APP_NAME } from '../lib/constants';

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--color-border-subtle)',
        backgroundColor: 'var(--color-surface-default)',
        paddingTop: 'var(--space-6)',
        paddingBottom: 'var(--space-6)',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 'var(--space-3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: 'var(--color-text-primary)',
                }}
              >
                {APP_NAME}
              </span>
              <span
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: '0.75rem',
                }}
              >
                — Payment QR Verification
              </span>
            </div>

            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                color: 'var(--color-text-muted)',
              }}
            >
              UI Foundation Phase
            </div>
          </div>

          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              maxWidth: '820px',
              lineHeight: 1.5,
            }}
          >
            <strong>Operational Notice:</strong> QRShield compares scanned payment
            destinations with trusted merchant registrations and reports evidence-based
            verification results. It does not have access to private banking ledgers, does
            not independently identify bank account owners, and does not process financial
            transactions.
          </p>

          <div
            style={{
              borderTop: '1px solid var(--color-border-subtle)',
              paddingTop: 'var(--space-3)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.6875rem',
              color: 'var(--color-text-muted)',
              flexWrap: 'wrap',
              gap: 'var(--space-2)',
            }}
          >
            <span>&copy; {new Date().getFullYear()} QRShield Project.</span>
            <span>
              Deterministic verification + reference physical anomaly inspection
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
