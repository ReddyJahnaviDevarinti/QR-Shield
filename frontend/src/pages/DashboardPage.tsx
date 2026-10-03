import React from 'react';
import { Building2, QrCode, History, Settings, CreditCard } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { DataRow } from '../components/DataRow';
import { Input } from '../components/Input';

export const DashboardPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <PageHeader
        badge="Administration"
        title="Merchant Registry Workspace"
        description="Manage business profiles, authorized payment destinations, baseline reference QR imagery, and auditable verification history."
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 'var(--space-6)',
          alignItems: 'start',
        }}
      >
        {/* ================================================== */}
        {/* 1. Merchant Identity                               */}
        {/* ================================================== */}
        <Card
          title="1. Merchant Identity"
          subtitle="Registered business credentials and verification authority"
          badge={
            <Building2
              size={16}
              strokeWidth={1.75}
              style={{ color: 'var(--color-text-muted)' }}
              aria-hidden="true"
            />
          }
        >
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
          >
            <DataRow
              label="Session State"
              value="Authentication not configured"
              isMonospace={false}
            />
            <DataRow
              label="Merchant Profile"
              value="Merchant profile not connected"
              isMonospace={false}
            />
            <DataRow label="Merchant Identifier" value="Not assigned" isMonospace />
            <DataRow label="Database Tenant ID" value="—" isMonospace />

            <div
              style={{
                marginTop: 'var(--space-3)',
                padding: 'var(--space-3)',
                backgroundColor: 'var(--color-surface-raised)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-subtle)',
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
              }}
            >
              Notice: Merchant profile management will bind to Supabase Auth and RLS in
              Phase 3.
            </div>
          </div>
        </Card>

        {/* ================================================== */}
        {/* 2. Trusted Payment Destinations                   */}
        {/* ================================================== */}
        <Card
          title="2. Trusted Payment Destinations"
          subtitle="Authorized Virtual Payment Addresses (VPAs) and URLs"
          badge={
            <CreditCard
              size={16}
              strokeWidth={1.75}
              style={{ color: 'var(--color-text-muted)' }}
              aria-hidden="true"
            />
          }
        >
          <EmptyState
            icon={<CreditCard size={20} />}
            title="No trusted destinations registered yet."
            description="Register the authoritative payment target (such as your merchant UPI VPA) to enable automated destination parity checking."
          />
        </Card>

        {/* ================================================== */}
        {/* 3. Registered Reference QR Assets                  */}
        {/* ================================================== */}
        <Card
          title="3. Registered Reference QR Assets"
          subtitle="Baseline visual references for physical tamper inspection"
          badge={
            <QrCode
              size={16}
              strokeWidth={1.75}
              style={{ color: 'var(--color-text-muted)' }}
              aria-hidden="true"
            />
          }
        >
          <EmptyState
            icon={<QrCode size={20} />}
            title="No reference QR assets uploaded yet."
            description="Upload an official high-resolution reference image of your counter stand to enable physical sticker overlay detection."
          />
        </Card>

        {/* ================================================== */}
        {/* 4. Verification History                            */}
        {/* ================================================== */}
        <Card
          title="4. Verification History"
          subtitle="Chronological audit records of scans evaluated against this merchant"
          badge={
            <History
              size={16}
              strokeWidth={1.75}
              style={{ color: 'var(--color-text-muted)' }}
              aria-hidden="true"
            />
          }
        >
          <EmptyState
            icon={<History size={20} />}
            title="No verification queries logged yet."
            description="When scans are evaluated against registered destinations, tamper verdicts and timestamped evidence will appear here."
          />
        </Card>

        {/* ================================================== */}
        {/* 5. Configuration & Verification Policies           */}
        {/* ================================================== */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Card
            title="5. Verification Policies & Configuration"
            subtitle="Threshold sensitivities and security dispatch rules"
            badge={
              <Settings
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--color-text-muted)' }}
                aria-hidden="true"
              />
            }
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
                <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                  Strict Destination Matching
                </div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '2px',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  Require exact string parity on payee VPA (`pa`) and handle domain.
                </p>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-status-verified)',
                  }}
                >
                  ENFORCED (Default)
                </span>
              </div>

              <div
                style={{
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-surface-raised)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                  Visual Anomaly Sensitivity
                </div>
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    marginTop: '2px',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  Flag candidate sticker seams and border deviations against reference
                  assets.
                </p>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  MEDIUM THRESHOLD
                </span>
              </div>

              <div
                style={{
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-surface-raised)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                  Alert Webhook Target
                </div>
                <Input
                  label="Notification URL (Optional)"
                  placeholder="https://api.merchant.com/qrshield-webhook"
                  disabled
                  helperText="Webhook triggers upon DESTINATION_MISMATCH detection."
                  isMonospace
                  style={{ marginTop: 'var(--space-2)' }}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
