import {
  AlignmentClassification,
  AnalysisQuality,
  AnomalyIndicator,
  TamperRecommendation,
} from './types.js';

/**
 * ============================================================================
 * INITIAL ENGINEERING HEURISTICS
 * ============================================================================
 * NOTE: These thresholds are deterministic engineering heuristics designed for
 * detecting physical QR alterations (such as pasted sticker overlays or altered
 * data modules). They are NOT universal laws or ML probabilities and will later
 * be calibrated against empirical physical tampering datasets.
 * ============================================================================
 */

/** Canonical pixel dimension for normalized square QR analysis grids. */
export const CANONICAL_QR_SIZE = 256;

/** Margin ratio outside the QR quad to inspect for boundary / sticker anomalies (12%). */
export const BOUNDARY_MARGIN_RATIO = 0.12;

/** Weight assigned to binary matrix mismatch in visual deviation index (60%). */
export const WEIGHT_MATRIX_MISMATCH = 0.6;

/** Weight assigned to boundary / perimeter cutline anomaly in visual deviation index (25%). */
export const WEIGHT_BOUNDARY_ANOMALY = 0.25;

/** Weight assigned to grayscale structural gradient diff in visual deviation index (15%). */
export const WEIGHT_STRUCTURAL_DIFF = 0.15;

/** Visual deviation index at or above which manual review is recommended (0.20). */
export const VISUAL_DEVIATION_REVIEW_THRESHOLD = 0.2;

/** Visual deviation index at or above which major physical divergence warrants high-priority inspection (0.35). */
export const VISUAL_DEVIATION_HIGH_THRESHOLD = 0.35;

/** Boundary anomaly score threshold above which an overlay/sticker perimeter anomaly is flagged (0.35). */
export const BOUNDARY_ANOMALY_THRESHOLD = 0.35;

/** Alignment quality score threshold for clean, high-confidence geometry (0.70). */
export const ALIGNMENT_GOOD_THRESHOLD = 0.7;

/** Alignment quality score threshold below which geometry is considered unusable/insufficient (0.45). */
export const ALIGNMENT_DEGRADED_THRESHOLD = 0.45;

/**
 * Classifies the geometric alignment quality of a detected QR quadrilateral.
 *
 * @param alignmentQuality - Normalized alignment quality score in [0.0, 1.0].
 * @returns 'GOOD' | 'DEGRADED' | 'INSUFFICIENT'
 */
export function classifyAlignment(alignmentQuality: number): AlignmentClassification {
  if (alignmentQuality >= ALIGNMENT_GOOD_THRESHOLD) {
    return 'GOOD';
  }
  if (alignmentQuality >= ALIGNMENT_DEGRADED_THRESHOLD) {
    return 'DEGRADED';
  }
  return 'INSUFFICIENT';
}

/**
 * Computes the composite Visual Deviation Index using documented deterministic weights.
 *
 * Formula:
 * visualDeviationIndex =
 *   0.60 * matrixMismatchRatio +
 *   0.25 * boundaryAnomalyScore +
 *   0.15 * structuralDiff
 *
 * Clamped strictly to [0.0, 1.0].
 *
 * @param matrixMismatchRatio - Normalized binary matrix mismatch in [0.0, 1.0].
 * @param boundaryAnomalyScore - Normalized boundary anomaly score in [0.0, 1.0].
 * @param structuralDiff - Normalized grayscale structural difference in [0.0, 1.0].
 * @returns Normalized visual deviation index rounded to 4 decimal places.
 */
export function computeVisualDeviationIndex(
  matrixMismatchRatio: number,
  boundaryAnomalyScore: number,
  structuralDiff: number,
): number {
  const composite =
    WEIGHT_MATRIX_MISMATCH * matrixMismatchRatio +
    WEIGHT_BOUNDARY_ANOMALY * boundaryAnomalyScore +
    WEIGHT_STRUCTURAL_DIFF * structuralDiff;

  return Math.min(1.0, Math.max(0.0, Math.round(composite * 10000) / 10000));
}

/**
 * Determines analysis quality, anomaly indicators, and diagnostic recommendation.
 *
 * @param input - Consolidated visual comparison metrics.
 * @returns Object with analysisQuality, recommendation, and structured anomalyIndicators.
 */
export function evaluateTamperRecommendation(input: {
  visualDeviationIndex: number;
  matrixMismatchRatio: number;
  boundaryAnomalyScore: number;
  boundaryAnomalyDetected: boolean;
  alignmentClassification: AlignmentClassification;
  alignmentQuality: number;
}): {
  analysisQuality: AnalysisQuality;
  recommendation: TamperRecommendation;
  anomalyIndicators: AnomalyIndicator[];
} {
  const indicators: AnomalyIndicator[] = [];

  // Check geometric alignment validity
  if (input.alignmentClassification === 'INSUFFICIENT') {
    indicators.push('ALIGNMENT_INSUFFICIENT', 'LOW_COMPARABILITY');
    return {
      analysisQuality: 'INCONCLUSIVE',
      recommendation: 'INSUFFICIENT_VISUAL_EVIDENCE',
      anomalyIndicators: indicators,
    };
  }

  if (input.alignmentClassification === 'DEGRADED') {
    indicators.push('ALIGNMENT_DEGRADED');
  }

  if (input.matrixMismatchRatio >= 0.2) {
    indicators.push('MATRIX_STRUCTURAL_DIFFERENCE');
  }

  if (input.boundaryAnomalyDetected) {
    indicators.push('BOUNDARY_EDGE_ANOMALY');
  }

  const analysisQuality: AnalysisQuality =
    input.alignmentClassification === 'DEGRADED' ? 'DEGRADED' : 'COMPARABLE';

  let recommendation: TamperRecommendation;
  if (input.visualDeviationIndex >= VISUAL_DEVIATION_HIGH_THRESHOLD) {
    recommendation = 'MANUAL_INSPECTION_RECOMMENDED';
  } else if (
    input.visualDeviationIndex >= VISUAL_DEVIATION_REVIEW_THRESHOLD ||
    input.boundaryAnomalyDetected
  ) {
    recommendation = 'REVIEW_VISUAL_DIFFERENCE';
  } else {
    recommendation = 'NO_SIGNIFICANT_VISUAL_DEVIATION';
  }

  return {
    analysisQuality,
    recommendation,
    anomalyIndicators: indicators,
  };
}
