import { VerificationResult } from '../verification-engine/types.js';
import { ImageQualityResult } from '../image-quality/types.js';
import { TamperAnalysisResult } from '../tamper-analysis/types.js';
import {
  CompositeEvidence,
  CompositeVerificationInput,
  CompositeVerificationResult,
} from './types.js';
import {
  aggregateRiskFactors,
  evaluateCompositeStatus,
  getRecommendationForStatus,
} from './rules.js';

/**
 * Combines destination verification evidence, image quality metrics, and physical tamper analysis
 * into ONE canonical QRShield verification result.
 *
 * This function is pure, deterministic, and free of side-effects. It does not perform network,
 * database, or filesystem operations, and never mutates its input parameters.
 *
 * @param destinationResult - Result from deterministic verification engine.
 * @param imageQualityResult - Result from deterministic image quality analyzer.
 * @param tamperResult - Optional result from physical QR tamper analyzer.
 * @returns Strongly typed CompositeVerificationResult.
 */
export function composeVerificationResult(
  destinationResult: VerificationResult,
  imageQualityResult: ImageQualityResult,
  tamperResult?: TamperAnalysisResult | null,
): CompositeVerificationResult;
export function composeVerificationResult(
  input: CompositeVerificationInput,
): CompositeVerificationResult;
export function composeVerificationResult(
  arg1: VerificationResult | CompositeVerificationInput,
  arg2?: ImageQualityResult,
  arg3?: TamperAnalysisResult | null,
): CompositeVerificationResult {
  let destination: VerificationResult;
  let imageQuality: ImageQualityResult;
  let tamper: TamperAnalysisResult | null = null;

  if ('destinationResult' in arg1) {
    destination = arg1.destinationResult;
    imageQuality = arg1.imageQualityResult;
    tamper = arg1.tamperResult ?? null;
  } else {
    destination = arg1;
    imageQuality = arg2!;
    tamper = arg3 ?? null;
  }

  // 1. Evaluate final canonical status via deterministic precedence rules
  const status = evaluateCompositeStatus(destination, imageQuality, tamper);

  // 2. Aggregate machine-readable risk factors
  const riskFactors = aggregateRiskFactors(destination, imageQuality, tamper);

  // 3. Formulate factual diagnostic recommendation
  const recommendation = getRecommendationForStatus(status);

  // 4. Construct consolidated evidence object (without mutating inputs)
  const evidence: CompositeEvidence = {
    destination: {
      scannedDestination: destination.scannedDestination,
      destinationMatch: destination.destinationMatch,
      activeTrustedDestinationsChecked:
        destination.evidence?.activeTrustedDestinationsChecked ?? 0,
      exactMatch: destination.evidence?.exactMatch ?? false,
    },
    imageQuality: {
      overallQuality: imageQuality.overallQuality,
      brightnessClassification: imageQuality.brightnessClassification,
      contrastClassification: imageQuality.contrastClassification,
      sharpnessClassification: imageQuality.sharpnessClassification,
    },
    tamper: tamper
      ? {
          available: true,
          analysisQuality: tamper.analysisQuality,
          visualDeviationIndex: tamper.visualDeviationIndex,
          boundaryAnomalyDetected: tamper.boundaryAnomalyDetected,
          boundaryAnomalyScore: tamper.boundaryAnomalyScore,
          anomalyIndicators: [...tamper.anomalyIndicators],
        }
      : null,
  };

  // 5. Construct canonical result model
  return {
    status,
    destinationStatus: destination.status,
    destinationMatch: destination.destinationMatch,
    scannedDestination: destination.scannedDestination,
    matchedMerchantId: destination.matchedMerchantId,
    matchedDestination: destination.matchedDestination,
    overallImageQuality: imageQuality.overallQuality,
    tamperAnalysisAvailable: tamper !== null && tamper !== undefined,
    visualDeviationIndex: tamper ? tamper.visualDeviationIndex : null,
    boundaryAnomalyDetected: tamper ? tamper.boundaryAnomalyDetected : null,
    riskFactors,
    evidence,
    recommendation,
  };
}
