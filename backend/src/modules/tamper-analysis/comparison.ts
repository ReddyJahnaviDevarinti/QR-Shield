import { BOUNDARY_ANOMALY_THRESHOLD } from './rules.js';

/**
 * Computes the optimal Otsu threshold for an 8-bit grayscale image buffer.
 *
 * Maximizes inter-class variance between background and foreground distributions:
 *   sigma_B^2(t) = w0(t) * w1(t) * [mu0(t) - mu1(t)]^2
 *
 * Deterministic and illumination-adaptive.
 *
 * @param pixels - 8-bit grayscale pixel buffer
 * @returns Optimal threshold in [0, 255]
 */
export function computeOtsuThreshold(pixels: Uint8Array): number {
  const n = pixels.length;
  if (n === 0) return 128;

  // 1. Compute 256-bin histogram
  const histogram = new Int32Array(256);
  for (let i = 0; i < n; i++) {
    histogram[pixels[i]!]!++;
  }

  // 2. Compute total pixel intensity sum
  let sumTotal = 0;
  for (let t = 0; t < 256; t++) {
    sumTotal += t * histogram[t]!;
  }

  let sumBackground = 0;
  let weightBackground = 0;
  let maxVariance = -1;
  let bestThresholdSum = 0;
  let bestThresholdCount = 0;

  for (let t = 0; t < 256; t++) {
    const count = histogram[t]!;
    weightBackground += count;
    if (weightBackground === 0) continue;

    const weightForeground = n - weightBackground;
    if (weightForeground === 0) break;

    sumBackground += t * count;

    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sumTotal - sumBackground) / weightForeground;
    const meanDiff = meanBackground - meanForeground;

    const betweenClassVariance =
      weightBackground * weightForeground * meanDiff * meanDiff;

    if (betweenClassVariance > maxVariance) {
      maxVariance = betweenClassVariance;
      bestThresholdSum = t;
      bestThresholdCount = 1;
    } else if (Math.abs(betweenClassVariance - maxVariance) < 1e-5 && maxVariance > 0) {
      bestThresholdSum += t;
      bestThresholdCount++;
    }
  }

  return bestThresholdCount > 0 ? Math.round(bestThresholdSum / bestThresholdCount) : 128;
}

/**
 * Binarizes an 8-bit grayscale image using the specified threshold.
 *
 * Pixels >= threshold become 255 (white/light module).
 * Pixels < threshold become 0 (black/dark module).
 */
export function binarizeGrayscale(pixels: Uint8Array, threshold: number): Uint8Array {
  const output = new Uint8Array(pixels.length);
  for (let i = 0; i < pixels.length; i++) {
    output[i] = pixels[i]! >= threshold ? 255 : 0;
  }
  return output;
}

/**
 * Computes the ratio of differing binary modules between reference and candidate QR matrices.
 *
 * Formula:
 *   matrixMismatchRatio = (count of differing pixels) / (total pixels)
 *
 * @returns Normalized ratio in [0.0, 1.0] rounded to 4 decimals.
 */
export function computeMatrixMismatchRatio(
  refBinary: Uint8Array,
  candBinary: Uint8Array,
): number {
  if (refBinary.length === 0 || refBinary.length !== candBinary.length) {
    throw new Error('Binary matrix dimensions must match and be non-empty.');
  }

  let mismatchCount = 0;
  const total = refBinary.length;

  for (let i = 0; i < total; i++) {
    if (refBinary[i] !== candBinary[i]) {
      mismatchCount++;
    }
  }

  const ratio = mismatchCount / total;
  return Math.min(1.0, Math.max(0.0, Math.round(ratio * 10000) / 10000));
}

/**
 * Computes mean normalized grayscale structural difference between aligned reference
 * and candidate QR regions.
 *
 * Captures gradient and edge intensity divergence beyond binary thresholding.
 *
 * @returns Normalized structural difference in [0.0, 1.0] rounded to 4 decimals.
 */
export function computeGrayscaleStructuralDiff(
  refGray: Uint8Array,
  candGray: Uint8Array,
): number {
  if (refGray.length === 0 || refGray.length !== candGray.length) {
    throw new Error('Grayscale buffer dimensions must match and be non-empty.');
  }

  let totalDiff = 0;
  const n = refGray.length;

  for (let i = 0; i < n; i++) {
    totalDiff += Math.abs(refGray[i]! - candGray[i]!);
  }

  const normalized = totalDiff / (n * 255);
  return Math.min(1.0, Math.max(0.0, Math.round(normalized * 10000) / 10000));
}

export interface BoundaryAnomalyResult {
  score: number;
  detected: boolean;
}

/**
 * Analyzes the expanded perimeter collar around the QR boundary to detect potential
 * physical sticker cutlines, overlay borders, or abrupt rectangular edge discontinuities.
 *
 * Compares Sobel gradient density and step transition across the boundary interface
 * in the candidate image relative to the trusted reference image.
 *
 * @param refCollar - Warped grayscale collar of reference image (size x size)
 * @param candCollar - Warped grayscale collar of candidate image (size x size)
 * @param size - Canonical dimension of collar image (e.g. 256)
 * @param marginRatio - Margin ratio used when sampling collar (e.g. 0.12)
 * @returns BoundaryAnomalyResult with score in [0.0, 1.0] and boolean detected flag.
 */
export function computeBoundaryAnomalyScore(
  refCollar: Uint8Array,
  candCollar: Uint8Array,
  size: number,
  marginRatio: number,
): BoundaryAnomalyResult {
  if (refCollar.length !== size * size || candCollar.length !== size * size) {
    throw new Error('Collar buffer dimensions must equal size * size.');
  }

  // The inner QR boundaries in the expanded collar grid:
  // Since collar spans [-marginRatio, 1 + marginRatio], total span = 1 + 2 * marginRatio
  // QR top-left starts at index = Math.round(size * marginRatio / (1 + 2 * marginRatio))
  const innerMargin = Math.round((size * marginRatio) / (1 + 2 * marginRatio));
  const innerStart = innerMargin;
  const innerEnd = size - innerMargin;

  // Compute 3x3 Sobel gradient magnitude on an 8-bit image
  function computeSobelMagnitudes(img: Uint8Array): Float32Array {
    const mag = new Float32Array(size * size);
    for (let y = 1; y < size - 1; y++) {
      const yPrev = (y - 1) * size;
      const yCurr = y * size;
      const yNext = (y + 1) * size;
      for (let x = 1; x < size - 1; x++) {
        // Gx
        const gx =
          -img[yPrev + (x - 1)]! +
          img[yPrev + (x + 1)]! -
          2 * img[yCurr + (x - 1)]! +
          2 * img[yCurr + (x + 1)]! -
          img[yNext + (x - 1)]! +
          img[yNext + (x + 1)]!;

        // Gy
        const gy =
          -img[yPrev + (x - 1)]! -
          2 * img[yPrev + x]! -
          img[yPrev + (x + 1)]! +
          img[yNext + (x - 1)]! +
          2 * img[yNext + x]! +
          img[yNext + (x + 1)]!;

        mag[yCurr + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    return mag;
  }

  const refMag = computeSobelMagnitudes(refCollar);
  const candMag = computeSobelMagnitudes(candCollar);

  // Analyze the perimeter band (the collar area outside the QR quad)
  // Collar region is y < innerStart, y >= innerEnd, x < innerStart, or x >= innerEnd
  let collarPixelCount = 0;
  let refEdgeCount = 0;
  let candEdgeCount = 0;
  const gradientThreshold = 80; // Significant edge gradient threshold

  for (let y = 1; y < size - 1; y++) {
    const isYCollar = y < innerStart || y >= innerEnd;
    for (let x = 1; x < size - 1; x++) {
      const isXCollar = x < innerStart || x >= innerEnd;
      if (isYCollar || isXCollar) {
        collarPixelCount++;
        const idx = y * size + x;
        if (refMag[idx]! >= gradientThreshold) {
          refEdgeCount++;
        }
        if (candMag[idx]! >= gradientThreshold) {
          candEdgeCount++;
        }
      }
    }
  }

  const refEdgeDensity = collarPixelCount > 0 ? refEdgeCount / collarPixelCount : 0;
  const candEdgeDensity = collarPixelCount > 0 ? candEdgeCount / collarPixelCount : 0;
  const densityDisparity = Math.max(0, candEdgeDensity - refEdgeDensity);

  // Analyze step discontinuity directly across the 4 boundary lines
  // Interface lines: y = innerStart, y = innerEnd, x = innerStart, x = innerEnd
  let refInterfaceStep = 0;
  let candInterfaceStep = 0;
  let interfacePixels = 0;

  // Horizontal interfaces (top & bottom edges of QR quad)
  for (let x = innerStart; x < innerEnd; x++) {
    // Top interface: row (innerStart - 1) vs row innerStart
    const topIdxOut = (innerStart - 1) * size + x;
    const topIdxIn = innerStart * size + x;
    refInterfaceStep += Math.abs(refCollar[topIdxIn]! - refCollar[topIdxOut]!);
    candInterfaceStep += Math.abs(candCollar[topIdxIn]! - candCollar[topIdxOut]!);

    // Bottom interface: row (innerEnd - 1) vs row innerEnd
    const botIdxIn = (innerEnd - 1) * size + x;
    const botIdxOut = innerEnd * size + x;
    refInterfaceStep += Math.abs(refCollar[botIdxIn]! - refCollar[botIdxOut]!);
    candInterfaceStep += Math.abs(candCollar[botIdxIn]! - candCollar[botIdxOut]!);

    interfacePixels += 2;
  }

  // Vertical interfaces (left & right edges of QR quad)
  for (let y = innerStart; y < innerEnd; y++) {
    // Left interface: col (innerStart - 1) vs col innerStart
    const leftIdxOut = y * size + (innerStart - 1);
    const leftIdxIn = y * size + innerStart;
    refInterfaceStep += Math.abs(refCollar[leftIdxIn]! - refCollar[leftIdxOut]!);
    candInterfaceStep += Math.abs(candCollar[leftIdxIn]! - candCollar[leftIdxOut]!);

    // Right interface: col (innerEnd - 1) vs col innerEnd
    const rightIdxIn = y * size + (innerEnd - 1);
    const rightIdxOut = y * size + innerEnd;
    refInterfaceStep += Math.abs(refCollar[rightIdxIn]! - refCollar[rightIdxOut]!);
    candInterfaceStep += Math.abs(candCollar[rightIdxIn]! - candCollar[rightIdxOut]!);

    interfacePixels += 2;
  }

  const avgRefStep = interfacePixels > 0 ? refInterfaceStep / (interfacePixels * 255) : 0;
  const avgCandStep =
    interfacePixels > 0 ? candInterfaceStep / (interfacePixels * 255) : 0;
  const stepDisparity = Math.max(0, avgCandStep - avgRefStep);

  // Combine edge density disparity and interface step disparity
  // Initial engineering heuristic weighting:
  // densityDisparity scaled to [0, 1] (0.25 disparity is already very large)
  // stepDisparity scaled to [0, 1] (0.30 step is a sharp black/white cutline)
  const normalizedDensity = Math.min(1.0, densityDisparity * 3.5);
  const normalizedStep = Math.min(1.0, stepDisparity * 3.0);

  const rawScore = 0.6 * normalizedDensity + 0.4 * normalizedStep;
  const score = Math.min(1.0, Math.max(0.0, Math.round(rawScore * 10000) / 10000));
  const detected = score >= BOUNDARY_ANOMALY_THRESHOLD;

  return {
    score,
    detected,
  };
}
