import {
  CanonicalVerificationStatus,
  VerificationResult,
} from '../verification-engine/types.js';
import {
  BrightnessClassification,
  ContrastClassification,
  ImageQualityResult,
  OverallQualityClassification,
  SharpnessClassification,
} from '../image-quality/types.js';
import {
  AnalysisQuality,
  AnomalyIndicator,
  TamperAnalysisResult,
} from '../tamper-analysis/types.js';

/**
 * The 5 canonical verification statuses emitted by QRShield.
 * The composite engine is the sole layer permitted to emit all 5 statuses.
 */
export type CanonicalCompositeStatus =
  | 'VERIFIED'
  | 'DESTINATION_MISMATCH'
  | 'UNVERIFIED'
  | 'SUSPICIOUS'
  | 'INSUFFICIENT_EVIDENCE';

/**
 * Standardized diagnostic recommendations for payment decisions.
 * Formulated factually without claiming guaranteed safety or making fraud allegations.
 */
export type CompositeRecommendation =
  | 'REVIEW_NOT_REQUIRED'
  | 'DO_NOT_PROCEED_WITH_PAYMENT'
  | 'VERIFY_MERCHANT_BEFORE_PAYMENT'
  | 'MANUAL_INSPECTION_RECOMMENDED'
  | 'CAPTURE_CLEARER_IMAGE';

/**
 * Strongly typed machine-readable risk factor identifiers.
 */
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

/**
 * Structured evidence extracted from destination evaluation.
 */
export interface CompositeDestinationEvidence {
  scannedDestination: string | null;
  destinationMatch: boolean;
  activeTrustedDestinationsChecked: number;
  exactMatch: boolean;
}

/**
 * Structured evidence extracted from image quality evaluation.
 */
export interface CompositeImageQualityEvidence {
  overallQuality: OverallQualityClassification;
  brightnessClassification: BrightnessClassification;
  contrastClassification: ContrastClassification;
  sharpnessClassification: SharpnessClassification;
}

/**
 * Structured evidence extracted from physical tamper evaluation.
 */
export interface CompositeTamperEvidence {
  available: boolean;
  analysisQuality: AnalysisQuality | null;
  visualDeviationIndex: number | null;
  boundaryAnomalyDetected: boolean | null;
  boundaryAnomalyScore: number | null;
  anomalyIndicators: AnomalyIndicator[] | null;
}

/**
 * Consolidated multi-layer evidence object.
 * Does not contain raw image buffers or local filesystem references.
 */
export interface CompositeEvidence {
  destination: CompositeDestinationEvidence;
  imageQuality: CompositeImageQualityEvidence;
  tamper: CompositeTamperEvidence | null;
}

/**
 * The strongly typed canonical result emitted by the QRShield Composite Verification Engine.
 */
export interface CompositeVerificationResult {
  /** The final unified canonical QRShield status */
  status: CanonicalCompositeStatus;
  /** Canonical destination verification status before visual composite evaluation */
  destinationStatus: CanonicalVerificationStatus;
  /** Whether the scanned destination matched an active trusted registration */
  destinationMatch: boolean;
  /** Original scanned destination string, if present */
  scannedDestination: string | null;
  /** Matched merchant identifier, if verified */
  matchedMerchantId: string | null;
  /** Matched trusted registration value, if verified */
  matchedDestination: string | null;
  /** Overall categorical image quality classification */
  overallImageQuality: OverallQualityClassification;
  /** Whether physical tamper comparison was performed */
  tamperAnalysisAvailable: boolean;
  /** Visual deviation index from tamper analysis, or null if unavailable */
  visualDeviationIndex: number | null;
  /** Whether a boundary/overlay anomaly was detected, or null if unavailable */
  boundaryAnomalyDetected: boolean | null;
  /** Deduplicated, deterministically ordered machine-readable risk factors */
  riskFactors: CompositeRiskFactor[];
  /** Consolidated multi-layer evidence */
  evidence: CompositeEvidence;
  /** Deterministic factual recommendation */
  recommendation: CompositeRecommendation;
}

/**
 * Input arguments for composite verification.
 */
export interface CompositeVerificationInput {
  destinationResult: VerificationResult;
  imageQualityResult: ImageQualityResult;
  tamperResult?: TamperAnalysisResult | null;
}
