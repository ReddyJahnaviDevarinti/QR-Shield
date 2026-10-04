/**
 * Alignment quality classification based on quadrilateral perspective sanity.
 */
export type AlignmentClassification = 'GOOD' | 'DEGRADED' | 'INSUFFICIENT';

/**
 * High-level comparability assessment of the visual analysis.
 */
export type AnalysisQuality = 'COMPARABLE' | 'DEGRADED' | 'INCONCLUSIVE';

/**
 * Factual diagnostic recommendation for visual deviation review.
 * NOTE: This is NOT a canonical verification status and never claims fraud or illegality.
 */
export type TamperRecommendation =
  | 'NO_SIGNIFICANT_VISUAL_DEVIATION'
  | 'REVIEW_VISUAL_DIFFERENCE'
  | 'MANUAL_INSPECTION_RECOMMENDED'
  | 'INSUFFICIENT_VISUAL_EVIDENCE';

/**
 * Standardized machine-readable anomaly indicators.
 */
export type AnomalyIndicator =
  | 'MATRIX_STRUCTURAL_DIFFERENCE'
  | 'BOUNDARY_EDGE_ANOMALY'
  | 'ALIGNMENT_DEGRADED'
  | 'ALIGNMENT_INSUFFICIENT'
  | 'CANDIDATE_QR_NOT_DETECTED'
  | 'REFERENCE_QR_NOT_DETECTED'
  | 'LOW_COMPARABILITY';

/**
 * Canonical result emitted by the physical QR visual tamper analyzer.
 */
export interface TamperAnalysisResult {
  /** Whether the QR code was successfully located in the reference image */
  referenceDetected: boolean;
  /** Whether the QR code was successfully located in the candidate image */
  candidateDetected: boolean;
  /** Geometric alignment quality score from 0.0 (unusable) to 1.0 (ideal square) */
  alignmentQuality: number;
  /** Categorical alignment classification */
  alignmentClassification: AlignmentClassification;
  /** Normalized ratio of differing binary QR matrix pixels from 0.0 to 1.0 */
  matrixMismatchRatio: number;
  /** Engineering heuristic composite score of visual deviation from 0.0 (identical) to 1.0 (extreme) */
  visualDeviationIndex: number;
  /** Boundary anomaly score detecting potential sticker cutlines or overlay borders from 0.0 to 1.0 */
  boundaryAnomalyScore: number;
  /** Whether the boundary anomaly score exceeded the initial engineering heuristic threshold */
  boundaryAnomalyDetected: boolean;
  /** Structured machine-readable anomaly indicators */
  anomalyIndicators: AnomalyIndicator[];
  /** Overall quality of visual comparability */
  analysisQuality: AnalysisQuality;
  /** Diagnostic visual recommendation */
  recommendation: TamperRecommendation;
}
