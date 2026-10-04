/**
 * Supported image format types strictly validated by the image quality analyzer.
 */
export type SupportedImageFormat = 'jpeg' | 'png' | 'webp';

/**
 * Brightness classification based on mean grayscale exposure.
 */
export type BrightnessClassification = 'TOO_DARK' | 'ACCEPTABLE' | 'TOO_BRIGHT';

/**
 * Contrast classification based on normalized luminance dispersion.
 */
export type ContrastClassification = 'LOW_CONTRAST' | 'ACCEPTABLE_CONTRAST';

/**
 * Sharpness classification based on high-frequency edge gradient variance.
 */
export type SharpnessClassification = 'BLURRY' | 'ACCEPTABLE_SHARPNESS';

/**
 * Deterministic overall quality decision.
 * Note: ACCEPTABLE means visual quality is suitable for analysis; it does NOT guarantee QR readability.
 */
export type OverallQualityClassification = 'ACCEPTABLE' | 'DEGRADED' | 'INSUFFICIENT';

/**
 * Standard quality flag identifiers for detected image flaws.
 */
export type QualityFlag =
  | 'TOO_DARK'
  | 'TOO_BRIGHT'
  | 'LOW_CONTRAST'
  | 'BLURRY'
  | 'EXTREME_BLUR'
  | 'LOW_RESOLUTION'
  | 'UNUSABLE_DIMENSIONS'
  | 'LOW_DYNAMIC_RANGE';

/**
 * The strongly typed canonical result emitted by the image quality analyzer.
 */
export interface ImageQualityResult {
  /** Width of the source image in pixels */
  width: number;
  /** Height of the source image in pixels */
  height: number;
  /** Total pixel count of the source image (width * height) */
  pixelCount: number;
  /** Mean grayscale luminance normalized from 0.0 (pitch black) to 1.0 (pure white) */
  meanBrightness: number;
  /** Contrast score computed via normalized standard deviation from 0.0 (flat) to 1.0 (high) */
  contrastScore: number;
  /** Sharpness score computed via normalized variance of Laplacian from 0.0 (smooth) to 1.0 (sharp) */
  sharpnessScore: number;
  /** Dynamic range computed as (maxIntensity - minIntensity) / 255.0, from 0.0 to 1.0 */
  dynamicRange: number;
  /** Categorical exposure classification */
  brightnessClassification: BrightnessClassification;
  /** Categorical contrast classification */
  contrastClassification: ContrastClassification;
  /** Categorical sharpness classification */
  sharpnessClassification: SharpnessClassification;
  /** Overall deterministic quality classification */
  overallQuality: OverallQualityClassification;
  /** Array of diagnostic quality flags representing detected visual flaws */
  qualityFlags: QualityFlag[];
}
