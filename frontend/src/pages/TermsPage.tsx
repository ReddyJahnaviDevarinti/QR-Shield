import React from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Scale,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';

export const TermsPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader
        badge="Governance & Trust"
        title="Terms of Service"
        description="Operational terms, limitations, and user responsibilities governing use of the QRShield verification system."
      />

      {/* 1. Intended Use & Scope */}
      <Card
        title="1. Intended Use"
        badge={
          <FileText
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
            QRShield is designed as a verification-assistance tool. Its purpose is to help
            merchants and consumers verify payment QR codes against registered merchant
            baselines and inspect for potential physical overlay tampering or payload
            redirects before payments are initiated.
          </p>
          <p
            style={{
              fontSize: '0.8125rem',
              lineHeight: 1.5,
              color: 'var(--color-text-secondary)',
            }}
          >
            The system provides evidence-based analysis: comparing decoded payment
            destinations (such as UPI Virtual Payment Addresses) with trusted merchant
            registrations and measuring photographic consistency against registered
            reference QR baselines.
          </p>
        </div>
      </Card>

      {/* 2. Acceptable Use */}
      <Card
        title="2. Acceptable Use"
        badge={
          <CheckCircle
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
            Users agree to use QRShield solely for lawful verification and evaluation
            purposes:
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
              <strong>Authorized Registration:</strong> Merchants may only register
              business names, payment destinations, and reference QR codes that they are
              authorized to operate.
            </li>
            <li>
              <strong>No Malicious Input:</strong> Users must not upload malicious files,
              crafted exploits, or automated bulk requests intended to disrupt service
              availability.
            </li>
            <li>
              <strong>No Circumvention:</strong> Users must not attempt to bypass
              authentication controls, Row Level Security policies, or access controls.
            </li>
          </ul>
        </div>
      </Card>

      {/* 3. Verification vs Fraud Detection */}
      <Card
        title="3. Distinction Between Verification & Fraud Detection"
        badge={
          <ShieldAlert
            size={16}
            style={{ color: 'var(--color-brand-focus)' }}
            aria-hidden="true"
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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
            <strong>Important Operational Clarifications:</strong>
            <ul style={{ margin: 'var(--space-2) 0 0 var(--space-4)', padding: 0 }}>
              <li>
                <strong>Verification, Not Universal Fraud Detection:</strong> QRShield
                confirms consistency against registered baselines. It is not an exhaustive
                fraud detection engine and cannot detect fraud occurring through channels
                outside optical QR inspection.
              </li>
              <li>
                <strong>UNVERIFIED Does Not Mean Fraudulent:</strong> An UNVERIFIED status
                simply means that no matching merchant registration exists in the QRShield
                registry for the decoded destination. Many legitimate merchants operate
                without a QRShield registration.
              </li>
              <li>
                <strong>VERIFIED Is Not a Solvency Guarantee:</strong> A VERIFIED status
                indicates the scanned code matches the merchant baseline with no detected
                physical anomalies; it does not guarantee the solvency, trustworthiness,
                or commercial legitimacy of the merchant.
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* 4. Limitations & User Responsibility */}
      <Card
        title="4. Limitations of QR Verification & User Responsibility"
        badge={
          <AlertTriangle
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
              Photographic and Optical Constraints
            </h4>
            <p
              style={{
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              Optical verification depends on image quality, illumination, focus,
              resolution, and angle. Images that suffer from blur, glare, extreme skew, or
              damage may yield an INSUFFICIENT_EVIDENCE result and require re-capture
              under improved lighting.
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
              No Payment Processing or Financial Guarantee
            </h4>
            <p
              style={{
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              QRShield does not process payments, handle money, charge accounts, or
              communicate with banking settlement networks. QRShield does not guarantee
              payment safety.
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
              User Responsibility for Financial Decisions
            </h4>
            <p
              style={{
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              Users remain solely responsible for reviewing payee details (such as payee
              name and handle) in their banking or UPI application before confirming any
              payment. QRShield results are advisory and must not replace individual
              vigilance.
            </p>
          </div>
        </div>
      </Card>

      {/* 5. Service Availability & IP */}
      <Card
        title="5. Service Availability & Intellectual Property"
        badge={
          <Scale
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
              Availability Limitations
            </h4>
            <p
              style={{
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              QRShield is provided on an &quot;as is&quot; and &quot;as available&quot;
              basis without warranties of any kind, whether express or implied. We do not
              guarantee uninterrupted, timely, or error-free operation.
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
              Intellectual Property & Open Source
            </h4>
            <p
              style={{
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              QRShield source code, designs, and documentation are maintained in the
              official project repository. Usage and contributions are governed by the
              project repository licensing.
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
              Contact
            </h4>
            <p
              style={{
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                color: 'var(--color-text-secondary)',
              }}
            >
              Questions regarding these terms may be directed to the project issue tracker
              at:
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginTop: 'var(--space-1)',
              }}
            >
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
        </div>
      </Card>
    </div>
  );
};
