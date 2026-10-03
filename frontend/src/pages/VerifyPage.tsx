import React from 'react';
import { StatusBadge } from '../components/StatusBadge';

export const VerifyPage: React.FC = () => {
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
          Console
        </span>
        <h1 style={{ marginTop: '4px' }}>QR Verification Console</h1>
        <p style={{ marginTop: '4px' }}>
          Ingest a physical QR photograph or payment payload to verify the destination
          against registered merchant records.
        </p>
      </div>

      {/* Planned Feature / Ingestion Console Skeleton */}
      <div
        className="card"
        style={{
          border: '2px dashed var(--color-border-strong)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-12) var(--space-6)',
          textAlign: 'center',
          backgroundColor: 'var(--color-surface-default)',
          gap: 'var(--space-4)',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-surface-raised)',
            border: '1px solid var(--color-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-secondary)',
          }}
          aria-hidden="true"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <rect x="7" y="7" width="3" height="3" />
            <rect x="14" y="7" width="3" height="3" />
            <rect x="7" y="14" width="3" height="3" />
            <path d="M14 14h3v3h-3z" />
          </svg>
        </div>

        <div style={{ maxWidth: '480px' }}>
          <h3 style={{ marginBottom: '8px' }}>Image Ingestion Pipeline (Phase 4)</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            The WebRTC camera viewfinder and drag-and-drop file ingestion interface will
            be implemented in Phase 4. Decoded payloads will be evaluated
            deterministically in Phase 5.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: '8px',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              padding: '4px 8px',
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-muted)',
            }}
          >
            Target Formats: JPEG, PNG, WEBP
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--font-mono)',
              padding: '4px 8px',
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-muted)',
            }}
          >
            Max File Size: 10 MB
          </span>
        </div>
      </div>

      {/* Target Status Demonstration */}
      <div
        className="card"
        style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
      >
        <h3>Engine Output Classification States</h3>
        <p>
          Once connected, the verification engine will return one of the following
          evaluated states with zero speculative fraud claims:
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <StatusBadge status="VERIFIED" />
          <StatusBadge status="DESTINATION_MISMATCH" />
          <StatusBadge status="SUSPICIOUS" />
          <StatusBadge status="UNVERIFIED" />
          <StatusBadge status="INSUFFICIENT_EVIDENCE" />
        </div>
      </div>
    </div>
  );
};
