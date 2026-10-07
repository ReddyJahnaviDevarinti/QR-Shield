import sharp from 'sharp';
import { decodeQr } from '../qr-decoder/decoder.js';
import { InvalidImageError, NoQrDetectedError } from '../qr-decoder/errors.js';
import { DecodedQr } from '../qr-decoder/types.js';
import {
  AlignmentFailedError,
  CandidateQrNotDetectedError,
  ComparisonFailedError,
  InvalidCandidateImageError,
  InvalidReferenceImageError,
  ReferenceQrNotDetectedError,
  TamperAnalysisError,
} from './errors.js';
import {
  computeUnitSquareToQuadHomography,
  Point2D,
  validateQuadrilateral,
  warpImageRegion,
} from './geometry.js';
import {
  binarizeGrayscale,
  computeBoundaryAnomalyScore,
  computeGrayscaleStructuralDiff,
  computeMatrixMismatchRatio,
  computeOtsuThreshold,
} from './comparison.js';
import {
  BOUNDARY_MARGIN_RATIO,
  CANONICAL_QR_SIZE,
  classifyAlignment,
  computeVisualDeviationIndex,
  evaluateTamperRecommendation,
} from './rules.js';
import { TamperAnalysisResult } from './types.js';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB limit

export interface TamperAnalysisOptions {
  candidateDecoded?: DecodedQr;
  referenceDecoded?: DecodedQr;
}

/**
 * Deterministically compares a candidate QR image against a trusted reference QR image
 * to identify visual deviations, structural module differences, and boundary/sticker anomalies.
 *
 * All operations execute in memory without filesystem or external network access.
 *
 * @param referenceBuffer - In-memory image buffer of trusted reference QR.
 * @param candidateBuffer - In-memory image buffer of scanned candidate QR.
 * @param options - Optional pre-decoded QR objects to avoid redundant image decoding.
 * @returns Strongly typed TamperAnalysisResult.
 * @throws TamperAnalysisError for invalid inputs or undetectable QR codes.
 */
export async function analyzeQrVisualDifference(
  referenceBuffer: Buffer,
  candidateBuffer: Buffer,
  options?: TamperAnalysisOptions,
): Promise<TamperAnalysisResult> {
  // 1. Guard against null, empty, non-buffer, or oversized inputs
  if (
    !referenceBuffer ||
    !Buffer.isBuffer(referenceBuffer) ||
    referenceBuffer.length === 0
  ) {
    throw new InvalidReferenceImageError(
      'Reference image buffer is empty or not a valid Buffer.',
    );
  }
  if (referenceBuffer.length > MAX_IMAGE_BYTES) {
    throw new InvalidReferenceImageError(
      'Reference image exceeds maximum allowed limit of 10 MB.',
    );
  }

  if (
    !candidateBuffer ||
    !Buffer.isBuffer(candidateBuffer) ||
    candidateBuffer.length === 0
  ) {
    throw new InvalidCandidateImageError(
      'Candidate image buffer is empty or not a valid Buffer.',
    );
  }
  if (candidateBuffer.length > MAX_IMAGE_BYTES) {
    throw new InvalidCandidateImageError(
      'Candidate image exceeds maximum allowed limit of 10 MB.',
    );
  }

  // 2. Decode and locate QR in trusted reference image (reuse pre-decoded if provided)
  let refDecoded: DecodedQr;
  if (options?.referenceDecoded) {
    refDecoded = options.referenceDecoded;
  } else {
    try {
      refDecoded = await decodeQr(referenceBuffer);
    } catch (err) {
      if (err instanceof NoQrDetectedError) {
        throw new ReferenceQrNotDetectedError();
      }
      if (err instanceof InvalidImageError) {
        throw new InvalidReferenceImageError(err.message);
      }
      throw new ReferenceQrNotDetectedError(
        err instanceof Error ? err.message : 'QR detection failed on reference image.',
      );
    }
  }

  // 3. Decode and locate QR in candidate image (reuse pre-decoded if provided)
  let candDecoded: DecodedQr;
  if (options?.candidateDecoded) {
    candDecoded = options.candidateDecoded;
  } else {
    try {
      candDecoded = await decodeQr(candidateBuffer);
    } catch (err) {
      if (err instanceof NoQrDetectedError) {
        throw new CandidateQrNotDetectedError();
      }
      if (err instanceof InvalidImageError) {
        throw new InvalidCandidateImageError(err.message);
      }
      throw new CandidateQrNotDetectedError(
        err instanceof Error ? err.message : 'QR detection failed on candidate image.',
      );
    }
  }

  // 4. Validate geometric sanity of detected corner quadrilaterals
  const refPoints: [Point2D, Point2D, Point2D, Point2D] = [
    refDecoded.location.topLeftCorner,
    refDecoded.location.topRightCorner,
    refDecoded.location.bottomRightCorner,
    refDecoded.location.bottomLeftCorner,
  ];

  const candPoints: [Point2D, Point2D, Point2D, Point2D] = [
    candDecoded.location.topLeftCorner,
    candDecoded.location.topRightCorner,
    candDecoded.location.bottomRightCorner,
    candDecoded.location.bottomLeftCorner,
  ];

  const refValidation = validateQuadrilateral(refPoints);
  const candValidation = validateQuadrilateral(candPoints);

  const alignmentQuality = Math.min(refValidation.quality, candValidation.quality);
  const alignmentClassification = classifyAlignment(alignmentQuality);

  // If geometric alignment is insufficient, return inconclusive result without declaring tampering
  if (alignmentClassification === 'INSUFFICIENT') {
    const evalResult = evaluateTamperRecommendation({
      visualDeviationIndex: 0.0,
      matrixMismatchRatio: 0.0,
      boundaryAnomalyScore: 0.0,
      boundaryAnomalyDetected: false,
      alignmentClassification: 'INSUFFICIENT',
      alignmentQuality,
    });

    return {
      referenceDetected: true,
      candidateDetected: true,
      alignmentQuality,
      alignmentClassification: 'INSUFFICIENT',
      matrixMismatchRatio: 0.0,
      visualDeviationIndex: 0.0,
      boundaryAnomalyScore: 0.0,
      boundaryAnomalyDetected: false,
      anomalyIndicators: evalResult.anomalyIndicators,
      analysisQuality: evalResult.analysisQuality,
      recommendation: evalResult.recommendation,
    };
  }

  // 5. Load normalized grayscale raster images via Sharp in memory
  let refRaw: { data: Buffer; info: { width: number; height: number } };
  let candRaw: { data: Buffer; info: { width: number; height: number } };

  try {
    const refNormalized = await sharp(referenceBuffer, { failOn: 'error' })
      .rotate()
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    refRaw = { data: refNormalized.data, info: refNormalized.info };

    const candNormalized = await sharp(candidateBuffer, { failOn: 'error' })
      .rotate()
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    candRaw = { data: candNormalized.data, info: candNormalized.info };
  } catch (err) {
    throw new ComparisonFailedError(
      `Failed to normalize images for visual comparison: ${
        err instanceof Error ? err.message : 'Raster error'
      }`,
    );
  }

  // 6. Compute homographies and warp images to canonical square grids
  let refQrCore: Uint8Array;
  let candQrCore: Uint8Array;
  let refCollar: Uint8Array;
  let candCollar: Uint8Array;

  try {
    const refTransform = computeUnitSquareToQuadHomography(
      refPoints[0],
      refPoints[1],
      refPoints[2],
      refPoints[3],
    );
    const candTransform = computeUnitSquareToQuadHomography(
      candPoints[0],
      candPoints[1],
      candPoints[2],
      candPoints[3],
    );

    const S = CANONICAL_QR_SIZE;
    const M = BOUNDARY_MARGIN_RATIO;

    // Warp core QR regions
    refQrCore = warpImageRegion(
      refRaw.data,
      refRaw.info.width,
      refRaw.info.height,
      refTransform,
      S,
      0.0,
      1.0,
      0.0,
      1.0,
    );
    candQrCore = warpImageRegion(
      candRaw.data,
      candRaw.info.width,
      candRaw.info.height,
      candTransform,
      S,
      0.0,
      1.0,
      0.0,
      1.0,
    );

    // Warp expanded boundary collars for cutline/overlay detection
    refCollar = warpImageRegion(
      refRaw.data,
      refRaw.info.width,
      refRaw.info.height,
      refTransform,
      S,
      -M,
      1.0 + M,
      -M,
      1.0 + M,
    );
    candCollar = warpImageRegion(
      candRaw.data,
      candRaw.info.width,
      candRaw.info.height,
      candTransform,
      S,
      -M,
      1.0 + M,
      -M,
      1.0 + M,
    );
  } catch (err) {
    if (err instanceof TamperAnalysisError) {
      throw err;
    }
    throw new AlignmentFailedError(
      `Projective alignment failed: ${err instanceof Error ? err.message : 'Homography error'}`,
    );
  }

  // 7. Binarization and difference metric computations
  try {
    const refOtsu = computeOtsuThreshold(refQrCore);
    const candOtsu = computeOtsuThreshold(candQrCore);

    const refBinary = binarizeGrayscale(refQrCore, refOtsu);
    const candBinary = binarizeGrayscale(candQrCore, candOtsu);

    const matrixMismatchRatio = computeMatrixMismatchRatio(refBinary, candBinary);
    const structuralDiff = computeGrayscaleStructuralDiff(refQrCore, candQrCore);

    const boundaryResult = computeBoundaryAnomalyScore(
      refCollar,
      candCollar,
      CANONICAL_QR_SIZE,
      BOUNDARY_MARGIN_RATIO,
    );

    const visualDeviationIndex = computeVisualDeviationIndex(
      matrixMismatchRatio,
      boundaryResult.score,
      structuralDiff,
    );

    const evalResult = evaluateTamperRecommendation({
      visualDeviationIndex,
      matrixMismatchRatio,
      boundaryAnomalyScore: boundaryResult.score,
      boundaryAnomalyDetected: boundaryResult.detected,
      alignmentClassification,
      alignmentQuality,
    });

    return {
      referenceDetected: true,
      candidateDetected: true,
      alignmentQuality,
      alignmentClassification,
      matrixMismatchRatio,
      visualDeviationIndex,
      boundaryAnomalyScore: boundaryResult.score,
      boundaryAnomalyDetected: boundaryResult.detected,
      anomalyIndicators: evalResult.anomalyIndicators,
      analysisQuality: evalResult.analysisQuality,
      recommendation: evalResult.recommendation,
    };
  } catch (err) {
    if (err instanceof TamperAnalysisError) {
      throw err;
    }
    throw new ComparisonFailedError(
      `Visual difference comparison failed: ${
        err instanceof Error ? err.message : 'Metric calculation error'
      }`,
    );
  }
}
