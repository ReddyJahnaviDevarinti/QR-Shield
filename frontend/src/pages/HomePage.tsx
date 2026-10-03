import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  LayoutDashboard,
  Cpu,
  FileCheck,
  Eye,
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { VerificationStatus } from '../types';
import { STATUS_DEFINITIONS } from '../lib/constants';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const statusKeys: VerificationStatus[] = [
    'VERIFIED',
    'DESTINATION_MISMATCH',
    'SUSPICIOUS',
    'UNVERIFIED',
    'INSUFFICIENT_EVIDENCE',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      {/* First Viewport: Primary Product Entry Point */}
      <section
        className="card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          borderLeft: '4px solid var(--color-brand-primary)',
          padding: 'var(--space-8) var(--space-6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <ShieldCheck
            size={18}
            strokeWidth={2}
            style={{ color: 'var(--color-brand-focus)' }}
            aria-hidden="true"
          />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              color: 'var(--color-brand-focus)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Payment QR Verification
          </span>
        </div>

        <h1
          style={{
            fontSize: '2rem',
            lineHeight: 1.2,
            letterSpacing: '-0.025em',
            maxWidth: '820px',
          }}
        >
          Verify that a payment QR matches a trusted registered destination.
        </h1>

        <p
          style={{
            maxWidth: '780px',
            fontSize: '1rem',
            lineHeight: 1.6,
            color: 'var(--color-text-secondary)',
          }}
        >
          QRShield compares the scanned payment destination with a trusted merchant
          registration and reports evidence-based verification results. It identifies
          destination mismatches, unverified targets, and physical sticker anomalies.
        </p>

        {/* Primary and Secondary Actions */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
            marginTop: 'var(--space-2)',
          }}
        >
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/verify')}
            icon={<ArrowRight size={16} />}
            iconPosition="right"
          >
            Verify a QR
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('/dashboard')}
            icon={<LayoutDashboard size={16} />}
          >
            Open Dashboard
          </Button>
        </div>
      </section>

      {/* Compact Product Explanation Section */}
      <section
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            Verification Architecture
          </h2>
          <p style={{ marginTop: '2px', color: 'var(--color-text-muted)' }}>
            Evidence-oriented verification process across three deterministic inspection
            stages.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-4)',
          }}
        >
          <Card
            title="1. Deterministic Payload Extraction"
            badge={
              <Cpu
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--color-text-muted)' }}
                aria-hidden="true"
              />
            }
          >
            <p style={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
              QR matrices are extracted and decoded into normalized payment URIs (UPI
              strings). Core fields including payee VPA, payee name, transaction amount,
              and merchant category codes are isolated without heuristic speculation.
            </p>
          </Card>

          <Card
            title="2. Destination Comparison"
            badge={
              <FileCheck
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--color-text-muted)' }}
                aria-hidden="true"
              />
            }
          >
            <p style={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
              Extracted payment addresses are evaluated against the merchant’s registered
              profile. Direct string parity confirms authorization, or triggers an
              immediate destination mismatch alert before payment execution.
            </p>
          </Card>

          <Card
            title="3. Physical Anomaly Indicators"
            badge={
              <Eye
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--color-text-muted)' }}
                aria-hidden="true"
              />
            }
          >
            <p style={{ fontSize: '0.8125rem', lineHeight: 1.5 }}>
              When a baseline reference image exists in the registry, comparison
              inspection checks for physical sticker overlays, border misalignments, and
              structural matrix distortions indicative of physical tampering.
            </p>
          </Card>
        </div>
      </section>

      {/* Canonical Status System Overview */}
      <section
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
      >
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            Status Classification System
          </h2>
          <p style={{ marginTop: '2px', color: 'var(--color-text-muted)' }}>
            Every verification query resolves into exactly one of five canonical statuses.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
          }}
        >
          {statusKeys.map((status) => {
            const def = STATUS_DEFINITIONS[status];
            return (
              <div
                key={status}
                className="panel"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-4)',
                  flexWrap: 'wrap',
                  padding: 'var(--space-3) var(--space-4)',
                }}
              >
                <div style={{ flex: '0 0 auto' }}>
                  <StatusBadge status={status} />
                </div>
                <div style={{ flex: '1 1 320px' }}>
                  <span
                    style={{
                      color: 'var(--color-text-secondary)',
                      fontSize: '0.8125rem',
                      lineHeight: 1.45,
                    }}
                  >
                    {def.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
