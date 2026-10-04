import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Play,
  RotateCcw,
  ImageIcon,
  Sparkles,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { StatusBadge } from '../components/StatusBadge';
import { Alert } from '../components/Alert';
import { LoadingState } from '../components/LoadingState';
import { DataRow } from '../components/DataRow';
import {
  fetchSampleCatalog,
  fetchSampleImageFile,
  verifyQr,
  SampleMetadata,
  VerifySuccessResponse,
  ApiClientError,
  getApiBaseUrl,
} from '../lib/api';

export const SampleLabPage: React.FC = () => {
  const [samples, setSamples] = useState<SampleMetadata[]>([]);
  const [selectedSample, setSelectedSample] = useState<SampleMetadata | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Verification state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<VerifySuccessResponse | null>(null);
  const [verificationError, setVerificationError] = useState<ApiClientError | null>(null);
  const [activeImageBlobUrl, setActiveImageBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      try {
        setCatalogLoading(true);
        const res = await fetchSampleCatalog();
        if (isMounted) {
          setSamples(res.samples);
          if (res.samples.length > 0 && res.samples[0]) {
            setSelectedSample(res.samples[0]);
          }
        }
      } catch (err) {
        if (isMounted) {
          setCatalogError(
            err instanceof Error
              ? err.message
              : 'Failed to connect to backend sample catalog.',
          );
        }
      } finally {
        if (isMounted) {
          setCatalogLoading(false);
        }
      }
    }

    loadCatalog();
    return () => {
      isMounted = false;
    };
  }, []);

  // Update image preview blob URL when selected sample changes
  useEffect(() => {
    if (!selectedSample) return;

    let activeUrl: string | null = null;
    let isMounted = true;

    async function loadPreview() {
      try {
        const file = await fetchSampleImageFile(selectedSample!);
        if (isMounted) {
          const url = URL.createObjectURL(file);
          activeUrl = url;
          setActiveImageBlobUrl(url);
        }
      } catch {
        // Fallback to direct public URL if local download failed
        if (isMounted) {
          setActiveImageBlobUrl(selectedSample!.public_url);
        }
      }
    }

    // Reset verification states on sample switch
    setVerificationResult(null);
    setVerificationError(null);
    loadPreview();

    return () => {
      isMounted = false;
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
      }
    };
  }, [selectedSample]);

  const handleRunVerification = async () => {
    if (!selectedSample || isVerifying) return;

    setIsVerifying(true);
    setVerificationError(null);
    setVerificationResult(null);

    try {
      // 1. Fetch genuine physical File from the verified storage/endpoint
      const file = await fetchSampleImageFile(selectedSample);

      // 2. Call authoritative POST /api/v1/verify
      const response = await verifyQr(file, {
        merchantId: selectedSample.requires_merchant_context
          ? selectedSample.merchant_id
          : undefined,
      });

      // 3. Render real backend result
      setVerificationResult(response);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setVerificationError(err);
      } else {
        setVerificationError(
          new ApiClientError(
            'Failed to execute sample verification.',
            500,
            'E_SAMPLE_VERIFICATION_FAILED',
            err instanceof Error ? err.message : String(err),
          ),
        );
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setVerificationResult(null);
    setVerificationError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <PageHeader
        title="Evaluator Sample Lab"
        description="Controlled verification environment with reproducible QR specimens evaluated against the live backend pipeline."
      />

      {/* Evaluator Notice */}
      <Alert variant="info" title="Live End-to-End Execution Notice">
        Each test case below is physically evaluated through the actual production
        endpoint (<code>POST /api/v1/verify</code>). No mock responses or synthetic
        verdict cards are used. The backend performs genuine QR decoding, destination
        registry comparison, photographic quality analysis, and homographic projective
        tamper detection.
      </Alert>

      {catalogLoading ? (
        <LoadingState label="Loading sample catalog from backend..." />
      ) : catalogError ? (
        <Alert variant="error" title="Sample Catalog Unavailable">
          {catalogError}
          <div style={{ marginTop: 'var(--space-2)' }}>
            Please ensure the backend API server is running on{' '}
            <code>{getApiBaseUrl()}</code>.
          </div>
        </Alert>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(300px, 360px) 1fr',
            gap: 'var(--space-6)',
            alignItems: 'start',
          }}
          className="sample-lab-layout"
        >
          {/* Left Column: Sample Specimen Selector */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <FlaskConical size={18} style={{ color: 'var(--color-brand-primary)' }} />
              <h2
                style={{
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: 'var(--font-mono)',
                  margin: 0,
                }}
              >
                Sample Specimens ({samples.length})
              </h2>
            </div>

            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
            >
              {samples.map((sample) => {
                const isSelected = selectedSample?.id === sample.id;
                return (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => setSelectedSample(sample)}
                    style={{
                      textAlign: 'left',
                      background: isSelected
                        ? 'var(--color-surface-raised)'
                        : 'var(--color-surface-default)',
                      border: isSelected
                        ? '1px solid var(--color-brand-primary)'
                        : '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3) var(--space-4)',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
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
                        gap: 'var(--space-2)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: isSelected
                            ? 'var(--color-brand-primary)'
                            : 'var(--color-text-primary)',
                        }}
                      >
                        {sample.name}
                      </span>
                    </div>

                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                        margin: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {sample.summary}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 'var(--space-1)',
                        borderTop: '1px solid var(--color-border-subtle)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        Benchmark:
                      </span>
                      <StatusBadge status={sample.expected_status} size="sm" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Specimen Execution & Live Results */}
          {selectedSample && (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
            >
              {/* Specimen Header & Details Card */}
              <Card>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        marginBottom: 'var(--space-1)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontFamily: 'var(--font-mono)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-surface-raised)',
                          border: '1px solid var(--color-border-subtle)',
                          color: 'var(--color-brand-primary)',
                          textTransform: 'uppercase',
                        }}
                      >
                        ID: {selectedSample.id}
                      </span>
                    </div>
                    <h3
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        margin: 0,
                      }}
                    >
                      {selectedSample.name}
                    </h3>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '0.6875rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-text-muted)',
                        marginBottom: '4px',
                      }}
                    >
                      QA EXPECTATION
                    </div>
                    <StatusBadge status={selectedSample.expected_status} />
                  </div>
                </div>

                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5,
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  {selectedSample.description}
                </p>

                {/* Specimen Technical Metadata Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '160px 1fr',
                    gap: 'var(--space-4)',
                    padding: 'var(--space-4)',
                    backgroundColor: 'var(--color-surface-raised)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-subtle)',
                    marginBottom: 'var(--space-5)',
                  }}
                >
                  {/* Physical Image Preview */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                    }}
                  >
                    <div
                      style={{
                        width: '140px',
                        height: '140px',
                        backgroundColor: '#ffffff',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--color-border-strong)',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
                      }}
                    >
                      {activeImageBlobUrl ? (
                        <img
                          src={activeImageBlobUrl}
                          alt={selectedSample.name}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            display: 'block',
                          }}
                        />
                      ) : (
                        <ImageIcon size={32} style={{ color: '#64748b' }} />
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-text-muted)',
                        textAlign: 'center',
                      }}
                    >
                      {selectedSample.image_file}
                    </span>
                  </div>

                  {/* Technical Specifications */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-2)',
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-text-muted)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Embedded Payload:
                      </span>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-brand-primary)',
                          wordBreak: 'break-all',
                          backgroundColor: 'var(--color-surface-default)',
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border-subtle)',
                          marginTop: '2px',
                        }}
                      >
                        {selectedSample.payload}
                      </div>
                    </div>

                    <div>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--color-text-muted)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Creation & Alteration Method:
                      </span>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-text-secondary)',
                          marginTop: '2px',
                          lineHeight: 1.4,
                        }}
                      >
                        {selectedSample.creation_method}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 'var(--space-4)',
                        marginTop: 'var(--space-1)',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          Merchant Context:
                        </span>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          {selectedSample.requires_merchant_context
                            ? selectedSample.merchant_name || 'Configured'
                            : 'None (Standalone / Unanchored)'}
                        </div>
                      </div>

                      <div>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          Storage Bucket:
                        </span>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          public: sample-lab/{selectedSample.storage_path}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Execution Controls */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    paddingTop: 'var(--space-3)',
                    borderTop: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <Button
                    variant="primary"
                    onClick={handleRunVerification}
                    disabled={isVerifying}
                    icon={<Play size={16} />}
                  >
                    {isVerifying ? 'Running Verification...' : 'Run Real Verification'}
                  </Button>

                  {verificationResult && (
                    <Button
                      variant="secondary"
                      onClick={handleReset}
                      icon={<RotateCcw size={16} />}
                    >
                      Reset
                    </Button>
                  )}

                  <a
                    href={selectedSample.public_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      marginLeft: 'auto',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-muted)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>View Public Asset</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </Card>

              {/* Error Display */}
              {verificationError && (
                <Alert
                  variant="error"
                  title={`Verification Error (${verificationError.code})`}
                >
                  {verificationError.message}
                  {verificationError.details && (
                    <div
                      style={{
                        marginTop: 'var(--space-2)',
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      Details: {verificationError.details}
                    </div>
                  )}
                </Alert>
              )}

              {/* In-Flight Verification State */}
              {isVerifying && (
                <Card>
                  <LoadingState label="Executing full verification pipeline: QR decoding, destination registry query, photographic quality analysis, projective homography alignment, and tamper analysis..." />
                </Card>
              )}

              {/* Authoritative Live Measured Result */}
              {verificationResult && !isVerifying && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-4)',
                  }}
                >
                  {/* Result Header & QA Assertion Card */}
                  <Card>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 'var(--space-3)',
                        marginBottom: 'var(--space-4)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-3)',
                        }}
                      >
                        <StatusBadge
                          status={verificationResult.verification_status}
                          size="md"
                        />
                        <div>
                          <div
                            style={{
                              fontSize: '0.6875rem',
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--color-text-muted)',
                              textTransform: 'uppercase',
                            }}
                          >
                            Live Authoritative Status
                          </div>
                          <div
                            style={{
                              fontSize: '1rem',
                              fontWeight: 700,
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            {verificationResult.verification_status}
                          </div>
                        </div>
                      </div>

                      {/* QA Diagnostic Comparison */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor:
                            verificationResult.verification_status ===
                            selectedSample.expected_status
                              ? 'rgba(34, 197, 94, 0.1)'
                              : 'rgba(239, 68, 68, 0.1)',
                          border:
                            verificationResult.verification_status ===
                            selectedSample.expected_status
                              ? '1px solid rgba(34, 197, 94, 0.3)'
                              : '1px solid rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        {verificationResult.verification_status ===
                        selectedSample.expected_status ? (
                          <>
                            <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#22c55e',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              QA Assertion: PASSED (Measured = Expected)
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle size={16} style={{ color: '#ef4444' }} />
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: '#ef4444',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              QA Assertion: DIVERGED (Expected{' '}
                              {selectedSample.expected_status})
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div
                      style={{
                        padding: 'var(--space-3) var(--space-4)',
                        backgroundColor: 'var(--color-surface-raised)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border-subtle)',
                        fontSize: '0.875rem',
                        color: 'var(--color-text-primary)',
                        lineHeight: 1.5,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <Sparkles
                        size={18}
                        style={{
                          color: 'var(--color-brand-primary)',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>
                          {verificationResult.explanation}
                        </div>
                        <div
                          style={{
                            fontSize: '0.6875rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--color-text-muted)',
                            marginTop: '4px',
                          }}
                        >
                          Provider: {verificationResult.explanation_metadata.provider}{' '}
                          {verificationResult.explanation_metadata.model &&
                            `(${verificationResult.explanation_metadata.model})`}
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Measured Evidence Breakdown */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: 'var(--space-4)',
                    }}
                  >
                    {/* Destination Parity Evidence */}
                    <Card title="Payment Destination Analysis">
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--space-2)',
                        }}
                      >
                        <DataRow
                          label="Scanned VPA"
                          value={verificationResult.normalized_destination || 'None'}
                          isMonospace={true}
                        />
                        <DataRow
                          label="Registered VPA"
                          value={
                            verificationResult.registered_destination || 'None registered'
                          }
                          isMonospace={true}
                        />
                        <DataRow
                          label="Destination Parity"
                          value={
                            <span
                              style={{
                                color: verificationResult.destination_match
                                  ? '#22c55e'
                                  : '#ef4444',
                                fontWeight: 600,
                              }}
                            >
                              {verificationResult.destination_match
                                ? 'EXACT MATCH'
                                : 'MISMATCH'}
                            </span>
                          }
                        />
                        <DataRow
                          label="Registry Matches"
                          value={String(
                            verificationResult.evidence
                              .active_trusted_destinations_checked,
                          )}
                        />
                      </div>
                    </Card>

                    {/* Photographic Quality Evidence */}
                    <Card title="Image Quality Analysis">
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--space-2)',
                        }}
                      >
                        <DataRow
                          label="Overall Quality"
                          value={
                            <span
                              style={{
                                color:
                                  verificationResult.image_quality.overall_quality ===
                                  'ACCEPTABLE'
                                    ? '#22c55e'
                                    : '#eab308',
                                fontWeight: 600,
                              }}
                            >
                              {verificationResult.image_quality.overall_quality}
                            </span>
                          }
                        />
                        <DataRow
                          label="Mean Brightness"
                          value={`${verificationResult.image_quality.mean_brightness.toFixed(3)} (${verificationResult.image_quality.brightness_classification})`}
                        />
                        <DataRow
                          label="Contrast Score"
                          value={`${verificationResult.image_quality.contrast_score.toFixed(3)} (${verificationResult.image_quality.contrast_classification})`}
                        />
                        <DataRow
                          label="Sharpness Score"
                          value={`${verificationResult.image_quality.sharpness_score.toFixed(3)} (${verificationResult.image_quality.sharpness_classification})`}
                        />
                        <DataRow
                          label="Defect Flags"
                          value={
                            verificationResult.image_quality.quality_flags.length > 0
                              ? verificationResult.image_quality.quality_flags.join(', ')
                              : 'None'
                          }
                        />
                      </div>
                    </Card>

                    {/* Tamper Analysis Evidence */}
                    <Card title="Physical Tamper Analysis">
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--space-2)',
                        }}
                      >
                        <DataRow
                          label="Tamper Pipeline"
                          value={
                            verificationResult.composite_evidence.tamper.available
                              ? 'Active (Homography Computed)'
                              : 'Bypassed / Reference Not Required'
                          }
                        />
                        {verificationResult.composite_evidence.tamper.available && (
                          <>
                            <DataRow
                              label="Boundary Edge Anomaly"
                              value={
                                <span
                                  style={{
                                    color: verificationResult.composite_evidence.tamper
                                      .boundary_anomaly_detected
                                      ? '#ef4444'
                                      : '#22c55e',
                                    fontWeight: 600,
                                  }}
                                >
                                  {verificationResult.composite_evidence.tamper
                                    .boundary_anomaly_detected
                                    ? 'ANOMALOUS CUTLINE DETECTED'
                                    : 'CLEAN PERIMETER'}
                                </span>
                              }
                            />
                            <DataRow
                              label="Boundary Anomaly Score"
                              value={
                                typeof verificationResult.composite_evidence.tamper
                                  .boundary_anomaly_score === 'number'
                                  ? verificationResult.composite_evidence.tamper.boundary_anomaly_score.toFixed(
                                      3,
                                    )
                                  : 'N/A'
                              }
                            />
                            <DataRow
                              label="Visual Deviation Index"
                              value={
                                typeof verificationResult.composite_evidence.tamper
                                  .visual_deviation_index === 'number'
                                  ? verificationResult.composite_evidence.tamper.visual_deviation_index.toFixed(
                                      4,
                                    )
                                  : 'N/A'
                              }
                            />
                            <DataRow
                              label="Matrix Mismatch"
                              value={
                                typeof verificationResult.composite_evidence.tamper
                                  .matrix_mismatch_ratio === 'number'
                                  ? `${(verificationResult.composite_evidence.tamper.matrix_mismatch_ratio * 100).toFixed(1)}%`
                                  : 'N/A'
                              }
                            />
                          </>
                        )}
                        <DataRow
                          label="Recommendation"
                          value={verificationResult.recommendation}
                        />
                      </div>
                    </Card>

                    {/* Execution Telemetry Card */}
                    <Card title="Execution Telemetry">
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 'var(--space-2)',
                        }}
                      >
                        <DataRow
                          label="Verification ID"
                          value={verificationResult.processing_metadata.verification_id}
                          isMonospace={true}
                        />
                        <DataRow
                          label="Duration"
                          value={`${verificationResult.processing_metadata.duration_ms.toFixed(1)} ms`}
                        />
                        <DataRow
                          label="Timestamp"
                          value={new Date(
                            verificationResult.processing_metadata.timestamp,
                          ).toLocaleString()}
                        />
                        <DataRow
                          label="Risk Factors"
                          value={
                            verificationResult.risk_factors.length > 0
                              ? verificationResult.risk_factors.join(', ')
                              : 'None'
                          }
                        />
                      </div>
                    </Card>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .sample-lab-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
