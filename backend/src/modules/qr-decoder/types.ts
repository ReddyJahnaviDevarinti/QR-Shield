/**
 * Coordinate point representing an (x, y) pixel location on the image matrix.
 */
export interface QrPoint {
  x: number;
  y: number;
}

/**
 * Coordinate mapping of the QR matrix corners and finder patterns.
 */
export interface QrLocation {
  topLeftCorner: QrPoint;
  topRightCorner: QrPoint;
  bottomRightCorner: QrPoint;
  bottomLeftCorner: QrPoint;
  topLeftFinderPattern: QrPoint;
  topRightFinderPattern: QrPoint;
  bottomLeftFinderPattern: QrPoint;
  bottomRightAlignmentPattern?: QrPoint | undefined;
}

/**
 * Decoded result from the deterministic QR decoder.
 */
export interface DecodedQr {
  /** The exact raw payload decoded from the QR matrix */
  rawPayload: string;
  /** Width of the normalized image in pixels */
  width: number;
  /** Height of the normalized image in pixels */
  height: number;
  /** Count of finder patterns successfully located (3 for standard QR codes) */
  finderPatternsDetected: number;
  /** Complete bounding coordinates and pattern centers returned by jsQR */
  location: QrLocation;
  /** Array of the 4 corner points in clockwise order [topLeft, topRight, bottomRight, bottomLeft] */
  points: [QrPoint, QrPoint, QrPoint, QrPoint];
  /** QR code standard version (1-40) if detected */
  version?: number;
}

/**
 * Supported MIME types for QR input images.
 */
export type SupportedImageMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

/**
 * Supported image format names from Sharp.
 */
export type SupportedImageFormat = 'jpeg' | 'png' | 'webp';
