import type {
  CanonicalCompositeStatus,
  CompositeRecommendation,
  CompositeRiskFactor,
} from '../../modules/composite-verification/types.js';
import type {
  BrightnessClassification,
  ContrastClassification,
  OverallQualityClassification,
  SharpnessClassification,
} from '../../modules/image-quality/types.js';

/**
 * Structured, immutable explanation input derived exclusively from
 * CompositeVerificationResult.
 *
 * SENSITIVITY NOTICE:
 * Secrets, API keys, database credentials, image buffers, passwords,
 * OTPs, PINs, and raw card details MUST NEVER be included in this object.
 */
export interface ExplanationInput {
  canonicalStatus: CanonicalCompositeStatus;
  scannedDestination: string | null;
  matchedDestination: string | null;
  destinationMatch: boolean;
  riskFactors: CompositeRiskFactor[];
  recommendation: CompositeRecommendation;
  imageQualitySummary: {
    overallQuality: OverallQualityClassification;
    brightnessClassification: BrightnessClassification;
    contrastClassification: ContrastClassification;
    sharpnessClassification: SharpnessClassification;
  };
  tamperSummary?: {
    evaluated: boolean;
    tamperDetected?: boolean;
    confidenceScore?: number;
    riskScore?: number;
    anomalyFlags?: string[];
  } | null;
  evidenceCodes: string[];
}

/**
 * Validated structured JSON output returned by Gemini.
 */
export interface GeminiStructuredOutput {
  summary: string;
  key_findings: string[];
  action: string;
}

/**
 * Supported explanation providers.
 */
export type ExplanationProvider = 'gemini' | 'deterministic_fallback';

/**
 * Metadata accompanying explanation responses.
 */
export interface ExplanationMetadata {
  provider: ExplanationProvider;
  model: 'gemini-3.8-flash' | null;
}

/**
 * Unified explanation result returned by the explanation gateway.
 */
export interface ExplanationResult {
  explanation: string;
  structured?: {
    summary: string;
    keyFindings: string[];
    action: string;
  };
  metadata: ExplanationMetadata;
}
