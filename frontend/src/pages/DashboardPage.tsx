import React from 'react';

export const DashboardPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: 'var(--color-brand-hover)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Administration
        </span>
        <h1 style={{ marginTop: '4px' }}>Merchant Registry Dashboard</h1>
        <p style={{ marginTop: '4px' }}>
          Manage trusted business identities, authorized payment VPAs, and baseline
          reference QR imagery.
        </p>
      </div>

      {/* Empty State / Planned Architecture Overview */}
      <div
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-subtle)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
            }}
          >
            03
          </span>
          <div>
            <h3>Merchant Registration (Planned: Phase 3)</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
              Authentication prerequisites: Phase 1 (Supabase Auth)
            </p>
          </div>
        </div>

        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          Active merchant sessions and reference asset configuration require Supabase Auth
          integration (scheduled for Phase 1) and database persistence schema setup
          (scheduled for Phase 3). No synthetic or mock customer profiles are loaded in
          accordance with data integrity standards.
        </p>

        <div
          style={{
            borderTop: '1px solid var(--color-border-subtle)',
            paddingTop: 'var(--space-4)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-surface-raised)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-muted)',
              }}
            >
              Planned Module
            </div>
            <div style={{ fontWeight: 600, marginTop: '4px' }}>
              Trusted Destination Registry
            </div>
            <div
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
                marginTop: '4px',
              }}
            >
              Exact VPA and payment URL mapping per merchant ID.
            </div>
          </div>

          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-surface-raised)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-muted)',
              }}
            >
              Planned Module
            </div>
            <div style={{ fontWeight: 600, marginTop: '4px' }}>Reference QR Vault</div>
            <div
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
                marginTop: '4px',
              }}
            >
              High-resolution baseline photos stored in Supabase Storage with RLS.
            </div>
          </div>

          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-surface-raised)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-text-muted)',
              }}
            >
              Planned Module
            </div>
            <div style={{ fontWeight: 600, marginTop: '4px' }}>
              Audit Verification Logs
            </div>
            <div
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
                marginTop: '4px',
              }}
            >
              Immutable history of verification queries for registered merchant stands.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
