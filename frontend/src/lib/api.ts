import { VerificationStatus, ReferenceQrRecord } from '../types';

export type CanonicalCompositeStatus = VerificationStatus;

export type CompositeRecommendation =
  | 'REVIEW_NOT_REQUIRED'
  | 'DO_NOT_PROCEED_WITH_PAYMENT'
  | 'VERIFY_MERCHANT_BEFORE_PAYMENT'
  | 'MANUAL_INSPECTION_RECOMMENDED'
  | 'CAPTURE_CLEARER_IMAGE';

export type CompositeRiskFactor =
  | 'DESTINATION_CONFLICT'
  | 'NO_TRUSTED_REGISTRATION'
  | 'IMAGE_QUALITY_INSUFFICIENT'
  | 'IMAGE_QUALITY_DEGRADED'
  | 'VISUAL_STRUCTURAL_DIFFERENCE'
  | 'BOUNDARY_EDGE_ANOMALY'
  | 'TAMPER_ANALYSIS_INCONCLUSIVE'
  | 'INSUFFICIENT_DESTINATION_DATA'
  | 'NO_PAYMENT_DESTINATION';

export type OverallQualityClassification = 'ACCEPTABLE' | 'DEGRADED' | 'INSUFFICIENT';
export type BrightnessClassification = 'TOO_DARK' | 'ACCEPTABLE' | 'TOO_BRIGHT';
export type ContrastClassification = 'LOW_CONTRAST' | 'ACCEPTABLE_CONTRAST';
export type SharpnessClassification = 'BLURRY' | 'ACCEPTABLE_SHARPNESS';
export type QualityFlag =
  | 'TOO_DARK'
  | 'TOO_BRIGHT'
  | 'LOW_CONTRAST'
  | 'BLURRY'
  | 'EXTREME_BLUR'
  | 'LOW_RESOLUTION'
  | 'UNUSABLE_DIMENSIONS'
  | 'LOW_DYNAMIC_RANGE';

export interface VerifySuccessResponse {
  verification_status: CanonicalCompositeStatus;
  decoded_payload: string;
  normalized_destination: string | null;
  registered_destination: string | null;
  destination_match: boolean;
  evidence: {
    normalized_scanned_destination: string | null;
    active_trusted_destinations_checked: number;
    exact_match: boolean;
  };
  image_quality: {
    overall_quality: OverallQualityClassification;
    mean_brightness: number;
    contrast_score: number;
    sharpness_score: number;
    dynamic_range: number;
    brightness_classification: BrightnessClassification;
    contrast_classification: ContrastClassification;
    sharpness_classification: SharpnessClassification;
    quality_flags: QualityFlag[];
  };
  composite_evidence: {
    destination: {
      scanned_destination: string | null;
      destination_match: boolean;
      active_trusted_destinations_checked: number;
      exact_match: boolean;
    };
    image_quality: {
      overall_quality: OverallQualityClassification;
      brightness_classification: BrightnessClassification;
      contrast_classification: ContrastClassification;
      sharpness_classification: SharpnessClassification;
    };
    tamper: {
      available: boolean;
      reference_available?: boolean;
      visual_deviation_index?: number | null;
      alignment_quality?: number | null;
      alignment_classification?: string | null;
      matrix_mismatch_ratio?: number | null;
      boundary_anomaly_detected?: boolean | null;
      boundary_anomaly_score?: number | null;
      anomaly_indicators?: string[];
      recommendation?: string;
    };
  };
  risk_factors: CompositeRiskFactor[];
  recommendation: CompositeRecommendation;
  explanation: string;
  explanation_metadata: {
    provider: 'gemini' | 'deterministic_fallback';
    model: 'gemini-3.8-flash' | null;
  };
  processing_metadata: {
    verification_id: string;
    timestamp: string;
    duration_ms: number;
  };
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: string;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}

/**
 * Standardized client-side API error representation.
 */
export class ApiClientError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: string;

  constructor(message: string, status: number, code = 'E_API_ERROR', details?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Retrieves the configured backend API base URL.
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envUrl && envUrl.length > 0) {
    return envUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:8000';
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface VerifyQrOptions {
  merchantId?: string;
  signal?: AbortSignal;
}

/**
 * Sends a genuine multipart/form-data verification request to POST /api/v1/verify.
 *
 * ARCHITECTURAL CONTRACT:
 * - Frontend performs zero decoding or verification logic.
 * - Backend verification_status is authoritative.
 * - Browser automatically formats multipart boundary; never set Content-Type header manually.
 */
export async function verifyQr(
  file: File,
  options?: VerifyQrOptions,
): Promise<VerifySuccessResponse> {
  if (!file) {
    throw new ApiClientError('Please select a valid image file.', 400, 'E_MISSING_IMAGE');
  }

  if (file.size === 0) {
    throw new ApiClientError('The selected image file is empty.', 400, 'E_EMPTY_IMAGE');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ApiClientError(
      'Image file size exceeds the 10 MB limit.',
      413,
      'E_PAYLOAD_TOO_LARGE',
      'Maximum allowed file size is 10 MB.',
    );
  }

  // Soft client-side validation on MIME type if available
  const mimeType = file.type?.toLowerCase();
  if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ApiClientError(
      `Unsupported image format '${file.type}'. Allowed formats: PNG, JPEG, WEBP.`,
      400,
      'E_UNSUPPORTED_MIME_TYPE',
      'Please upload a valid PNG, JPEG, or WebP image.',
    );
  }

  const formData = new FormData();
  formData.append('image', file, file.name);

  if (options?.merchantId && options.merchantId.trim().length > 0) {
    formData.append('merchant_id', options.merchantId.trim());
  }

  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/v1/verify`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      signal: options?.signal,
      // NOTE: Do NOT set Content-Type header; browser must set boundary
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiClientError(
        'Verification request was cancelled or timed out.',
        408,
        'E_TIMEOUT',
      );
    }
    throw new ApiClientError(
      'Unable to connect to verification server. Please verify the backend is running.',
      0,
      'E_NETWORK_ERROR',
      err instanceof Error ? err.message : String(err),
    );
  }

  let responseJson: unknown;
  try {
    responseJson = await response.json();
  } catch {
    throw new ApiClientError(
      `Server returned an invalid non-JSON response (HTTP ${response.status}).`,
      response.status,
      'E_MALFORMED_RESPONSE',
    );
  }

  if (!response.ok) {
    const errorBody = responseJson as ApiErrorResponse;
    const msg =
      errorBody?.error?.message || response.statusText || 'Verification failed.';
    const code = errorBody?.error?.code || `E_HTTP_${response.status}`;
    const details = errorBody?.error?.details;
    throw new ApiClientError(msg, response.status, code, details);
  }

  const result = responseJson as VerifySuccessResponse;
  if (!result || typeof result.verification_status !== 'string') {
    throw new ApiClientError(
      'Malformed verification response from server.',
      response.status,
      'E_MALFORMED_RESPONSE',
    );
  }

  return result;
}

/**
 * Fetches the active reference QR record for a merchant.
 */
export async function fetchReferenceQr(
  merchantId: string,
  accessToken?: string,
): Promise<ReferenceQrRecord | null> {
  const baseUrl = getApiBaseUrl();
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${baseUrl}/api/v1/merchants/${encodeURIComponent(merchantId)}/reference-qr`,
    {
      headers,
    },
  );
  if (!response.ok) {
    const errorBody = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;
    throw new ApiClientError(
      errorBody?.error?.message || 'Failed to fetch reference QR.',
      response.status,
      errorBody?.error?.code || `E_HTTP_${response.status}`,
      errorBody?.error?.details,
    );
  }
  const data = (await response.json()) as { reference_qr: ReferenceQrRecord | null };
  return data.reference_qr;
}

/**
 * Uploads a reference QR image for a merchant.
 */
export async function uploadReferenceQr(
  merchantId: string,
  file: File,
  accessToken?: string,
): Promise<ReferenceQrRecord> {
  if (!file) {
    throw new ApiClientError('Please select a valid image file.', 400, 'E_MISSING_IMAGE');
  }
  if (file.size === 0) {
    throw new ApiClientError('The selected image file is empty.', 400, 'E_EMPTY_IMAGE');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ApiClientError(
      'Image file size exceeds the 10 MB limit.',
      413,
      'E_PAYLOAD_TOO_LARGE',
    );
  }
  const mimeType = file.type.toLowerCase();
  if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ApiClientError(
      `Unsupported file type '${file.type}'. Please upload a PNG, JPG, or WEBP image.`,
      400,
      'E_UNSUPPORTED_MIME_TYPE',
    );
  }

  const formData = new FormData();
  formData.append('image', file, file.name);

  const baseUrl = getApiBaseUrl();
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${baseUrl}/api/v1/merchants/${encodeURIComponent(merchantId)}/reference-qr`,
    {
      method: 'POST',
      body: formData,
      headers,
    },
  );

  if (!response.ok) {
    const errorBody = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;
    throw new ApiClientError(
      errorBody?.error?.message || 'Failed to upload reference QR.',
      response.status,
      errorBody?.error?.code || `E_HTTP_${response.status}`,
      errorBody?.error?.details,
    );
  }

  const data = (await response.json()) as { reference_qr: ReferenceQrRecord };
  return data.reference_qr;
}

/**
 * Deletes the active reference QR record and storage file for a merchant.
 */
export async function deleteReferenceQr(
  merchantId: string,
  accessToken?: string,
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(
    `${baseUrl}/api/v1/merchants/${encodeURIComponent(merchantId)}/reference-qr`,
    {
      method: 'DELETE',
      headers,
    },
  );

  if (!response.ok) {
    const errorBody = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;
    throw new ApiClientError(
      errorBody?.error?.message || 'Failed to delete reference QR.',
      response.status,
      errorBody?.error?.code || `E_HTTP_${response.status}`,
      errorBody?.error?.details,
    );
  }
}

export interface SampleMetadata {
  id: string;
  name: string;
  category: CanonicalCompositeStatus;
  expected_status: CanonicalCompositeStatus;
  summary: string;
  description: string;
  creation_method: string;
  payload: string;
  image_file: string;
  storage_path: string;
  public_url: string;
  api_image_url: string;
  requires_merchant_context: boolean;
  merchant_id?: string;
  merchant_name?: string;
  expected_evidence: Record<string, unknown>;
}

export interface SampleCatalogResponse {
  version: string;
  generated_at?: string;
  description?: string;
  samples: SampleMetadata[];
}

/**
 * Fetches the read-only sample catalog from GET /api/v1/samples.
 */
export async function fetchSampleCatalog(): Promise<SampleCatalogResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/v1/samples`);
  if (!response.ok) {
    const errorBody = (await response
      .json()
      .catch(() => null)) as ApiErrorResponse | null;
    throw new ApiClientError(
      errorBody?.error?.message || 'Failed to fetch sample catalog.',
      response.status,
      errorBody?.error?.code || `E_HTTP_${response.status}`,
      errorBody?.error?.details,
    );
  }
  return (await response.json()) as SampleCatalogResponse;
}

/**
 * Loads the actual sample image as a File object from either the backend API image stream
 * or the public Supabase storage URL.
 */
export async function fetchSampleImageFile(sample: SampleMetadata): Promise<File> {
  const baseUrl = getApiBaseUrl();
  const endpointsToTry = [`${baseUrl}${sample.api_image_url}`, sample.public_url];

  let lastError: Error | null = null;
  for (const url of endpointsToTry) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        return new File([blob], sample.image_file, { type: 'image/png' });
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw new ApiClientError(
    `Failed to download sample image '${sample.image_file}'.`,
    500,
    'E_SAMPLE_IMAGE_FETCH_FAILED',
    lastError?.message,
  );
}
