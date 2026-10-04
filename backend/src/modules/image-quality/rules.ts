import {
  BrightnessClassification,
  ContrastClassification,
  OverallQualityClassification,
  QualityFlag,
  SharpnessClassification,
} from './types.js';

/**
 * ============================================================================
 * INITIAL ENGINEERING HEURISTICS
 * ============================================================================
 * NOTE: These thresholds are deterministic engineering heuristics designed for
 * robust pre-screening of QR code images. They are not universal photographic
 * laws and will later be calibrated using empirical benchmark image datasets.
 * ============================================================================
 */

/** Maximum permitted input file size (10 MB). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** Maximum permitted input image dimension (4096 px) to prevent decompression bombs. */
export const MAX_IMAGE_DIMENSION = 4096;

/** Maximum permitted input image total pixels (16 megapixels). */
export const MAX_IMAGE_PIXELS = 16_777_216;

/** Bounded maximum dimension for internal pixel analysis (prevents excessive memory use). */
export const MAX_ANALYSIS_DIMENSION = 512;

/** Absolute minimum dimension (px) below which an image cannot reliably contain a decodable QR. */
export const MIN_USABLE_DIMENSION = 64;

/** Minimum recommended dimension (px) for clean, high-confidence QR reading. */
export const MIN_RECOMMENDED_DIMENSION = 200;

/** Mean grayscale brightness below which an image is considered under-exposed / too dark. */
export const BRIGHTNESS_TOO_DARK_THRESHOLD = 0.2;

/** Mean grayscale brightness above which an image is considered over-exposed / too bright. */
export const BRIGHTNESS_TOO_BRIGHT_THRESHOLD = 0.85;

/** Normalized contrast score below which luminance dispersion is insufficient for reliable edges. */
export const CONTRAST_LOW_THRESHOLD = 0.25;

/** Normalized sharpness score below which high-frequency edge gradients indicate blur. */
export const SHARPNESS_BLUR_THRESHOLD = 0.15;

/** Normalized sharpness score below which severe blur prevents edge formation. */
export const SHARPNESS_EXTREME_BLUR_THRESHOLD = 0.04;

/** Dynamic range threshold below which the range of pixel values is considered severely compressed. */
export const DYNAMIC_RANGE_LOW_THRESHOLD = 0.3;

/**
 * Classifies mean grayscale luminance into an exposure category.
 *
 * @param meanBrightness - Normalized mean brightness in [0.0, 1.0].
 * @returns 'TOO_DARK' | 'ACCEPTABLE' | 'TOO_BRIGHT'
 */
export function classifyBrightness(meanBrightness: number): BrightnessClassification {
  if (meanBrightness < BRIGHTNESS_TOO_DARK_THRESHOLD) {
    return 'TOO_DARK';
  }
  if (meanBrightness > BRIGHTNESS_TOO_BRIGHT_THRESHOLD) {
    return 'TOO_BRIGHT';
  }
  return 'ACCEPTABLE';
}

/**
 * Classifies normalized contrast score into a contrast category.
 *
 * @param contrastScore - Normalized contrast score in [0.0, 1.0].
 * @returns 'LOW_CONTRAST' | 'ACCEPTABLE_CONTRAST'
 */
export function classifyContrast(contrastScore: number): ContrastClassification {
  if (contrastScore < CONTRAST_LOW_THRESHOLD) {
    return 'LOW_CONTRAST';
  }
  return 'ACCEPTABLE_CONTRAST';
}

/**
 * Classifies normalized variance-of-Laplacian sharpness score into a sharpness category.
 *
 * @param sharpnessScore - Normalized sharpness score in [0.0, 1.0].
 * @returns 'BLURRY' | 'ACCEPTABLE_SHARPNESS'
 */
export function classifySharpness(sharpnessScore: number): SharpnessClassification {
  if (sharpnessScore < SHARPNESS_BLUR_THRESHOLD) {
    return 'BLURRY';
  }
  return 'ACCEPTABLE_SHARPNESS';
}

/**
 * Deterministically evaluates overall image quality based on constituent metrics.
 *
 * Decision Logic:
 * - INSUFFICIENT: Cannot be reliably used for downstream QR analysis due to unusable
 *   dimensions, extreme blur, severe exposure compounded with low contrast, or near-zero range.
 * - DEGRADED: One or more quality dimensions are compromised, but meaningful information remains.
 * - ACCEPTABLE: Exposure, contrast, sharpness, and resolution meet all recommended thresholds.
 *
 * @param input - Consolidated metrics and classifications.
 * @returns Object with overallQuality and structured diagnostic qualityFlags.
 */
export function evaluateOverallQuality(input: {
  width: number;
  height: number;
  meanBrightness: number;
  contrastScore: number;
  sharpnessScore: number;
  dynamicRange: number;
  brightnessClassification: BrightnessClassification;
  contrastClassification: ContrastClassification;
  sharpnessClassification: SharpnessClassification;
}): {
  overallQuality: OverallQualityClassification;
  qualityFlags: QualityFlag[];
} {
  const flags: QualityFlag[] = [];

  // 1. Dimension evaluation
  if (input.width < MIN_USABLE_DIMENSION || input.height < MIN_USABLE_DIMENSION) {
    flags.push('UNUSABLE_DIMENSIONS');
  } else if (
    input.width < MIN_RECOMMENDED_DIMENSION ||
    input.height < MIN_RECOMMENDED_DIMENSION
  ) {
    flags.push('LOW_RESOLUTION');
  }

  // 2. Exposure evaluation
  if (input.brightnessClassification === 'TOO_DARK') {
    flags.push('TOO_DARK');
  } else if (input.brightnessClassification === 'TOO_BRIGHT') {
    flags.push('TOO_BRIGHT');
  }

  // 3. Contrast evaluation
  if (input.contrastClassification === 'LOW_CONTRAST') {
    flags.push('LOW_CONTRAST');
  }

  // 4. Sharpness evaluation
  if (input.sharpnessClassification === 'BLURRY') {
    flags.push('BLURRY');
    if (input.sharpnessScore < SHARPNESS_EXTREME_BLUR_THRESHOLD) {
      flags.push('EXTREME_BLUR');
    }
  }

  // 5. Dynamic range evaluation
  if (input.dynamicRange < DYNAMIC_RANGE_LOW_THRESHOLD) {
    flags.push('LOW_DYNAMIC_RANGE');
  }

  // Determine Overall Quality
  const hasUnusableDimensions = flags.includes('UNUSABLE_DIMENSIONS');
  const hasExtremeBlur = flags.includes('EXTREME_BLUR');
  const hasSevereExposureWithLowContrast =
    (flags.includes('TOO_DARK') || flags.includes('TOO_BRIGHT')) &&
    flags.includes('LOW_CONTRAST');
  const hasNearZeroDynamicRange = input.dynamicRange < 0.05;

  if (
    hasUnusableDimensions ||
    hasExtremeBlur ||
    hasSevereExposureWithLowContrast ||
    hasNearZeroDynamicRange
  ) {
    return {
      overallQuality: 'INSUFFICIENT',
      qualityFlags: flags,
    };
  }

  if (flags.length > 0) {
    return {
      overallQuality: 'DEGRADED',
      qualityFlags: flags,
    };
  }

  return {
    overallQuality: 'ACCEPTABLE',
    qualityFlags: [],
  };
}
