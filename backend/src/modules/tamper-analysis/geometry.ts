import type { AlignmentClassification } from './types.js';
import { classifyAlignment } from './rules.js';

export interface Point2D {
  x: number;
  y: number;
}

export interface QuadPoints {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
}

export interface QuadValidationResult {
  isValid: boolean;
  quality: number;
  classification: AlignmentClassification;
  area: number;
  reason?: string;
}

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates 2D cross product of vectors (p1 -> p2) and (p2 -> p3).
 */
export function crossProduct(p1: Point2D, p2: Point2D, p3: Point2D): number {
  return (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x);
}

/**
 * Computes polygon area using the Shoelace formula.
 */
export function computeQuadArea(points: [Point2D, Point2D, Point2D, Point2D]): number {
  const [p0, p1, p2, p3] = points;
  return (
    0.5 *
    Math.abs(
      p0.x * p1.y -
        p1.x * p0.y +
        (p1.x * p2.y - p2.x * p1.y) +
        (p2.x * p3.y - p3.x * p2.y) +
        (p3.x * p0.y - p0.x * p3.y),
    )
  );
}

/**
 * Validates geometric sanity and computes alignment quality for a QR quadrilateral.
 *
 * Checks:
 * 1. Non-degeneracy (points exist and are finite)
 * 2. Strict convexity (all corner cross products have the same sign)
 * 3. Minimum area (at least 400 square pixels)
 * 4. Diagonal proportion and orthogonality sanity
 *
 * @param points - 4 corner points ordered [topLeft, topRight, bottomRight, bottomLeft]
 * @returns QuadValidationResult with normalized quality in [0.0, 1.0] and classification.
 */
export function validateQuadrilateral(
  points: [Point2D, Point2D, Point2D, Point2D],
): QuadValidationResult {
  for (const pt of points) {
    if (!pt || !Number.isFinite(pt.x) || !Number.isFinite(pt.y)) {
      return {
        isValid: false,
        quality: 0.0,
        classification: 'INSUFFICIENT',
        area: 0,
        reason: 'Quadrilateral points contain non-finite coordinates.',
      };
    }
  }

  const [p0, p1, p2, p3] = points;

  // 1. Convexity check: verify cross products at all 4 corners have identical signs
  const cp0 = crossProduct(p3, p0, p1);
  const cp1 = crossProduct(p0, p1, p2);
  const cp2 = crossProduct(p1, p2, p3);
  const cp3 = crossProduct(p2, p3, p0);

  const allPositive = cp0 > 1e-4 && cp1 > 1e-4 && cp2 > 1e-4 && cp3 > 1e-4;
  const allNegative = cp0 < -1e-4 && cp1 < -1e-4 && cp2 < -1e-4 && cp3 < -1e-4;

  if (!allPositive && !allNegative) {
    return {
      isValid: false,
      quality: 0.0,
      classification: 'INSUFFICIENT',
      area: computeQuadArea(points),
      reason: 'Quadrilateral is self-intersecting or non-convex.',
    };
  }

  // 2. Minimum area check (a readable QR is at least ~20x20 pixels = 400 px^2)
  const area = computeQuadArea(points);
  if (area < 400) {
    return {
      isValid: false,
      quality: 0.0,
      classification: 'INSUFFICIENT',
      area,
      reason: `Quadrilateral area (${area.toFixed(1)} px) is below minimum threshold (400 px).`,
    };
  }

  // 3. Geometric sanity metrics
  const d01 = distance(p0, p1); // top
  const d12 = distance(p1, p2); // right
  const d23 = distance(p2, p3); // bottom
  const d30 = distance(p3, p0); // left
  const diag02 = distance(p0, p2); // diagonal 1
  const diag13 = distance(p1, p3); // diagonal 2

  if (d01 < 10 || d12 < 10 || d23 < 10 || d30 < 10 || diag02 < 10 || diag13 < 10) {
    return {
      isValid: false,
      quality: 0.0,
      classification: 'INSUFFICIENT',
      area,
      reason: 'One or more quad edges are degenerate (< 10 px).',
    };
  }

  // Diagonal symmetry: in an ideal square, diagonals are identical
  const diagRatio = Math.min(diag02, diag13) / Math.max(diag02, diag13);

  // Opposite side symmetry
  const sideRatio1 = Math.min(d01, d23) / Math.max(d01, d23);
  const sideRatio2 = Math.min(d12, d30) / Math.max(d12, d30);
  const oppositeSymmetry = 0.5 * (sideRatio1 + sideRatio2);

  // Aspect ratio consistency
  const avgWidth = 0.5 * (d01 + d23);
  const avgHeight = 0.5 * (d12 + d30);
  const aspectRatioFactor = Math.min(avgWidth, avgHeight) / Math.max(avgWidth, avgHeight);

  // Corner orthogonality: compute |cos(theta)| at each corner
  const corners: [Point2D, Point2D, Point2D][] = [
    [p3, p0, p1],
    [p0, p1, p2],
    [p1, p2, p3],
    [p2, p3, p0],
  ];

  let sumOrthogonality = 0;
  for (const [prev, curr, next] of corners) {
    const v1x = prev.x - curr.x;
    const v1y = prev.y - curr.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const len2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (len1 > 0 && len2 > 0) {
      const dot = v1x * v2x + v1y * v2y;
      const cosTheta = Math.abs(dot / (len1 * len2));
      // For 90 degrees, cosTheta is 0; factor is (1 - cosTheta)
      sumOrthogonality += Math.max(0, 1 - cosTheta);
    }
  }
  const avgOrthogonality = sumOrthogonality / 4;

  // Composite alignment quality score
  const rawQuality =
    0.35 * diagRatio +
    0.35 * avgOrthogonality +
    0.15 * oppositeSymmetry +
    0.15 * aspectRatioFactor;

  const quality = Math.min(1.0, Math.max(0.0, Math.round(rawQuality * 10000) / 10000));
  const classification = classifyAlignment(quality);

  return {
    isValid: classification !== 'INSUFFICIENT',
    quality,
    classification,
    area,
  };
}

/**
 * 3x3 Projective Homography coefficients mapping unit square (u, v) in [0, 1]^2
 * to arbitrary quadrilateral points (p0, p1, p2, p3).
 */
export interface HomographyTransform {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  g: number;
  h: number;
  map: (u: number, v: number) => Point2D;
}

/**
 * Computes closed-form 3x3 projective homography mapping unit square [0, 1] x [0, 1]
 * to the quadrilateral [p0, p1, p2, p3] (topLeft, topRight, bottomRight, bottomLeft).
 *
 * Reference: Heckbert, P. "Projective Mappings for Image Warping", 1989.
 *
 * @param p0 - Top-left point (u=0, v=0)
 * @param p1 - Top-right point (u=1, v=0)
 * @param p2 - Bottom-right point (u=1, v=1)
 * @param p3 - Bottom-left point (u=0, v=1)
 * @returns HomographyTransform with coefficients and mapping function.
 */
export function computeUnitSquareToQuadHomography(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
): HomographyTransform {
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;

  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;

  // Affine case
  if (Math.abs(dx3) < 1e-7 && Math.abs(dy3) < 1e-7) {
    const a = p1.x - p0.x;
    const b = p3.x - p0.x;
    const c = p0.x;
    const d = p1.y - p0.y;
    const e = p3.y - p0.y;
    const f = p0.y;
    const g = 0;
    const h = 0;

    return {
      a,
      b,
      c,
      d,
      e,
      f,
      g,
      h,
      map: (u: number, v: number) => ({
        x: a * u + b * v + c,
        y: d * u + e * v + f,
      }),
    };
  }

  // Projective case
  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 1e-9) {
    throw new Error('Degenerate quad: homography determinant is zero.');
  }

  const g = (dx3 * dy2 - dx2 * dy3) / det;
  const h = (dx1 * dy3 - dx3 * dy1) / det;
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const c = p0.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + h * p3.y;
  const f = p0.y;

  return {
    a,
    b,
    c,
    d,
    e,
    f,
    g,
    h,
    map: (u: number, v: number) => {
      const w = g * u + h * v + 1.0;
      return {
        x: (a * u + b * v + c) / w,
        y: (d * u + e * v + f) / w,
      };
    },
  };
}

/**
 * Samples a single pixel from an 8-bit grayscale image using bilinear interpolation.
 * Out-of-bounds coordinates are clamped to image boundaries.
 */
export function sampleBilinear(
  pixels: Uint8Array | Buffer,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  const clampedX = Math.max(0, Math.min(width - 1, x));
  const clampedY = Math.max(0, Math.min(height - 1, y));

  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);

  const dx = clampedX - x0;
  const dy = clampedY - y0;

  const v00 = pixels[y0 * width + x0]!;
  const v10 = pixels[y0 * width + x1]!;
  const v01 = pixels[y1 * width + x0]!;
  const v11 = pixels[y1 * width + x1]!;

  const top = (1.0 - dx) * v00 + dx * v10;
  const bottom = (1.0 - dx) * v01 + dx * v11;
  const val = (1.0 - dy) * top + dy * bottom;

  return Math.round(val);
}

/**
 * Warps a grayscale image into a canonical square analysis grid using projective homography.
 *
 * @param pixels - Grayscale 8-bit pixel buffer.
 * @param width - Source image width.
 * @param height - Source image height.
 * @param transform - HomographyTransform mapping unit square to source pixel coordinates.
 * @param size - Canonical square resolution (e.g. 256).
 * @param uMin - Minimum u coordinate (e.g. 0.0 for QR core, -0.12 for boundary collar).
 * @param uMax - Maximum u coordinate (e.g. 1.0 for QR core, 1.12 for boundary collar).
 * @param vMin - Minimum v coordinate (e.g. 0.0 for QR core, -0.12 for boundary collar).
 * @param vMax - Maximum v coordinate (e.g. 1.0 for QR core, 1.12 for boundary collar).
 * @returns Canonical warped grayscale Uint8Array of size (size * size).
 */
export function warpImageRegion(
  pixels: Uint8Array | Buffer,
  width: number,
  height: number,
  transform: HomographyTransform,
  size: number,
  uMin = 0.0,
  uMax = 1.0,
  vMin = 0.0,
  vMax = 1.0,
): Uint8Array {
  const output = new Uint8Array(size * size);
  const uSpan = uMax - uMin;
  const vSpan = vMax - vMin;

  for (let j = 0; j < size; j++) {
    const v = vMin + (j / (size - 1)) * vSpan;
    const rowOffset = j * size;
    for (let i = 0; i < size; i++) {
      const u = uMin + (i / (size - 1)) * uSpan;
      const pt = transform.map(u, v);
      output[rowOffset + i] = sampleBilinear(pixels, width, height, pt.x, pt.y);
    }
  }

  return output;
}
