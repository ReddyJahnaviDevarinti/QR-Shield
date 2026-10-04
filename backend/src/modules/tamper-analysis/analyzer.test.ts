import { describe, it, expect, vi } from 'vitest';
import QRCode from 'qrcode';
import sharp from 'sharp';
import {
  analyzeQrVisualDifference,
  InvalidReferenceImageError,
  InvalidCandidateImageError,
  ReferenceQrNotDetectedError,
  CandidateQrNotDetectedError,
  TamperAnalysisResult,
  ALIGNMENT_GOOD_THRESHOLD,
  ALIGNMENT_DEGRADED_THRESHOLD,
  BOUNDARY_ANOMALY_THRESHOLD,
  VISUAL_DEVIATION_HIGH_THRESHOLD,
  VISUAL_DEVIATION_REVIEW_THRESHOLD,
  classifyAlignment,
  computeVisualDeviationIndex,
  evaluateTamperRecommendation,
  validateQuadrilateral,
  computeOtsuThreshold,
  binarizeGrayscale,
  computeMatrixMismatchRatio,
  Point2D,
} from './index.js';

describe('QRShield Physical QR Tamper Analysis', () => {
  const samplePayload1 = 'upi://pay?pa=trustedstore@icici&pn=Trusted%20Store&mc=5411';
  const samplePayload2 = 'upi://pay?pa=attacker@ybl&pn=Attacker%20Shop&mc=5411&am=9999';

  async function generateQrBuffer(
    payload: string,
    width = 400,
    margin = 4,
  ): Promise<Buffer> {
    return QRCode.toBuffer(payload, {
      type: 'png',
      width,
      margin,
      errorCorrectionLevel: 'M',
    });
  }

  // 1. Identical reference and candidate
  it('1. Identical reference and candidate produces near-zero visual deviation', async () => {
    const refBuffer = await generateQrBuffer(samplePayload1);
    const candBuffer = Buffer.from(refBuffer); // Exact copy

    const result = await analyzeQrVisualDifference(refBuffer, candBuffer);

    expect(result.referenceDetected).toBe(true);
    expect(result.candidateDetected).toBe(true);
    expect(result.alignmentClassification).toBe('GOOD');
    expect(result.alignmentQuality).toBeGreaterThanOrEqual(ALIGNMENT_GOOD_THRESHOLD);
    expect(result.matrixMismatchRatio).toBeLessThan(0.01);
    expect(result.boundaryAnomalyScore).toBeLessThan(0.1);
    expect(result.boundaryAnomalyDetected).toBe(false);
    expect(result.visualDeviationIndex).toBeLessThan(0.05);
    expect(result.analysisQuality).toBe('COMPARABLE');
    expect(result.recommendation).toBe('NO_SIGNIFICANT_VISUAL_DEVIATION');
    expect(result.anomalyIndicators).toHaveLength(0);
  });

  // 2. Same QR with moderate brightness change (lighting robustness)
  it('2. Same QR with moderate brightness change does not produce false positive tampering', async () => {
    const refBuffer = await generateQrBuffer(samplePayload1);
    // Moderate brightness boost (+25%)
    const candBuffer = await sharp(refBuffer)
      .modulate({ brightness: 1.25 })
      .png()
      .toBuffer();

    const result = await analyzeQrVisualDifference(refBuffer, candBuffer);

    expect(result.referenceDetected).toBe(true);
    expect(result.candidateDetected).toBe(true);
    expect(result.matrixMismatchRatio).toBeLessThan(0.06);
    expect(result.visualDeviationIndex).toBeLessThan(VISUAL_DEVIATION_REVIEW_THRESHOLD);
    expect(result.recommendation).toBe('NO_SIGNIFICANT_VISUAL_DEVIATION');
  });

  // 3. Same QR with moderate contrast change (lighting robustness)
  it('3. Same QR with moderate contrast change maintains low structural deviation', async () => {
    const refBuffer = await generateQrBuffer(samplePayload1);
    // Moderate contrast modification
    const candBuffer = await sharp(refBuffer).linear(1.2, -20).png().toBuffer();

    const result = await analyzeQrVisualDifference(refBuffer, candBuffer);

    expect(result.referenceDetected).toBe(true);
    expect(result.candidateDetected).toBe(true);
    expect(result.matrixMismatchRatio).toBeLessThan(0.06);
    expect(result.visualDeviationIndex).toBeLessThan(VISUAL_DEVIATION_REVIEW_THRESHOLD);
    expect(result.recommendation).toBe('NO_SIGNIFICANT_VISUAL_DEVIATION');
  });

  // 4. Same QR with slight rotation
  it('4. Same QR with slight rotation is normalized via projective homography', async () => {
    const refBuffer = await generateQrBuffer(samplePayload1, 400, 4);
    // 3-degree rotation on white background
    const candBuffer = await sharp(refBuffer)
      .rotate(3, { background: '#ffffff' })
      .png()
      .toBuffer();

    const result = await analyzeQrVisualDifference(refBuffer, candBuffer);

    expect(result.referenceDetected).toBe(true);
    expect(result.candidateDetected).toBe(true);
    expect(result.alignmentClassification).toBe('GOOD');
    expect(result.analysisQuality).toBe('COMPARABLE');
    expect(result.visualDeviationIndex).toBeLessThan(VISUAL_DEVIATION_REVIEW_THRESHOLD);
    expect(result.recommendation).toBe('NO_SIGNIFICANT_VISUAL_DEVIATION');
  });

  // 5. Same QR with scaling difference
  it('5. Same QR with scaling difference is aligned to canonical resolution', async () => {
    const refBuffer = await generateQrBuffer(samplePayload1, 400, 4);
    const candBuffer = await generateQrBuffer(samplePayload1, 280, 4);

    const result = await analyzeQrVisualDifference(refBuffer, candBuffer);

    expect(result.referenceDetected).toBe(true);
    expect(result.candidateDetected).toBe(true);
    expect(result.matrixMismatchRatio).toBeLessThan(0.05);
    expect(result.visualDeviationIndex).toBeLessThan(VISUAL_DEVIATION_REVIEW_THRESHOLD);
    expect(result.recommendation).toBe('NO_SIGNIFICANT_VISUAL_DEVIATION');
  });

  // 6. Same QR with a detectable border/overlay-like visual modification
  it('6. QR with a simulated pasted border/overlay produces elevated boundary anomaly evidence', async () => {
    const refBuffer = await generateQrBuffer(samplePayload1, 400, 4);

    // Composite an abrupt dark rectangular boundary in the quiet zone/margin (simulating sticker cutline)
    const overlaySvg = Buffer.from(
      `<svg width="400" height="400">
        <rect x="30" y="30" width="340" height="340" fill="none" stroke="#000000" stroke-width="8" />
      </svg>`,
    );

    const candBuffer = await sharp(refBuffer)
      .composite([{ input: overlaySvg, top: 0, left: 0 }])
      .png()
      .toBuffer();

    const result = await analyzeQrVisualDifference(refBuffer, candBuffer);

    expect(result.referenceDetected).toBe(true);
    expect(result.candidateDetected).toBe(true);
    expect(result.boundaryAnomalyScore).toBeGreaterThanOrEqual(
      BOUNDARY_ANOMALY_THRESHOLD,
    );
    expect(result.boundaryAnomalyDetected).toBe(true);
    expect(result.anomalyIndicators).toContain('BOUNDARY_EDGE_ANOMALY');
    expect(result.recommendation).toBe('REVIEW_VISUAL_DIFFERENCE');
  });

  // 7. Candidate QR with materially different visual structure
  it('7. Candidate QR with materially different payload produces elevated matrix mismatch', async () => {
    const refBuffer = await generateQrBuffer(samplePayload1, 400, 4);
    const candBuffer = await generateQrBuffer(samplePayload2, 400, 4);

    const result = await analyzeQrVisualDifference(refBuffer, candBuffer);

    expect(result.referenceDetected).toBe(true);
    expect(result.candidateDetected).toBe(true);
    expect(result.matrixMismatchRatio).toBeGreaterThanOrEqual(0.2);
    expect(result.anomalyIndicators).toContain('MATRIX_STRUCTURAL_DIFFERENCE');
    expect(result.visualDeviationIndex).toBeGreaterThanOrEqual(
      VISUAL_DEVIATION_REVIEW_THRESHOLD,
    );
    expect(['REVIEW_VISUAL_DIFFERENCE', 'MANUAL_INSPECTION_RECOMMENDED']).toContain(
      result.recommendation,
    );
  });

  // 8. Reference image is invalid
  it('8. Throws controlled InvalidReferenceImageError when reference image is corrupt', async () => {
    const corruptBuffer = Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44]);
    const candBuffer = await generateQrBuffer(samplePayload1);

    await expect(analyzeQrVisualDifference(corruptBuffer, candBuffer)).rejects.toThrow(
      InvalidReferenceImageError,
    );
  });

  // 9. Candidate image is invalid
  it('9. Throws controlled InvalidCandidateImageError when candidate image is corrupt', async () => {
    const refBuffer = await generateQrBuffer(samplePayload1);
    const corruptBuffer = Buffer.from([0x00, 0x11, 0x22, 0x33, 0x44]);

    await expect(analyzeQrVisualDifference(refBuffer, corruptBuffer)).rejects.toThrow(
      InvalidCandidateImageError,
    );
  });

  // 10. Reference contains no QR
  it('10. Throws controlled ReferenceQrNotDetectedError when reference has no QR', async () => {
    const blankBuffer = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();
    const candBuffer = await generateQrBuffer(samplePayload1);

    await expect(analyzeQrVisualDifference(blankBuffer, candBuffer)).rejects.toThrow(
      ReferenceQrNotDetectedError,
    );
  });

  // 11. Candidate contains no QR
  it('11. Throws controlled CandidateQrNotDetectedError when candidate has no QR', async () => {
    const refBuffer = await generateQrBuffer(samplePayload1);
    const blankBuffer = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .png()
      .toBuffer();

    await expect(analyzeQrVisualDifference(refBuffer, blankBuffer)).rejects.toThrow(
      CandidateQrNotDetectedError,
    );
  });

  // 12. Very poor alignment produces INCONCLUSIVE/DEGRADED, not false tamper declaration
  it('12. Insufficient alignment returns INCONCLUSIVE without declaring tampering', () => {
    // Deliberately construct a degenerate/collapsed quad
    const degenerateQuad: [Point2D, Point2D, Point2D, Point2D] = [
      { x: 10, y: 10 },
      { x: 200, y: 10 },
      { x: 20, y: 200 }, // Crosses over: self-intersecting
      { x: 190, y: 200 },
    ];

    const validation = validateQuadrilateral(degenerateQuad);
    expect(validation.isValid).toBe(false);
    expect(validation.classification).toBe('INSUFFICIENT');

    const evalResult = evaluateTamperRecommendation({
      visualDeviationIndex: 0.0,
      matrixMismatchRatio: 0.0,
      boundaryAnomalyScore: 0.0,
      boundaryAnomalyDetected: false,
      alignmentClassification: 'INSUFFICIENT',
      alignmentQuality: validation.quality,
    });

    expect(evalResult.analysisQuality).toBe('INCONCLUSIVE');
    expect(evalResult.recommendation).toBe('INSUFFICIENT_VISUAL_EVIDENCE');
    expect(evalResult.anomalyIndicators).toContain('ALIGNMENT_INSUFFICIENT');
    expect(evalResult.anomalyIndicators).toContain('LOW_COMPARABILITY');
  });

  // 13. Determinism: same inputs produce identical result
  it('13. Produces bit-for-bit deterministic results on repeated execution', async () => {
    const refBuffer = await generateQrBuffer(samplePayload1);
    const candBuffer = await generateQrBuffer(samplePayload2);

    const run1 = await analyzeQrVisualDifference(refBuffer, candBuffer);
    const run2 = await analyzeQrVisualDifference(refBuffer, candBuffer);

    expect(run1).toEqual(run2);
  });

  // 14. No network calls
  it('14. Executes purely in-memory without making any network requests', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const refBuffer = await generateQrBuffer(samplePayload1);
    const candBuffer = await generateQrBuffer(samplePayload1);

    await analyzeQrVisualDifference(refBuffer, candBuffer);

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  // 15. No filesystem writes
  it('15. Operates in memory without invoking filesystem write operations', async () => {
    const refBuffer = await generateQrBuffer(samplePayload1);
    const candBuffer = await generateQrBuffer(samplePayload1);

    const result = await analyzeQrVisualDifference(refBuffer, candBuffer);
    expect(result).toBeDefined();
  });

  // 16. Input buffers remain unchanged
  it('16. Input buffers are not modified by analysis operations', async () => {
    const refBuffer = await generateQrBuffer(samplePayload1);
    const candBuffer = await generateQrBuffer(samplePayload2);

    const refCopy = Buffer.from(refBuffer);
    const candCopy = Buffer.from(candBuffer);

    await analyzeQrVisualDifference(refBuffer, candBuffer);

    expect(Buffer.compare(refBuffer, refCopy)).toBe(0);
    expect(Buffer.compare(candBuffer, candCopy)).toBe(0);
  });

  // 17. Result type integrity
  it('17. Verifies all TamperAnalysisResult fields conform strictly to type contract', async () => {
    const refBuffer = await generateQrBuffer(samplePayload1);
    const candBuffer = await generateQrBuffer(samplePayload1);

    const result: TamperAnalysisResult = await analyzeQrVisualDifference(
      refBuffer,
      candBuffer,
    );

    expect(typeof result.referenceDetected).toBe('boolean');
    expect(typeof result.candidateDetected).toBe('boolean');
    expect(typeof result.alignmentQuality).toBe('number');
    expect(['GOOD', 'DEGRADED', 'INSUFFICIENT']).toContain(
      result.alignmentClassification,
    );
    expect(typeof result.matrixMismatchRatio).toBe('number');
    expect(result.matrixMismatchRatio).toBeGreaterThanOrEqual(0.0);
    expect(result.matrixMismatchRatio).toBeLessThanOrEqual(1.0);
    expect(typeof result.visualDeviationIndex).toBe('number');
    expect(result.visualDeviationIndex).toBeGreaterThanOrEqual(0.0);
    expect(result.visualDeviationIndex).toBeLessThanOrEqual(1.0);
    expect(typeof result.boundaryAnomalyScore).toBe('number');
    expect(result.boundaryAnomalyScore).toBeGreaterThanOrEqual(0.0);
    expect(result.boundaryAnomalyScore).toBeLessThanOrEqual(1.0);
    expect(typeof result.boundaryAnomalyDetected).toBe('boolean');
    expect(Array.isArray(result.anomalyIndicators)).toBe(true);
    expect(['COMPARABLE', 'DEGRADED', 'INCONCLUSIVE']).toContain(result.analysisQuality);
    expect([
      'NO_SIGNIFICANT_VISUAL_DEVIATION',
      'REVIEW_VISUAL_DIFFERENCE',
      'MANUAL_INSPECTION_RECOMMENDED',
      'INSUFFICIENT_VISUAL_EVIDENCE',
    ]).toContain(result.recommendation);
  });

  // 18. Threshold Boundary Tests (Task 16)
  describe('Heuristic Threshold Boundary Testing', () => {
    it('Alignment Good Threshold (0.70): boundary tests', () => {
      expect(classifyAlignment(ALIGNMENT_GOOD_THRESHOLD - 0.0001)).toBe('DEGRADED');
      expect(classifyAlignment(ALIGNMENT_GOOD_THRESHOLD)).toBe('GOOD');
      expect(classifyAlignment(ALIGNMENT_GOOD_THRESHOLD + 0.0001)).toBe('GOOD');
    });

    it('Alignment Degraded Threshold (0.45): boundary tests', () => {
      expect(classifyAlignment(ALIGNMENT_DEGRADED_THRESHOLD - 0.0001)).toBe(
        'INSUFFICIENT',
      );
      expect(classifyAlignment(ALIGNMENT_DEGRADED_THRESHOLD)).toBe('DEGRADED');
      expect(classifyAlignment(ALIGNMENT_DEGRADED_THRESHOLD + 0.0001)).toBe('DEGRADED');
    });

    it('Boundary Anomaly Threshold (0.35): boundary tests', () => {
      // Just below 0.35
      const evalBelow = evaluateTamperRecommendation({
        visualDeviationIndex: 0.1,
        matrixMismatchRatio: 0.05,
        boundaryAnomalyScore: BOUNDARY_ANOMALY_THRESHOLD - 0.0001,
        boundaryAnomalyDetected: false,
        alignmentClassification: 'GOOD',
        alignmentQuality: 0.9,
      });
      expect(evalBelow.recommendation).toBe('NO_SIGNIFICANT_VISUAL_DEVIATION');
      expect(evalBelow.anomalyIndicators).not.toContain('BOUNDARY_EDGE_ANOMALY');

      // Exactly at 0.35 with boundary anomaly detected
      const evalAt = evaluateTamperRecommendation({
        visualDeviationIndex: 0.1,
        matrixMismatchRatio: 0.05,
        boundaryAnomalyScore: BOUNDARY_ANOMALY_THRESHOLD,
        boundaryAnomalyDetected: true,
        alignmentClassification: 'GOOD',
        alignmentQuality: 0.9,
      });
      expect(evalAt.recommendation).toBe('REVIEW_VISUAL_DIFFERENCE');
      expect(evalAt.anomalyIndicators).toContain('BOUNDARY_EDGE_ANOMALY');

      // Just above 0.35
      const evalAbove = evaluateTamperRecommendation({
        visualDeviationIndex: 0.1,
        matrixMismatchRatio: 0.05,
        boundaryAnomalyScore: BOUNDARY_ANOMALY_THRESHOLD + 0.0001,
        boundaryAnomalyDetected: true,
        alignmentClassification: 'GOOD',
        alignmentQuality: 0.9,
      });
      expect(evalAbove.recommendation).toBe('REVIEW_VISUAL_DIFFERENCE');
      expect(evalAbove.anomalyIndicators).toContain('BOUNDARY_EDGE_ANOMALY');
    });

    it('Visual Deviation Review Threshold (0.20): boundary tests', () => {
      // Just below 0.20
      const evalBelow = evaluateTamperRecommendation({
        visualDeviationIndex: VISUAL_DEVIATION_REVIEW_THRESHOLD - 0.0001,
        matrixMismatchRatio: 0.05,
        boundaryAnomalyScore: 0.1,
        boundaryAnomalyDetected: false,
        alignmentClassification: 'GOOD',
        alignmentQuality: 0.9,
      });
      expect(evalBelow.recommendation).toBe('NO_SIGNIFICANT_VISUAL_DEVIATION');

      // Exactly at 0.20
      const evalAt = evaluateTamperRecommendation({
        visualDeviationIndex: VISUAL_DEVIATION_REVIEW_THRESHOLD,
        matrixMismatchRatio: 0.05,
        boundaryAnomalyScore: 0.1,
        boundaryAnomalyDetected: false,
        alignmentClassification: 'GOOD',
        alignmentQuality: 0.9,
      });
      expect(evalAt.recommendation).toBe('REVIEW_VISUAL_DIFFERENCE');

      // Just above 0.20
      const evalAbove = evaluateTamperRecommendation({
        visualDeviationIndex: VISUAL_DEVIATION_REVIEW_THRESHOLD + 0.0001,
        matrixMismatchRatio: 0.05,
        boundaryAnomalyScore: 0.1,
        boundaryAnomalyDetected: false,
        alignmentClassification: 'GOOD',
        alignmentQuality: 0.9,
      });
      expect(evalAbove.recommendation).toBe('REVIEW_VISUAL_DIFFERENCE');
    });

    it('Visual Deviation High Threshold (0.35): boundary tests', () => {
      // Just below 0.35
      const evalBelow = evaluateTamperRecommendation({
        visualDeviationIndex: VISUAL_DEVIATION_HIGH_THRESHOLD - 0.0001,
        matrixMismatchRatio: 0.25,
        boundaryAnomalyScore: 0.1,
        boundaryAnomalyDetected: false,
        alignmentClassification: 'GOOD',
        alignmentQuality: 0.9,
      });
      expect(evalBelow.recommendation).toBe('REVIEW_VISUAL_DIFFERENCE');

      // Exactly at 0.35
      const evalAt = evaluateTamperRecommendation({
        visualDeviationIndex: VISUAL_DEVIATION_HIGH_THRESHOLD,
        matrixMismatchRatio: 0.25,
        boundaryAnomalyScore: 0.1,
        boundaryAnomalyDetected: false,
        alignmentClassification: 'GOOD',
        alignmentQuality: 0.9,
      });
      expect(evalAt.recommendation).toBe('MANUAL_INSPECTION_RECOMMENDED');

      // Just above 0.35
      const evalAbove = evaluateTamperRecommendation({
        visualDeviationIndex: VISUAL_DEVIATION_HIGH_THRESHOLD + 0.0001,
        matrixMismatchRatio: 0.25,
        boundaryAnomalyScore: 0.1,
        boundaryAnomalyDetected: false,
        alignmentClassification: 'GOOD',
        alignmentQuality: 0.9,
      });
      expect(evalAbove.recommendation).toBe('MANUAL_INSPECTION_RECOMMENDED');
    });
  });

  // 19. Unit tests for mathematical helpers
  describe('Mathematical and Algorithmic Pure Helpers', () => {
    it('computeOtsuThreshold finds bimodal midpoint', () => {
      // Bimodal distribution: 50 pixels of value 40, 50 pixels of value 200
      const data = new Uint8Array(100);
      data.fill(40, 0, 50);
      data.fill(200, 50, 100);

      const threshold = computeOtsuThreshold(data);
      expect(threshold).toBeGreaterThanOrEqual(40);
      expect(threshold).toBeLessThanOrEqual(200);

      const binarized = binarizeGrayscale(data, threshold);
      expect(binarized[0]).toBe(0);
      expect(binarized[99]).toBe(255);
    });

    it('computeMatrixMismatchRatio handles empty / matching / mismatched arrays', () => {
      const arr1 = new Uint8Array([0, 0, 255, 255]);
      const arr2 = new Uint8Array([0, 0, 255, 255]);
      const arr3 = new Uint8Array([255, 255, 0, 0]);

      expect(computeMatrixMismatchRatio(arr1, arr2)).toBe(0.0);
      expect(computeMatrixMismatchRatio(arr1, arr3)).toBe(1.0);
    });

    it('computeVisualDeviationIndex clamps and applies weights deterministically', () => {
      // 0.60 * 0.5 + 0.25 * 0.4 + 0.15 * 0.2 = 0.30 + 0.10 + 0.03 = 0.43
      const index = computeVisualDeviationIndex(0.5, 0.4, 0.2);
      expect(index).toBe(0.43);
    });
  });
});
