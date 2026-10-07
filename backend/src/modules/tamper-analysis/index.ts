export { analyzeQrVisualDifference, type TamperAnalysisOptions } from './analyzer.js';

export type {
  AlignmentClassification,
  AnalysisQuality,
  AnomalyIndicator,
  TamperAnalysisResult,
  TamperRecommendation,
} from './types.js';

export {
  AlignmentFailedError,
  CandidateQrNotDetectedError,
  ComparisonFailedError,
  InvalidCandidateImageError,
  InvalidReferenceImageError,
  ReferenceQrNotDetectedError,
  TamperAnalysisError,
} from './errors.js';
export type { TamperAnalysisErrorCode } from './errors.js';

export {
  ALIGNMENT_DEGRADED_THRESHOLD,
  ALIGNMENT_GOOD_THRESHOLD,
  BOUNDARY_ANOMALY_THRESHOLD,
  BOUNDARY_MARGIN_RATIO,
  CANONICAL_QR_SIZE,
  classifyAlignment,
  computeVisualDeviationIndex,
  evaluateTamperRecommendation,
  VISUAL_DEVIATION_HIGH_THRESHOLD,
  VISUAL_DEVIATION_REVIEW_THRESHOLD,
  WEIGHT_BOUNDARY_ANOMALY,
  WEIGHT_MATRIX_MISMATCH,
  WEIGHT_STRUCTURAL_DIFF,
} from './rules.js';

export type { Point2D, QuadPoints, QuadValidationResult } from './geometry.js';
export { validateQuadrilateral } from './geometry.js';

export {
  binarizeGrayscale,
  computeBoundaryAnomalyScore,
  computeGrayscaleStructuralDiff,
  computeMatrixMismatchRatio,
  computeOtsuThreshold,
} from './comparison.js';
