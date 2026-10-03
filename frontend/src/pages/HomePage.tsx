import React from 'react';
import { Link } from 'react-router-dom';
import { APP_MISSION, STATUS_DEFINITIONS } from '../lib/constants';
import { StatusBadge } from '../components/StatusBadge';
import { VerificationStatus } from '../types';

export const HomePage: React.FC = () => {
  const statusKeys: VerificationStatus[] = [
    'VERIFIED',
    'DESTINATION_MISMATCH',
    'SUSPICIOUS',
    'UNVERIFIED',
    'INSUFFICIENT_EVIDENCE',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* Product Hero / Technical Overview */}
      <section
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          borderLeft: '4px solid var(--color-brand-primary)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--color-brand-hover)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Verification Assistance System
        </span>

        <h1>{APP_MISSION}</h1>

        <p style={{ maxWidth: '850px', fontSize: '1rem', lineHeight: 1.6 }}>
          Physical QR codes deployed at counters, kiosks, and storefronts can be altered
          or covered with adhesive stickers that redirect payments to unauthorized
          accounts. QRShield AI provides a deterministic verification workflow to confirm
          that an uploaded or captured QR code targets the registered merchant
          destination.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
          <Link
            to="/verify"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '40px',
              padding: '0 20px',
              backgroundColor: 'var(--color-brand-primary)',
              color: '#ffffff',
              borderRadius: 'var(--radius-md)',
              fontWeight: 500,
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            Launch Verification Console
          </Link>
          <Link
            to="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '40px',
              padding: '0 20px',
              backgroundColor: 'var(--color-surface-raised)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontWeight: 500,
              fontSize: '0.875rem',
              textDecoration: 'none',
            }}
          >
            Merchant Registry View
          </Link>
        </div>
      </section>

      {/* Technical Workflow Pillars */}
      <section
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <h2>Verification Mechanism</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div className="card">
            <h3 style={{ marginBottom: '8px' }}>1. Deterministic Payload Extraction</h3>
            <p>
              Scans are decoded using mathematical QR matrix detection. Payment URIs (such
              as standard UPI strings) are parsed into normalized targets (VPA, payee
              name, amount, merchant category code).
            </p>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '8px' }}>2. Destination Comparison</h3>
            <p>
              The extracted payment address is checked against the registered merchant
              profile in the database. Exact string equality determines whether the
              scanned destination matches or conflicts with the merchant record.
            </p>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '8px' }}>3. Visual Anomaly Indicators</h3>
            <p>
              When a baseline reference image exists, lightweight image difference checks
              evaluate the physical matrix for sticker boundaries, overlay borders, and
              structural deviation.
            </p>
          </div>
        </div>
      </section>

      {/* Canonical Status Classifications */}
      <section
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <h2>Canonical Status Classifications</h2>
        <p>
          QRShield evaluates evidence strictly and outputs exactly one of five canonical
          statuses. The system never outputs unsupported fraud claims.
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          {statusKeys.map((status) => {
            const def = STATUS_DEFINITIONS[status];
            return (
              <div
                key={status}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '0 0 auto' }}>
                  <StatusBadge status={status} />
                </div>
                <div style={{ flex: '1 1 300px' }}>
                  <p
                    style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}
                  >
                    {def.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
