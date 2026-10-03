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
            gap: 'var(--space-3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: 'var(--color-text-primary)',
                }}
              >
                {APP_NAME} AI
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                Physical QR Tamper & Payment Destination Verification
              </span>
            </div>

            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
              }}
            >
              Architecture: React + Fastify + Supabase + Gemini
            </div>
          </div>

          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              maxWidth: '800px',
              lineHeight: 1.4,
            }}
          >
            <strong>Operational Notice:</strong> QRShield is a verification-assistance
            system. It does not have access to private banking ledgers, does not
            independently identify bank account owners, and does not process payments.
            Verification is based on deterministic destination comparison and physical
            reference analysis against registered merchant profiles.
          </p>

          <div
            style={{
              borderTop: '1px solid var(--color-border-subtle)',
              paddingTop: 'var(--space-3)',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span>
              &copy; {new Date().getFullYear()} QRShield Project. All rights reserved.
            </span>
            <span>Status: Phase 0 Foundation Complete</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
