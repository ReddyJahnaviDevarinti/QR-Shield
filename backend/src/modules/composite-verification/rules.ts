import { VISUAL_DEVIATION_HIGH_THRESHOLD } from '../tamper-analysis/index.js';
import { VerificationResult } from '../verification-engine/types.js';
import { ImageQualityResult } from '../image-quality/types.js';
import { TamperAnalysisResult } from '../tamper-analysis/types.js';
import {
  CanonicalCompositeStatus,
  CompositeRecommendation,
  CompositeRiskFactor,
} from './types.js';

/**
 * Re-export the documented physical tamper threshold from tamper-analysis module.
 * Does not define competing or duplicate numeric threshold constants.
 */
export { VISUAL_DEVIATION_HIGH_THRESHOLD };

/**
 * Deterministically maps each canonical verification status to its factual recommendation.
 * Context-aware: accounts for degraded physical comparison evidence where clearer image capture is needed.
 *
 * @param status - Canonical composite verification status.
 * @param tamperResult - Optional result from physical QR tamper analyzer.
 * @returns Standardized CompositeRecommendation.
 */
export function getRecommendationForStatus(
  status: CanonicalCompositeStatus,
  tamperResult?: TamperAnalysisResult | null,
): CompositeRecommendation {
  switch (status) {
    case 'VERIFIED':
      if (tamperResult?.analysisQuality === 'DEGRADED') {
        return 'CAPTURE_CLEARER_IMAGE';
      }
      return 'REVIEW_NOT_REQUIRED';
    case 'DESTINATION_MISMATCH':
      return 'DO_NOT_PROCEED_WITH_PAYMENT';
    case 'UNVERIFIED':
      return 'VERIFY_MERCHANT_BEFORE_PAYMENT';
    case 'SUSPICIOUS':
      return 'MANUAL_INSPECTION_RECOMMENDED';
    case 'INSUFFICIENT_EVIDENCE':
      return 'CAPTURE_CLEARER_IMAGE';
  }
}

/**
 * Evaluates the final canonical composite verification status using strict deterministic precedence.
 *
 * Precedence Order:
 * - RULE C01: Destination has no usable destination -> INSUFFICIENT_EVIDENCE
 * - RULE C02: No active trusted registration exists -> UNVERIFIED
 * - RULE C03: Active trusted registrations exist but destination conflicts -> DESTINATION_MISMATCH
 * - RULE C04: Destination matches but image quality is INSUFFICIENT -> INSUFFICIENT_EVIDENCE
 * - RULE C05: Destination matches and reference QR exists, but physical comparison was INCONCLUSIVE -> INSUFFICIENT_EVIDENCE
 * - RULE C06: Destination matches, reliable physical comparison available, and boundary anomaly detected
 *             OR visual deviation >= high threshold OR matrix structural difference -> SUSPICIOUS
 * - RULE C07: Destination matches and no high-risk visual anomaly exists -> VERIFIED
 *
 * @param destinationResult - Result from deterministic verification engine.
 * @param imageQualityResult - Result from deterministic image quality analyzer.
 * @param tamperResult - Optional result from physical QR tamper analyzer.
 * @returns CanonicalCompositeStatus
 */
export function evaluateCompositeStatus(
  destinationResult: VerificationResult,
  imageQualityResult: ImageQualityResult,
  tamperResult?: TamperAnalysisResult | null,
): CanonicalCompositeStatus {
  // RULE C01: Missing or unusable payment destination
  if (destinationResult.status === 'INSUFFICIENT_EVIDENCE') {
    return 'INSUFFICIENT_EVIDENCE';
  }

  // RULE C02: Unregistered payment destination (absence of trusted anchor)
  if (destinationResult.status === 'UNVERIFIED') {
    return 'UNVERIFIED';
  }

  // RULE C03: Scanned destination actively conflicts with registered trust anchor
  if (destinationResult.status === 'DESTINATION_MISMATCH') {
    return 'DESTINATION_MISMATCH';
  }

  // RULE C04: Destination matched, but image quality is insufficient for a reliable verdict
  if (imageQualityResult.overallQuality === 'INSUFFICIENT') {
    return 'INSUFFICIENT_EVIDENCE';
  }

  // RULE C05: Destination matched and reference QR exists, but physical tamper comparison was inconclusive
  if (tamperResult && tamperResult.analysisQuality === 'INCONCLUSIVE') {
    return 'INSUFFICIENT_EVIDENCE';
  }

  // RULE C06: Destination matched, reliable physical comparison available (COMPARABLE), and physical visual tamper evidence or structural difference is detected
  if (
    tamperResult &&
    tamperResult.analysisQuality === 'COMPARABLE' &&
    (tamperResult.boundaryAnomalyDetected === true ||
      tamperResult.visualDeviationIndex >= VISUAL_DEVIATION_HIGH_THRESHOLD ||
      tamperResult.anomalyIndicators?.includes('MATRIX_STRUCTURAL_DIFFERENCE') === true ||
      tamperResult.anomalyIndicators?.includes('BOUNDARY_EDGE_ANOMALY') === true)
  ) {
    return 'SUSPICIOUS';
  }

  // RULE C07: Destination matched and no high-risk visual anomaly exists
  return 'VERIFIED';
}

/**
 * Aggregates machine-readable risk factors across all evaluation layers in deterministic order.
 *
 * Guaranteed deduplicated.
 *
 * @param destinationResult - Result from deterministic verification engine.
 * @param imageQualityResult - Result from deterministic image quality analyzer.
 * @param tamperResult - Optional result from physical QR tamper analyzer.
 * @returns Array of CompositeRiskFactor
 */
export function aggregateRiskFactors(
  destinationResult: VerificationResult,
  imageQualityResult: ImageQualityResult,
  tamperResult?: TamperAnalysisResult | null,
): CompositeRiskFactor[] {
  const factors: CompositeRiskFactor[] = [];

  // 1. Destination-layer risk factors
  if (destinationResult.status === 'DESTINATION_MISMATCH') {
    factors.push('DESTINATION_CONFLICT');
  } else if (destinationResult.status === 'UNVERIFIED') {
    if (destinationResult.reasonCode === 'NO_PAYMENT_DESTINATION') {
      factors.push('NO_PAYMENT_DESTINATION');
    } else {
      factors.push('NO_TRUSTED_REGISTRATION');
    }
  } else if (destinationResult.status === 'INSUFFICIENT_EVIDENCE') {
    factors.push('INSUFFICIENT_DESTINATION_DATA');
  }

  // 2. Tamper-layer risk factors: confidence-aware classification
  if (tamperResult && tamperResult.analysisQuality === 'COMPARABLE') {
    if (
      tamperResult.boundaryAnomalyDetected ||
      tamperResult.anomalyIndicators?.includes('BOUNDARY_EDGE_ANOMALY')
    ) {
      factors.push('BOUNDARY_EDGE_ANOMALY');
    }
    if (tamperResult.visualDeviationIndex >= VISUAL_DEVIATION_HIGH_THRESHOLD) {
      factors.push('VISUAL_STRUCTURAL_DIFFERENCE');
    }
    if (tamperResult.anomalyIndicators?.includes('MATRIX_STRUCTURAL_DIFFERENCE')) {
      factors.push('MATRIX_STRUCTURAL_DIFFERENCE');
    }
  } else if (tamperResult && tamperResult.analysisQuality === 'DEGRADED') {
    factors.push('TAMPER_ANALYSIS_DEGRADED');
    const hasStructuralDiff =
      tamperResult.boundaryAnomalyDetected === true ||
      tamperResult.visualDeviationIndex >= VISUAL_DEVIATION_HIGH_THRESHOLD ||
      tamperResult.anomalyIndicators?.includes('MATRIX_STRUCTURAL_DIFFERENCE') === true ||
      tamperResult.anomalyIndicators?.includes('BOUNDARY_EDGE_ANOMALY') === true;
    if (hasStructuralDiff) {
      factors.push('POTENTIAL_STRUCTURAL_DIFFERENCE');
    }
  }

  // 3. Image quality-layer risk factors
  if (imageQualityResult.overallQuality === 'INSUFFICIENT') {
    factors.push('IMAGE_QUALITY_INSUFFICIENT');
  } else if (imageQualityResult.overallQuality === 'DEGRADED') {
    factors.push('IMAGE_QUALITY_DEGRADED');
  }

  // 4. Tamper-layer inconclusive quality flag
  if (tamperResult && tamperResult.analysisQuality === 'INCONCLUSIVE') {
    factors.push('TAMPER_ANALYSIS_INCONCLUSIVE');
  }

  // Deterministic deduplication
  return Array.from(new Set(factors));
}
