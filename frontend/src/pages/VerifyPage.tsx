import React, { useState } from 'react';
import {
  Camera,
  FileSearch,
  ArrowRightLeft,
  Image as ImageIcon,
  AlertTriangle,
  FileText,
  ShieldQuestion,
  HelpCircle,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { FileDropzone } from '../components/FileDropzone';
import { Input } from '../components/Input';
import { EmptyState } from '../components/EmptyState';

export const VerifyPage: React.FC = () => {
  const [merchantId, setMerchantId] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <PageHeader
        badge="Verification Console"
        title="QR Verification Console"
        description="Ingest a physical QR photograph or payment payload to verify the destination parity against registered merchant records."
      />

      {/* Main Console Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 'var(--space-6)',
          alignItems: 'start',
        }}
      >
        {/* ================================================== */}
        {/* SECTION A: Input Area                              */}
        {/* ================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Card
            title="A. QR Ingestion & Target"
            subtitle="Upload an image or capture via device camera"
          >
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
            >
              {/* Optional Merchant ID targeting */}
              <Input
                label="Merchant Reference Identifier (Optional)"
                placeholder="e.g., MERCH-BLR-0042"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                helperText="If specified, verifies parity against this merchant's registered destination."
                isMonospace
              />

              {/* Drag and Drop Zone */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                }}
              >
                <span
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: 500,
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Upload QR Image
                </span>
                <FileDropzone
                  state="idle"
                  supportedFormats="PNG, JPG or WEBP"
                  maxSizeLabel="Max file size 10MB"
                  onFileSelected={() => {
                    /* UI Foundation: No actual verification engine connected */
                  }}
                />
              </div>

              {/* Camera Capture Shell */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-3) var(--space-4)',
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                >
                  <Camera
                    size={18}
                    style={{ color: 'var(--color-text-muted)' }}
                    aria-hidden="true"
                  />
                  <span
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    Device Camera Scanner
                  </span>
                </div>
                <Button variant="secondary" size="sm" disabled>
                  Launch Camera
                </Button>
              </div>

              <div
                style={{
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text-muted)',
                  borderTop: '1px solid var(--color-border-subtle)',
                  paddingTop: 'var(--space-3)',
                }}
              >
                Execution Note: Scanning and decoding pipelines connect in Phase 4.
              </div>
            </div>
          </Card>
        </div>

        {/* ================================================== */}
        {/* SECTIONS B-G: Verification Evaluation Workspace   */}
        {/* ================================================== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* SECTION B: Verification State Area */}
          <Card
            title="B. Verification State"
            subtitle="Engine classification and confidence telemetry"
          >
            <EmptyState
              icon={<ShieldQuestion size={22} />}
              title="No scan submitted."
              description="Submit a QR image or payload in Section A to trigger deterministic destination matching and physical inspection."
            />
          </Card>

          {/* SECTION C: Decoded Payload Section */}
          <Card
            title="C. Decoded Payload"
            subtitle="Raw URI elements extracted from matrix"
            badge={
              <FileSearch
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--color-text-muted)' }}
                aria-hidden="true"
              />
            }
          >
            <div
              style={{
                padding: 'var(--space-4)',
                backgroundColor: 'var(--color-surface-raised)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <EmptyState
                title="No payload decoded."
                description="Decoded URI parameters (pa, pn, mc, am, tr) will appear here in monospace rows."
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  padding: 'var(--space-3)',
                }}
              />
            </div>
          </Card>

          {/* SECTION D: Expected vs Detected Destination Section */}
          <Card
            title="D. Destination Parity"
            subtitle="Expected registered destination vs detected scan target"
            badge={
              <ArrowRightLeft
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--space-3)',
              }}
            >
              <div
                style={{
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  Expected Destination
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                    fontStyle: 'italic',
                  }}
                >
                  Awaiting merchant selection
                </div>
              </div>

              <div
                style={{
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    marginBottom: 'var(--space-1)',
                  }}
                >
                  Detected Destination
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-muted)',
                    fontStyle: 'italic',
                  }}
                >
                  Awaiting scan submission
                </div>
              </div>
            </div>
          </Card>

          {/* SECTION E: Visual Evidence Section */}
          <Card
            title="E. Visual Evidence"
            subtitle="Reference comparison and physical overlay inspection"
            badge={
              <ImageIcon
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--color-text-muted)' }}
                aria-hidden="true"
              />
            }
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-6)',
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px dashed var(--color-border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-muted)',
                fontSize: '0.8125rem',
              }}
            >
              Visual comparison viewports reserve space for side-by-side reference
              verification.
            </div>
          </Card>

          {/* SECTION F: Risk Factors Section */}
          <Card
            title="F. Risk Factors"
            subtitle="Evaluated physical and semantic risk signals"
            badge={
              <AlertTriangle
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--color-text-muted)' }}
                aria-hidden="true"
              />
            }
          >
            <div
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
              }}
            >
              Signals checked during analysis:
              <ul
                style={{
                  marginTop: 'var(--space-2)',
                  paddingLeft: 'var(--space-4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-1)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text-muted)',
                }}
              >
                <li>&bull; Sticker Boundary Overlay Anomaly</li>
                <li>&bull; Domain/VPA Character Spoofing</li>
                <li>&bull; Unregistered Payee Target</li>
                <li>&bull; Severe Matrix Warping or Parallax</li>
              </ul>
            </div>
          </Card>

          {/* SECTION G: Explanation Section */}
          <Card
            title="G. Explanation & Reasoning"
            subtitle="Deterministic decision rationales"
            badge={
              <FileText
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--color-text-muted)' }}
                aria-hidden="true"
              />
            }
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-2)',
                padding: 'var(--space-3)',
                backgroundColor: 'var(--color-surface-raised)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <HelpCircle
                size={16}
                style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}
              />
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                Auditable reasoning logs will detail whether parity was verified or why
                evidence was deemed insufficient.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
