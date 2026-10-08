import React from 'react';
import { Shield, Database, Sparkles, Lock, Mail, ExternalLink } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';

export const PrivacyPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        badge="Governance & Trust"
        title="Privacy Policy"
        description="How QRShield collects, processes, and protects merchant registration information, reference assets, and verification telemetry."
      />

      {/* 1. Core Principles */}
      <Card
        title="1. Core Principles & Non-Financial Scope"
        badge={
          <Shield
            size={16}
            style={{ color: 'var(--color-brand-focus)' }}
            aria-hidden="true"
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p
            style={{
              fontSize: '0.875rem',
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
            }}
          >
            QRShield is an evidence-based verification assistance tool. We operate
            strictly on optical QR matrix decoding, photographic quality evaluation, and
            comparison against registered merchant baselines.
          </p>
          <div
            style={{
              padding: 'var(--space-3) var(--space-4)',
              backgroundColor: 'var(--color-surface-sunken)',
              borderLeft: '3px solid var(--color-brand-primary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              lineHeight: 1.5,
              color: 'var(--color-text-secondary)',
            }}
          >
            <strong>Critical Distinctions:</strong>
            <ul style={{ margin: 'var(--space-2) 0 0 var(--space-4)', padding: 0 }}>
              <li>
                <strong>No Banking Ledger Access:</strong> QRShield does not connect to,
                query, or access private banking ledgers, bank account balances, or
                financial account records.
              </li>
              <li>
                <strong>No Payment Processing:</strong> QRShield does not process
                payments, route funds, handle financial transactions, or hold customer
                balances.
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* 2. Information Collected */}
      <Card
        title="2. Information Collected During Account Usage"
        badge={
          <Database
            size={16}
            style={{ color: 'var(--color-brand-focus)' }}
            aria-hidden="true"
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Merchant Profile Information
            </h4>
            <p
              style={{
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              When a merchant registers on QRShield, we collect the merchant business
              name, an optional contact email address, and system-assigned identifiers
              (such as the merchant UUID). This information is used exclusively to
              maintain the merchant's trusted registration record.
            </p>
          </div>

          <div>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Uploaded Reference QR Images
            </h4>
            <p
              style={{
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              Merchants may upload a reference physical QR image. This asset serves as the
              ground-truth baseline for projective homography alignment, visual deviation
              indexing, and physical tamper detection during verification scans. Reference
              images are stored in secure, isolated cloud storage.
            </p>
          </div>

          <div>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Verification Request Data
            </h4>
            <p
              style={{
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              When a user submits a candidate QR scan for verification, the image is
              transmitted to the QRShield verification service and processed in-memory.
              The image is evaluated for matrix decoding, photographic quality, and visual
              deviation against the registered baseline. Verification scan images are not
              permanently retained or shared with third parties.
            </p>
          </div>

          <div>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Authentication and Session Handling
            </h4>
            <p
              style={{
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              User authentication and session tokens are managed via secure JWT tokens.
              Session data is stored locally in browser session storage for active session
              persistence and is never transmitted to unauthorized endpoints.
            </p>
          </div>
        </div>
      </Card>

      {/* 3. Third-Party Services */}
      <Card
        title="3. Third-Party Services & Infrastructure"
        badge={
          <Lock
            size={16}
            style={{ color: 'var(--color-brand-focus)' }}
            aria-hidden="true"
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Supabase (Database & Storage)
            </h4>
            <p
              style={{
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              QRShield uses Supabase for PostgreSQL database storage and object storage.
              Access is enforced via Row Level Security (RLS) policies ensuring merchants
              can access only their own registered profile and reference assets.
            </p>
          </div>

          <div>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Google Gemini (Explanation Layer Only)
            </h4>
            <p
              style={{
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              Google Gemini is used exclusively as a downstream explanation layer to
              translate machine-readable evidence into neutral, non-accusatory customer
              summaries. Gemini never determines or alters canonical verification
              statuses. If Gemini is unavailable, the system automatically generates
              rule-based deterministic explanations with zero external data transfer.
            </p>
          </div>

          <div>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Hosting Platforms
            </h4>
            <p
              style={{
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              The frontend web application is hosted on Vercel's global edge network. The
              backend REST API service is hosted on Render in a hardened containerized
              environment.
            </p>
          </div>
        </div>
      </Card>

      {/* 4. Security & Retention */}
      <Card
        title="4. Security & Data Retention Principles"
        badge={
          <Sparkles
            size={16}
            style={{ color: 'var(--color-brand-focus)' }}
            aria-hidden="true"
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p
            style={{
              fontSize: '0.875rem',
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
            }}
          >
            We apply the principle of data minimization across all operations:
          </p>
          <ul
            style={{
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
              margin: '0 0 0 var(--space-4)',
              padding: 0,
            }}
          >
            <li>
              <strong>Ephemeral Verification:</strong> Verification scan images are
              processed in-memory and immediately discarded after computing the
              verification result.
            </li>
            <li>
              <strong>Strict Access Control:</strong> Database operations enforce
              PostgreSQL Row Level Security. Direct API access requires authenticated JWT
              credentials.
            </li>
            <li>
              <strong>Reference Image Retention:</strong> Reference QR assets remain
              stored only while the merchant maintains an active registration and may be
              replaced or deleted by the merchant.
            </li>
            <li>
              <strong>No Data Monetization:</strong> We do not sell, rent, or monetize
              merchant or verification data under any circumstances.
            </li>
          </ul>
        </div>
      </Card>

      {/* 5. Contact Information */}
      <Card
        title="5. Project Contact & Governance"
        badge={
          <Mail
            size={16}
            style={{ color: 'var(--color-brand-focus)' }}
            aria-hidden="true"
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p
            style={{
              fontSize: '0.875rem',
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
            }}
          >
            QRShield is developed as an open verification system. For inquiries, technical
            questions, or security feedback, contact us through the official project
            repository:
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <ExternalLink
              size={14}
              style={{ color: 'var(--color-brand-focus)' }}
              aria-hidden="true"
            />
            <a
              href="https://github.com/ReddyJahnaviDevarinti/QR-Shield"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-brand-focus)',
                textDecoration: 'none',
              }}
            >
              github.com/ReddyJahnaviDevarinti/QR-Shield
            </a>
          </div>
        </div>
      </Card>
    </div>
  );
};
