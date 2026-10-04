import sharp, { type Metadata } from 'sharp';
import { ImageQualityResult, SupportedImageFormat } from './types.js';
import { ImageTooLargeError, InvalidImageError } from './errors.js';
import {
  classifyBrightness,
  classifyContrast,
  classifySharpness,
  evaluateOverallQuality,
  MAX_ANALYSIS_DIMENSION,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_PIXELS,
} from './rules.js';

/** Supported image formats strictly validated by Sharp. */
const SUPPORTED_FORMATS: readonly SupportedImageFormat[] = ['jpeg', 'png', 'webp'];

/**
 * Deterministically analyzes the visual quality of an in-memory image buffer.
 *
 * Safe Processing Guarantees:
 * - Pure CPU in-memory execution: zero network calls, zero filesystem writes.
 * - Protects caller's buffer from mutation.
 * - Downsamples large images to a bounded internal analysis grid (MAX_ANALYSIS_DIMENSION)
 *   while preserving and returning source image dimensions.
 * - Deterministic output: identical buffer inputs yield identical numeric results.
 *
 * Quality Metrics Computed:
 * 1. width / height: Source dimensions in pixels.
 * 2. pixelCount: Total source pixel count (width * height).
 * 3. meanBrightness: Mean grayscale intensity normalized from 0.0 (dark) to 1.0 (bright).
 * 4. contrastScore: Normalized grayscale standard deviation from 0.0 (flat) to 1.0 (high).
 * 5. sharpnessScore: Normalized variance of discrete 2D Laplacian edge gradients.
 * 6. dynamicRange: Grayscale intensity span (max - min) / 255.0.
 *
 * @param buffer - In-memory image buffer.
 * @returns Strongly typed ImageQualityResult with numeric metrics, classifications, and flags.
 * @throws InvalidImageError on empty, non-buffer, corrupt, or unsupported formats.
 * @throws ImageTooLargeError when image size exceeds 10 MB limit or dimensions exceed maximum limits.
 */
export async function analyzeImageQuality(buffer: Buffer): Promise<ImageQualityResult> {
  // 1. Guard against null, non-buffer, or empty buffer inputs
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new InvalidImageError('Image buffer is empty or not a valid Buffer.');
  }

  // 2. Guard against excessively large inputs (10 MB limit)
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new ImageTooLargeError(
      `Image size (${(buffer.length / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed limit of 10 MB.`,
    );
  }

  // 3. Inspect image metadata using Sharp
  let metadata: Metadata;
  try {
    metadata = await sharp(buffer, { failOn: 'error' }).metadata();
  } catch {
    throw new InvalidImageError(
      'Image buffer contains invalid or unrecognized image data.',
    );
  }

  const format = metadata.format as SupportedImageFormat | undefined;
  if (!format || !SUPPORTED_FORMATS.includes(format)) {
    throw new InvalidImageError(
      `Unsupported image format '${format ?? 'unknown'}'. Supported formats: image/jpeg, image/png, image/webp.`,
    );
  }

  const sourceWidth = metadata.width;
  const sourceHeight = metadata.height;

  if (!sourceWidth || !sourceHeight || sourceWidth <= 0 || sourceHeight <= 0) {
    throw new InvalidImageError(
      `Invalid source image dimensions: ${sourceWidth}x${sourceHeight}`,
    );
  }

  if (
    sourceWidth > MAX_IMAGE_DIMENSION ||
    sourceHeight > MAX_IMAGE_DIMENSION ||
    sourceWidth * sourceHeight > MAX_IMAGE_PIXELS
  ) {
    throw new ImageTooLargeError(
      `Image dimensions (${sourceWidth}x${sourceHeight}, ${sourceWidth * sourceHeight} pixels) exceed maximum allowed limit of ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION} pixels.`,
    );
  }

  // 4. Normalize to bounded grayscale pixel buffer in memory
  let data: Buffer;
  let info: { width: number; height: number };
  try {
    const normalized = await sharp(buffer, { failOn: 'error' })
      .rotate() // Honor EXIF orientation if present
      .resize({
        width: MAX_ANALYSIS_DIMENSION,
        height: MAX_ANALYSIS_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    data = normalized.data;
    info = normalized.info;
  } catch {
    throw new InvalidImageError(
      'Failed to decode and normalize image buffer to grayscale.',
    );
  }

  // 5. Compute brightness, contrast, and dynamic range
  const numPixels = data.length;
  let sum = 0;
  let sumSq = 0;
  let minVal = 255;
  let maxVal = 0;

  for (let i = 0; i < numPixels; i++) {
    const val = data[i]!;
    sum += val;
    sumSq += val * val;
    if (val < minVal) minVal = val;
    if (val > maxVal) maxVal = val;
  }

  const meanIntensity = sum / numPixels;
  const meanBrightness = Math.round((meanIntensity / 255.0) * 10000) / 10000;

  const variance = Math.max(0, sumSq / numPixels - meanIntensity * meanIntensity);
  const stdDev = Math.sqrt(variance);
  // Max theoretical standard deviation for values in [0, 255] is 127.5
  const contrastScore = Math.min(1.0, Math.round((stdDev / 127.5) * 10000) / 10000);

  const dynamicRange = Math.round(((maxVal - minVal) / 255.0) * 10000) / 10000;

  // 6. Compute discrete Laplacian sharpness (variance of Laplacian)
  const w = info.width;
  const h = info.height;
  let sharpnessScore = 0;

  if (w >= 3 && h >= 3) {
    const interiorCount = (w - 2) * (h - 2);
    let sumLap = 0;
    let sumLapSq = 0;

    for (let y = 1; y < h - 1; y++) {
      const rowOffset = y * w;
      const rowAbove = (y - 1) * w;
      const rowBelow = (y + 1) * w;

      for (let x = 1; x < w - 1; x++) {
        const center = data[rowOffset + x]!;
        const lap =
          data[rowOffset + x + 1]! +
          data[rowOffset + x - 1]! +
          data[rowBelow + x]! +
          data[rowAbove + x]! -
          4 * center;

        sumLap += lap;
        sumLapSq += lap * lap;
      }
    }

    const meanLap = sumLap / interiorCount;
    const varLap = Math.max(0, sumLapSq / interiorCount - meanLap * meanLap);

    // Linear normalization mapping variance [0, 1000] to [0.0, 1.0]
    sharpnessScore = Math.min(1.0, Math.round((varLap / 1000.0) * 10000) / 10000);
  }

  // 7. Derive classifications and overall decision
  const brightnessClassification = classifyBrightness(meanBrightness);
  const contrastClassification = classifyContrast(contrastScore);
  const sharpnessClassification = classifySharpness(sharpnessScore);

  const { overallQuality, qualityFlags } = evaluateOverallQuality({
    width: sourceWidth,
    height: sourceHeight,
    meanBrightness,
    contrastScore,
    sharpnessScore,
    dynamicRange,
    brightnessClassification,
    contrastClassification,
    sharpnessClassification,
  });

  return {
    width: sourceWidth,
    height: sourceHeight,
    pixelCount: sourceWidth * sourceHeight,
    meanBrightness,
    contrastScore,
    sharpnessScore,
    dynamicRange,
    brightnessClassification,
    contrastClassification,
    sharpnessClassification,
    overallQuality,
    qualityFlags,
  };
}
