import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SampleLabPage } from './SampleLabPage';
import * as apiModule from '../lib/api';
import type { SampleMetadata, VerifySuccessResponse } from '../lib/api';

const mockSamples: SampleMetadata[] = [
  {
    id: 'sample-verified',
    name: 'Official Registered Merchant QR',
    category: 'VERIFIED',
    expected_status: 'VERIFIED',
    summary:
      'Authentic merchant payment QR code matching registered trusted destination.',
    description: 'Demonstrates successful verification of a genuine merchant QR code.',
    creation_method: 'Deterministic QR generation via qrcode.',
    payload: 'upi://pay?pa=qrshield-sample@icici&pn=QRShield%20Sample%20Store&mc=5411',
    image_file: 'sample-01-verified.png',
    storage_path: 'verified/candidate.png',
    public_url: 'https://example.supabase.co/sample-lab/verified/candidate.png',
    api_image_url: '/api/v1/samples/sample-verified/image',
    requires_merchant_context: true,
    merchant_id: 'merchant-test-id',
    merchant_name: 'QRShield Demo Merchant',
    expected_evidence: { destination_match: true },
  },
  {
    id: 'sample-mismatch',
    name: 'Replaced QR Code (Destination Mismatch)',
    category: 'DESTINATION_MISMATCH',
    expected_status: 'DESTINATION_MISMATCH',
    summary: 'Malicious QR code redirecting funds to an unauthorized attacker account.',
    description: 'Demonstrates detection of a payment destination override attack.',
    creation_method: 'Attacker payload against registered destination.',
    payload: 'upi://pay?pa=attacker-sample@upi&pn=Store&mc=5411',
    image_file: 'sample-02-mismatch.png',
    storage_path: 'mismatch/candidate.png',
    public_url: 'https://example.supabase.co/sample-lab/mismatch/candidate.png',
    api_image_url: '/api/v1/samples/sample-mismatch/image',
    requires_merchant_context: true,
    merchant_id: 'merchant-test-id',
    merchant_name: 'QRShield Demo Merchant',
    expected_evidence: { destination_match: false },
  },
];

const mockVerifyResponse: VerifySuccessResponse = {
  verification_status: 'VERIFIED',
  decoded_payload:
    'upi://pay?pa=qrshield-sample@icici&pn=QRShield%20Sample%20Store&mc=5411',
  normalized_destination: 'qrshield-sample@icici',
  registered_destination: 'qrshield-sample@icici',
  destination_match: true,
  evidence: {
    normalized_scanned_destination: 'qrshield-sample@icici',
    active_trusted_destinations_checked: 1,
    exact_match: true,
  },
  image_quality: {
    overall_quality: 'ACCEPTABLE',
    mean_brightness: 120,
    contrast_score: 50,
    sharpness_score: 220,
    dynamic_range: 190,
    brightness_classification: 'ACCEPTABLE',
    contrast_classification: 'ACCEPTABLE_CONTRAST',
    sharpness_classification: 'ACCEPTABLE_SHARPNESS',
    quality_flags: [],
  },
  composite_evidence: {
    destination: {
      scanned_destination: 'qrshield-sample@icici',
      destination_match: true,
      active_trusted_destinations_checked: 1,
      exact_match: true,
    },
    image_quality: {
      overall_quality: 'ACCEPTABLE',
      brightness_classification: 'ACCEPTABLE',
      contrast_classification: 'ACCEPTABLE_CONTRAST',
      sharpness_classification: 'ACCEPTABLE_SHARPNESS',
    },
    tamper: {
      available: true,
      boundary_anomaly_detected: false,
      boundary_anomaly_score: 0.02,
      visual_deviation_index: 0.01,
      matrix_mismatch_ratio: 0.0,
      recommendation: 'REVIEW_NOT_REQUIRED',
    },
  },
  risk_factors: [],
  recommendation: 'REVIEW_NOT_REQUIRED',
  explanation:
    'Scanned destination matches active trusted registration and visual baseline.',
  explanation_metadata: {
    provider: 'deterministic_fallback',
    model: null,
  },
  processing_metadata: {
    verification_id: 'test-ver-1234',
    timestamp: '2026-10-04T12:00:00Z',
    duration_ms: 45.2,
  },
};

describe('SampleLabPage Component', () => {
  beforeEach(() => {
    vi.spyOn(apiModule, 'fetchSampleCatalog').mockResolvedValue({
      version: '1.0.0',
      samples: mockSamples,
    });

    vi.spyOn(apiModule, 'fetchSampleImageFile').mockResolvedValue(
      new File([new Uint8Array([137, 80, 78, 71])], 'sample-01-verified.png', {
        type: 'image/png',
      }),
    );

    vi.spyOn(apiModule, 'verifyQr').mockResolvedValue(mockVerifyResponse);

    // Mock URL.createObjectURL / revokeObjectURL for JSDOM
    if (!window.URL.createObjectURL) {
      window.URL.createObjectURL = vi
        .fn()
        .mockReturnValue('blob:http://localhost/mock-blob');
    }
    if (!window.URL.revokeObjectURL) {
      window.URL.revokeObjectURL = vi.fn();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders page header and evaluator execution notice', async () => {
    render(<SampleLabPage />);

    expect(screen.getByText('Evaluator Sample Lab')).toBeDefined();
    expect(screen.getByText('Live End-to-End Execution Notice')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/Sample Specimens/i)).toBeDefined();
    });
  });

  it('loads and lists the catalog samples', async () => {
    render(<SampleLabPage />);

    await waitFor(() => {
      expect(
        screen.getAllByText('Official Registered Merchant QR').length,
      ).toBeGreaterThan(0);
      expect(screen.getByText('Replaced QR Code (Destination Mismatch)')).toBeDefined();
    });
  });

  it('selects a sample and displays its technical specifications', async () => {
    render(<SampleLabPage />);

    await waitFor(() => {
      expect(
        screen.getAllByText('Official Registered Merchant QR').length,
      ).toBeGreaterThan(0);
    });

    // Default first sample selected
    expect(screen.getByText(/ID: sample-verified/i)).toBeDefined();
    expect(screen.getByText(/upi:\/\/pay\?pa=qrshield-sample@icici/i)).toBeDefined();

    // Click second sample
    fireEvent.click(screen.getByText('Replaced QR Code (Destination Mismatch)'));

    await waitFor(() => {
      expect(screen.getByText(/ID: sample-mismatch/i)).toBeDefined();
      expect(screen.getByText(/upi:\/\/pay\?pa=attacker-sample@upi/i)).toBeDefined();
    });
  });

  it('executes real verification on "Run Real Verification" click and renders measured results', async () => {
    render(<SampleLabPage />);

    await waitFor(() => {
      expect(screen.getByText('Run Real Verification')).toBeDefined();
    });

    const verifyBtn = screen.getByText('Run Real Verification');
    fireEvent.click(verifyBtn);

    await waitFor(() => {
      expect(apiModule.verifyQr).toHaveBeenCalledTimes(1);
    });

    // Check that verifyQr was called with the merchant_id from the sample
    expect(apiModule.verifyQr).toHaveBeenCalledWith(
      expect.any(File),
      expect.objectContaining({ merchantId: 'merchant-test-id' }),
    );

    // Verify rendered live status and diagnostic comparison
    await waitFor(() => {
      expect(screen.getByText('Live Authoritative Status')).toBeDefined();
      expect(screen.getByText(/QA Assertion: PASSED/i)).toBeDefined();
      expect(
        screen.getByText(
          'Scanned destination matches active trusted registration and visual baseline.',
        ),
      ).toBeDefined();
      expect(screen.getByText('EXACT MATCH')).toBeDefined();
    });
  });

  it('resets verification results when Reset button is clicked', async () => {
    render(<SampleLabPage />);

    await waitFor(() => {
      expect(screen.getByText('Run Real Verification')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Run Real Verification'));

    await waitFor(() => {
      expect(screen.getByText('Reset')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Reset'));

    await waitFor(() => {
      expect(screen.queryByText('Live Authoritative Status')).toBeNull();
    });
    expect(screen.getByText('Run Real Verification')).toBeDefined();
  });

  it('displays error alert if sample catalog fetch fails', async () => {
    vi.spyOn(apiModule, 'fetchSampleCatalog').mockRejectedValue(
      new Error('Failed to load sample catalog'),
    );

    render(<SampleLabPage />);

    await waitFor(() => {
      expect(screen.getByText('Sample Catalog Unavailable')).toBeDefined();
      expect(screen.getByText(/Failed to load sample catalog/i)).toBeDefined();
    });
  });

  it('displays error alert if verification fails', async () => {
    vi.spyOn(apiModule, 'verifyQr').mockRejectedValue(
      new apiModule.ApiClientError('Server verification timeout', 504, 'E_TIMEOUT'),
    );

    render(<SampleLabPage />);

    await waitFor(() => {
      expect(screen.getByText('Run Real Verification')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Run Real Verification'));

    await waitFor(() => {
      expect(screen.getByText('Verification Error (E_TIMEOUT)')).toBeDefined();
      expect(screen.getByText('Server verification timeout')).toBeDefined();
    });
  });
});
