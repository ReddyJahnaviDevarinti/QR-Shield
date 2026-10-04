import sharp, { type Metadata, type OutputInfo } from 'sharp';
import jsQRLib, { type QRCode } from 'jsqr';
import { DecodedQr, SupportedImageFormat } from './types.js';

// Resolve jsQR callable function across ESM / CommonJS under NodeNext
const jsQR =
  typeof jsQRLib === 'function'
    ? jsQRLib
    : (
        jsQRLib as unknown as {
          default: (
            data: Uint8ClampedArray,
            width: number,
            height: number,
            options?: {
              inversionAttempts?:
                'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst';
            },
          ) => QRCode | null;
        }
      ).default;
import {
  DecodeFailedError,
  InvalidImageError,
  NoQrDetectedError,
  QrDecoderError,
} from './errors.js';

/**
 * Maximum permitted image buffer size (10 MB per system specification).
 */
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Maximum permitted image dimensions (4096 x 4096 px, 16 megapixels) to prevent decompression bombs.
 */
export const MAX_IMAGE_DIMENSION = 4096;
export const MAX_IMAGE_PIXELS = 16_777_216;

/**
 * Supported image formats strictly validated by the decoder.
 */
const SUPPORTED_FORMATS: readonly SupportedImageFormat[] = ['jpeg', 'png', 'webp'];

/**
 * Deterministically decodes a QR code from an in-memory image buffer.
 *
 * Supported formats: image/jpeg, image/png, image/webp.
 * Processing is performed entirely in memory without writing to disk.
 *
 * @param buffer - The raw image buffer.
 * @returns Strongly typed DecodedQr result containing exact payload and geometry.
 * @throws QrDecoderError (InvalidImageError, NoQrDetectedError, DecodeFailedError)
 */
export async function decodeQr(buffer: Buffer): Promise<DecodedQr> {
  // 1. Guard against null, non-buffer, or empty buffer inputs
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new InvalidImageError('Image buffer is empty or not a valid Buffer.');
  }

  // 2. Guard against excessively large inputs
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new InvalidImageError(
      `Image size (${(buffer.length / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed limit of 10 MB.`,
    );
  }

  // 3. Inspect image metadata using Sharp
  let metadata: Metadata;
  try {
    metadata = await sharp(buffer, { failOn: 'error' }).metadata();
  } catch (err) {
    throw new InvalidImageError(
      `Image buffer contains invalid or unrecognized data: ${
        err instanceof Error ? err.message : 'Decoding error'
      }`,
    );
  }

  const format = metadata.format as SupportedImageFormat | undefined;
  if (!format || !SUPPORTED_FORMATS.includes(format)) {
    throw new InvalidImageError(
      `Unsupported image format '${format ?? 'unknown'}'. Supported formats: image/jpeg, image/png, image/webp.`,
    );
  }

  // Dimension & pixel bounds verification (decompression bomb protection)
  const width = metadata.width;
  const height = metadata.height;
  if (!width || !height || width <= 0 || height <= 0) {
    throw new InvalidImageError(
      `Invalid image dimensions: ${width ?? 'unknown'}x${height ?? 'unknown'}.`,
    );
  }

  if (
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION ||
    width * height > MAX_IMAGE_PIXELS
  ) {
    throw new InvalidImageError(
      `Image dimensions (${width}x${height}, ${width * height} pixels) exceed maximum allowed limit of ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION} pixels.`,
    );
  }

  // 4. Normalize image to RGBA pixel buffer in memory
  let rawPixels: Buffer;
  let info: OutputInfo;
  try {
    const normalized = await sharp(buffer, { failOn: 'error' })
      .rotate() // Honor EXIF orientation if present
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    rawPixels = normalized.data;
    info = normalized.info;
  } catch (err) {
    if (err instanceof QrDecoderError) {
      throw err;
    }
    throw new InvalidImageError(
      `Failed to normalize image to RGBA: ${
        err instanceof Error ? err.message : 'Processing error'
      }`,
    );
  }

  if (info.width <= 0 || info.height <= 0) {
    throw new InvalidImageError(
      `Invalid normalized image dimensions: ${info.width}x${info.height}`,
    );
  }

  // 5. Convert to Uint8ClampedArray for jsQR matrix processing
  const clampedData = new Uint8ClampedArray(
    rawPixels.buffer,
    rawPixels.byteOffset,
    rawPixels.length,
  );

  // 6. Deterministic matrix detection and decoding via jsQR
  let decoded: QRCode | null;
  try {
    decoded = jsQR(clampedData, info.width, info.height, {
      inversionAttempts: 'attemptBoth',
    });
  } catch (err) {
    throw new DecodeFailedError(
      `Deterministic QR matrix decoding failed: ${
        err instanceof Error ? err.message : 'Unknown matrix error'
      }`,
    );
  }

  if (!decoded || !decoded.data) {
    throw new NoQrDetectedError(
      'No readable QR code pattern was detected in the provided image.',
    );
  }

  // 7. Calculate finder patterns located
  let finderPatterns = 0;
  if (decoded.location.topLeftFinderPattern) finderPatterns++;
  if (decoded.location.topRightFinderPattern) finderPatterns++;
  if (decoded.location.bottomLeftFinderPattern) finderPatterns++;

  // 8. Return structured deterministic result
  return {
    rawPayload: decoded.data,
    width: info.width,
    height: info.height,
    finderPatternsDetected: finderPatterns,
    location: {
      topLeftCorner: {
        x: decoded.location.topLeftCorner.x,
        y: decoded.location.topLeftCorner.y,
      },
      topRightCorner: {
        x: decoded.location.topRightCorner.x,
        y: decoded.location.topRightCorner.y,
      },
      bottomRightCorner: {
        x: decoded.location.bottomRightCorner.x,
        y: decoded.location.bottomRightCorner.y,
      },
      bottomLeftCorner: {
        x: decoded.location.bottomLeftCorner.x,
        y: decoded.location.bottomLeftCorner.y,
      },
      topLeftFinderPattern: {
        x: decoded.location.topLeftFinderPattern.x,
        y: decoded.location.topLeftFinderPattern.y,
      },
      topRightFinderPattern: {
        x: decoded.location.topRightFinderPattern.x,
        y: decoded.location.topRightFinderPattern.y,
      },
      bottomLeftFinderPattern: {
        x: decoded.location.bottomLeftFinderPattern.x,
        y: decoded.location.bottomLeftFinderPattern.y,
      },
      bottomRightAlignmentPattern: decoded.location.bottomRightAlignmentPattern
        ? {
            x: decoded.location.bottomRightAlignmentPattern.x,
            y: decoded.location.bottomRightAlignmentPattern.y,
          }
        : undefined,
    },
    points: [
      {
        x: decoded.location.topLeftCorner.x,
        y: decoded.location.topLeftCorner.y,
      },
      {
        x: decoded.location.topRightCorner.x,
        y: decoded.location.topRightCorner.y,
      },
      {
        x: decoded.location.bottomRightCorner.x,
        y: decoded.location.bottomRightCorner.y,
      },
      {
        x: decoded.location.bottomLeftCorner.x,
        y: decoded.location.bottomLeftCorner.y,
      },
    ],
    version: decoded.version,
  };
}
