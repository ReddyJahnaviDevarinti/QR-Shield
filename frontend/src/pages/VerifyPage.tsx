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
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { FileDropzone, DropzoneState } from '../components/FileDropzone';
import { Input } from '../components/Input';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import { DataRow } from '../components/DataRow';
import { Alert } from '../components/Alert';
import { LoadingState } from '../components/LoadingState';
import { verifyQr, VerifySuccessResponse, ApiClientError } from '../lib/api';

function formatRecommendation(rec: string): string {
  switch (rec) {
    case 'REVIEW_NOT_REQUIRED':
      return 'Proceed with payment. No visual or destination anomalies detected.';
    case 'DO_NOT_PROCEED_WITH_PAYMENT':
      return 'Do not proceed with payment. The scanned destination conflicts with the registered payee.';
    case 'VERIFY_MERCHANT_BEFORE_PAYMENT':
      return 'Verify the merchant name and destination manually before approving payment.';
    case 'MANUAL_INSPECTION_RECOMMENDED':
      return 'Manual physical inspection recommended due to visual or matrix anomalies.';
    case 'CAPTURE_CLEARER_IMAGE':
      return 'Capture a clearer, higher-resolution photograph with good lighting and contrast.';
    default:
      return rec;
  }
}

export const VerifyPage: React.FC = () => {
  const [merchantId, setMerchantId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [result, setResult] = useState<VerifySuccessResponse | null>(null);

  const handleFileSelected = async (file: File) => {
    if (isLoading) return;

    setSelectedFile(file);
    setError(null);
    setIsLoading(true);

    try {
      const response = await verifyQr(file, {
        merchantId: merchantId.trim() || undefined,
      });
      setResult(response);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError(err);
      } else {
        setError(
          new ApiClientError(
            'An unexpected error occurred during verification.',
            500,
            'E_UNEXPECTED',
            err instanceof Error ? err.message : String(err),
          ),
        );
      }
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  const handleRetry = () => {
    if (selectedFile) {
      handleFileSelected(selectedFile);
    }
  };

  // Determine dropzone state
  let dropzoneState: DropzoneState = 'idle';
  if (isLoading) {
    dropzoneState = 'processing';
  } else if (error) {
    dropzoneState = 'failure';
  } else if (result) {
    dropzoneState = 'success';
  }

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
                placeholder="e.g., 51bc512c-7945-4404-bd24-4316ce924daa"
                value={merchantId}
                onChange={(e) => setMerchantId(e.target.value)}
                helperText="If specified, verifies parity against this merchant's registered destination."
                isMonospace
                disabled={isLoading}
              />

              {/* Drag and Drop Zone */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
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
                  {(result || error || selectedFile) && !isLoading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      icon={<RefreshCw size={12} />}
                    >
                      Clear
                    </Button>
                  )}
                </div>

                <FileDropzone
                  state={dropzoneState}
                  fileName={selectedFile?.name}
                  errorMessage={error?.message}
                  disabled={isLoading}
                  supportedFormats="PNG, JPG or WEBP"
                  maxSizeLabel="Max file size 10MB"
                  onFileSelected={handleFileSelected}
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
                Connected to QRShield Verification API (v1). Destination parity and image
                quality evaluated live.
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
            {isLoading ? (
              <LoadingState label="Analyzing QR code matrix and verifying destination parity..." />
            ) : error ? (
              <Alert
                variant="error"
                title={`Verification Failed (${error.code})`}
                action={
                  <Button variant="secondary" size="sm" onClick={handleRetry}>
                    Retry
                  </Button>
                }
              >
                <p>{error.message}</p>
                {error.details && (
                  <p
                    style={{
                      marginTop: 'var(--space-1)',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      opacity: 0.85,
                    }}
                  >
                    {error.details}
                  </p>
                )}
              </Alert>
            ) : result ? (
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
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 'var(--space-2)',
                  }}
                >
                  <StatusBadge status={result.verification_status} size="md" />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    <Clock size={13} aria-hidden="true" />
                    <span>{result.processing_metadata.duration_ms} ms</span>
                  </div>
                </div>

                <div
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    backgroundColor: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  <strong style={{ color: 'var(--color-text-primary)' }}>
                    Action Guidance:{' '}
                  </strong>
                  {formatRecommendation(result.recommendation)}
                </div>

                <div
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  Verification ID: {result.processing_metadata.verification_id}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<ShieldQuestion size={22} />}
                title="No scan submitted."
                description="Submit a QR image or payload in Section A to trigger deterministic destination matching and physical inspection."
              />
            )}
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
                padding: 'var(--space-3) var(--space-4)',
                backgroundColor: 'var(--color-surface-raised)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              {result ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <DataRow
                    label="Decoded Payload"
                    value={result.decoded_payload}
                    isMonospace
                  />
                  <DataRow
                    label="Detected Destination"
                    value={result.normalized_destination ?? 'None'}
                    isMonospace
                  />
                </div>
              ) : (
                <EmptyState
                  title="No payload decoded."
                  description="Decoded URI parameters (pa, pn, mc, am, tr) will appear here in monospace rows."
                  style={{
                    border: 'none',
                    backgroundColor: 'transparent',
                    padding: 'var(--space-3)',
                  }}
                />
              )}
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
                    color: result?.registered_destination
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-muted)',
                    fontStyle: result?.registered_destination ? 'normal' : 'italic',
                    wordBreak: 'break-all',
                  }}
                >
                  {result
                    ? (result.registered_destination ?? 'No registered destination found')
                    : 'Awaiting merchant selection'}
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
                    color: result?.normalized_destination
                      ? 'var(--color-text-primary)'
                      : 'var(--color-text-muted)',
                    fontStyle: result?.normalized_destination ? 'normal' : 'italic',
                    wordBreak: 'break-all',
                  }}
                >
                  {result
                    ? (result.normalized_destination ?? 'No destination detected')
                    : 'Awaiting scan submission'}
                </div>
              </div>
            </div>

            {result && (
              <div
                style={{
                  marginTop: 'var(--space-3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: result.destination_match
                    ? 'var(--color-status-verified)'
                    : 'var(--color-status-mismatch)',
                }}
              >
                {result.destination_match ? (
                  <>
                    <CheckCircle2 size={14} aria-hidden="true" />
                    <span>Destination Parity Verified (Exact Match)</span>
                  </>
                ) : (
                  <>
                    <XCircle size={14} aria-hidden="true" />
                    <span>
                      {result.registered_destination
                        ? 'Destination Conflict Identified'
                        : 'No Registered Destination for Comparison'}
                    </span>
                  </>
                )}
              </div>
            )}
          </Card>

          {/* SECTION E: Visual Evidence Section */}
          <Card
            title="E. Visual Evidence"
            subtitle="Image quality and visual deviation metrics"
            badge={
              <ImageIcon
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--color-text-muted)' }}
                aria-hidden="true"
              />
            }
          >
            {result ? (
              <div
                style={{
                  padding: 'var(--space-3) var(--space-4)',
                  backgroundColor: 'var(--color-surface-raised)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <DataRow
                  label="Overall Quality"
                  value={result.image_quality.overall_quality}
                  isMonospace
                />
                <DataRow
                  label="Exposure / Brightness"
                  value={result.image_quality.brightness_classification}
                  isMonospace
                />
                <DataRow
                  label="Contrast Parity"
                  value={result.image_quality.contrast_classification}
                  isMonospace
                />
                <DataRow
                  label="Focus / Sharpness"
                  value={result.image_quality.sharpness_classification}
                  isMonospace
                />
                <DataRow
                  label="Physical Tamper Layer"
                  value={
                    result.composite_evidence.tamper.available
                      ? 'Evaluated'
                      : 'Pending reference asset registration'
                  }
                  isMonospace={false}
                />
                {result.image_quality.quality_flags.length > 0 && (
                  <div
                    style={{
                      marginTop: 'var(--space-2)',
                      fontSize: '0.6875rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-status-suspicious)',
                    }}
                  >
                    Quality Flags: {result.image_quality.quality_flags.join(', ')}
                  </div>
                )}
              </div>
            ) : (
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
                Visual comparison viewports reserve space for image quality and tamper
                metrics.
              </div>
            )}
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
            {result ? (
              <div
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                {result.risk_factors.length === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      color: 'var(--color-status-verified)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.75rem',
                    }}
                  >
                    <CheckCircle2 size={14} aria-hidden="true" />
                    <span>No adverse risk factors identified.</span>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-2)',
                    }}
                  >
                    <span>Active risk factors flagged:</span>
                    <div
                      style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}
                    >
                      {result.risk_factors.map((rf) => (
                        <span
                          key={rf}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--color-status-mismatch-bg)',
                            border: '1px solid var(--color-status-mismatch-border)',
                            color: 'var(--color-status-mismatch)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                          }}
                        >
                          <AlertTriangle size={11} aria-hidden="true" />
                          {rf}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
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
                  <li>&bull; Destination Parity Conflict</li>
                  <li>&bull; Unregistered Payee Target</li>
                  <li>&bull; Insufficient Image Clarity / Exposure</li>
                  <li>&bull; Visual Deviation & Overlay Anomalies</li>
                </ul>
              </div>
            )}
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
            {result ? (
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
                    alignItems: 'flex-start',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-3)',
                    backgroundColor: 'var(--color-surface-raised)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-primary)',
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {result.explanation}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)',
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {result.explanation_metadata.provider === 'gemini' ? (
                    <>
                      <Sparkles size={12} style={{ color: 'var(--color-brand-focus)' }} />
                      <span>
                        Explanation provider: Google Gemini (
                        {result.explanation_metadata.model})
                      </span>
                    </>
                  ) : (
                    <>
                      <Cpu size={12} />
                      <span>Explanation provider: Deterministic Rule Engine</span>
                    </>
                  )}
                </div>
              </div>
            ) : (
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
                <p
                  style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}
                >
                  Auditable reasoning logs will detail whether parity was verified or why
                  evidence was deemed insufficient.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
