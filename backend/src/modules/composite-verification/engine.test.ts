import { describe, it, expect, vi } from 'vitest';
import { composeVerificationResult, VISUAL_DEVIATION_HIGH_THRESHOLD } from './index.js';
import { VerificationResult } from '../verification-engine/types.js';
import { ImageQualityResult } from '../image-quality/types.js';
import { TamperAnalysisResult } from '../tamper-analysis/types.js';
import { verifyDestination } from '../verification-engine/engine.js';
import { ParsedPaymentPayload } from '../payment-parser/types.js';

describe('QRShield Composite Verification Engine', () => {
  // Test fixture helpers
  function createMockDestinationResult(
    overrides?: Partial<VerificationResult>,
  ): VerificationResult {
    return {
      status: 'VERIFIED',
      destinationMatch: true,
      scannedDestination: 'store@icici',
      matchedMerchantId: 'merch_01',
      matchedDestination: 'store@icici',
      reasonCode: 'DESTINATION_MATCH',
      reason: 'Scanned destination matched trusted registration.',
      evidence: {
        normalizedScannedDestination: 'store@icici',
        activeTrustedDestinationsChecked: 1,
        exactMatch: true,
      },
      ...overrides,
    };
  }

  function createMockImageQualityResult(
    overrides?: Partial<ImageQualityResult>,
  ): ImageQualityResult {
    return {
      width: 400,
      height: 400,
      pixelCount: 160000,
      meanBrightness: 0.65,
      contrastScore: 0.7,
      sharpnessScore: 0.55,
      dynamicRange: 0.9,
      brightnessClassification: 'ACCEPTABLE',
      contrastClassification: 'ACCEPTABLE_CONTRAST',
      sharpnessClassification: 'ACCEPTABLE_SHARPNESS',
      overallQuality: 'ACCEPTABLE',
      qualityFlags: [],
      ...overrides,
    };
  }

  function createMockTamperResult(
    overrides?: Partial<TamperAnalysisResult>,
  ): TamperAnalysisResult {
    return {
      referenceDetected: true,
      candidateDetected: true,
      alignmentQuality: 0.95,
      alignmentClassification: 'GOOD',
      matrixMismatchRatio: 0.01,
      visualDeviationIndex: 0.02,
      boundaryAnomalyScore: 0.05,
      boundaryAnomalyDetected: false,
      anomalyIndicators: [],
      analysisQuality: 'COMPARABLE',
      recommendation: 'NO_SIGNIFICANT_VISUAL_DEVIATION',
      ...overrides,
    };
  }

  // Task 13 — Core Requirements
  it('1. Matching destination + good image + no tamper -> VERIFIED', () => {
    const dest = createMockDestinationResult();
    const quality = createMockImageQualityResult();
    const tamper = createMockTamperResult();

    const result = composeVerificationResult(dest, quality, tamper);

    expect(result.status).toBe('VERIFIED');
    expect(result.destinationStatus).toBe('VERIFIED');
    expect(result.destinationMatch).toBe(true);
    expect(result.scannedDestination).toBe('store@icici');
    expect(result.matchedMerchantId).toBe('merch_01');
    expect(result.matchedDestination).toBe('store@icici');
    expect(result.overallImageQuality).toBe('ACCEPTABLE');
    expect(result.tamperAnalysisAvailable).toBe(true);
    expect(result.riskFactors).toHaveLength(0);
    expect(result.recommendation).toBe('REVIEW_NOT_REQUIRED');
  });

  it('2. Matching destination + degraded image -> VERIFIED with IMAGE_QUALITY_DEGRADED flag', () => {
    const dest = createMockDestinationResult();
    const quality = createMockImageQualityResult({ overallQuality: 'DEGRADED' });
    const tamper = createMockTamperResult();

    const result = composeVerificationResult(dest, quality, tamper);

    expect(result.status).toBe('VERIFIED');
    expect(result.riskFactors).toContain('IMAGE_QUALITY_DEGRADED');
    expect(result.recommendation).toBe('REVIEW_NOT_REQUIRED');
  });

  it('3. Matching destination + insufficient image quality -> INSUFFICIENT_EVIDENCE', () => {
    const dest = createMockDestinationResult();
    const quality = createMockImageQualityResult({ overallQuality: 'INSUFFICIENT' });
    const tamper = createMockTamperResult();

    const result = composeVerificationResult(dest, quality, tamper);

    expect(result.status).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.riskFactors).toContain('IMAGE_QUALITY_INSUFFICIENT');
    expect(result.recommendation).toBe('CAPTURE_CLEARER_IMAGE');
  });

  it('4. Matching destination + strong visual deviation -> SUSPICIOUS', () => {
    const dest = createMockDestinationResult();
    const quality = createMockImageQualityResult();
    const tamper = createMockTamperResult({
      visualDeviationIndex: 0.42, // >= 0.35 threshold
      boundaryAnomalyDetected: false,
    });

    const result = composeVerificationResult(dest, quality, tamper);

    expect(result.status).toBe('SUSPICIOUS');
    expect(result.riskFactors).toContain('VISUAL_STRUCTURAL_DIFFERENCE');
    expect(result.recommendation).toBe('MANUAL_INSPECTION_RECOMMENDED');
  });

  it('5. Matching destination + boundary anomaly -> SUSPICIOUS', () => {
    const dest = createMockDestinationResult();
    const quality = createMockImageQualityResult();
    const tamper = createMockTamperResult({
      visualDeviationIndex: 0.15, // Below high threshold
      boundaryAnomalyDetected: true,
      boundaryAnomalyScore: 0.45,
    });

    const result = composeVerificationResult(dest, quality, tamper);

    expect(result.status).toBe('SUSPICIOUS');
    expect(result.riskFactors).toContain('BOUNDARY_EDGE_ANOMALY');
    expect(result.recommendation).toBe('MANUAL_INSPECTION_RECOMMENDED');
  });

  it('6. Matching destination + tamper analysis inconclusive -> VERIFIED when image quality is sufficient', () => {
    const dest = createMockDestinationResult();
    const quality = createMockImageQualityResult({ overallQuality: 'ACCEPTABLE' });
    const tamper = createMockTamperResult({
      analysisQuality: 'INCONCLUSIVE',
      alignmentClassification: 'INSUFFICIENT',
      alignmentQuality: 0.2,
      visualDeviationIndex: 0.0,
      boundaryAnomalyDetected: false,
      recommendation: 'INSUFFICIENT_VISUAL_EVIDENCE',
    });

    const result = composeVerificationResult(dest, quality, tamper);

    expect(result.status).toBe('VERIFIED');
    expect(result.riskFactors).toContain('TAMPER_ANALYSIS_INCONCLUSIVE');
    expect(result.recommendation).toBe('REVIEW_NOT_REQUIRED');
  });

  it('7. Matching destination + no tamper analysis available -> VERIFIED when image quality is sufficient', () => {
    const dest = createMockDestinationResult();
    const quality = createMockImageQualityResult({ overallQuality: 'ACCEPTABLE' });

    // No reference QR was available, so tamper result is null
    const result = composeVerificationResult(dest, quality, null);

    expect(result.status).toBe('VERIFIED');
    expect(result.tamperAnalysisAvailable).toBe(false);
    expect(result.visualDeviationIndex).toBeNull();
    expect(result.boundaryAnomalyDetected).toBeNull();
    expect(result.evidence.tamper).toBeNull();
    expect(result.riskFactors).toHaveLength(0);
    expect(result.recommendation).toBe('REVIEW_NOT_REQUIRED');
  });

  it('8. No trusted registration -> UNVERIFIED', () => {
    const dest = createMockDestinationResult({
      status: 'UNVERIFIED',
      destinationMatch: false,
      matchedMerchantId: null,
      matchedDestination: null,
      reasonCode: 'NO_TRUSTED_REGISTRATION',
      evidence: {
        normalizedScannedDestination: 'unregistered@upi',
        activeTrustedDestinationsChecked: 0,
        exactMatch: false,
      },
    });
    const quality = createMockImageQualityResult();

    const result = composeVerificationResult(dest, quality, null);

    expect(result.status).toBe('UNVERIFIED');
    expect(result.riskFactors).toContain('NO_TRUSTED_REGISTRATION');
    expect(result.recommendation).toBe('VERIFY_MERCHANT_BEFORE_PAYMENT');
  });

  it('9. No trusted registration + suspicious visual evidence -> UNVERIFIED', () => {
    const dest = createMockDestinationResult({
      status: 'UNVERIFIED',
      destinationMatch: false,
      matchedMerchantId: null,
      matchedDestination: null,
      reasonCode: 'NO_TRUSTED_REGISTRATION',
      evidence: {
        normalizedScannedDestination: 'unregistered@upi',
        activeTrustedDestinationsChecked: 0,
        exactMatch: false,
      },
    });
    const quality = createMockImageQualityResult();
    const tamper = createMockTamperResult({
      visualDeviationIndex: 0.65,
      boundaryAnomalyDetected: true,
    });

    const result = composeVerificationResult(dest, quality, tamper);

    // Visual evidence must NOT turn an unregistered QR into SUSPICIOUS
    expect(result.status).toBe('UNVERIFIED');
    expect(result.riskFactors).toContain('NO_TRUSTED_REGISTRATION');
    expect(result.recommendation).toBe('VERIFY_MERCHANT_BEFORE_PAYMENT');
  });

  it('10. Destination mismatch -> DESTINATION_MISMATCH', () => {
    const dest = createMockDestinationResult({
      status: 'DESTINATION_MISMATCH',
      destinationMatch: false,
      scannedDestination: 'attacker@ybl',
      matchedMerchantId: null,
      matchedDestination: null,
      reasonCode: 'DESTINATION_CONFLICT',
      evidence: {
        normalizedScannedDestination: 'attacker@ybl',
        activeTrustedDestinationsChecked: 1,
        exactMatch: false,
      },
    });
    const quality = createMockImageQualityResult();

    const result = composeVerificationResult(dest, quality, null);

    expect(result.status).toBe('DESTINATION_MISMATCH');
    expect(result.riskFactors).toContain('DESTINATION_CONFLICT');
    expect(result.recommendation).toBe('DO_NOT_PROCEED_WITH_PAYMENT');
  });

  it('11. Destination mismatch + suspicious visual evidence -> DESTINATION_MISMATCH', () => {
    const dest = createMockDestinationResult({
      status: 'DESTINATION_MISMATCH',
      destinationMatch: false,
      scannedDestination: 'attacker@ybl',
      matchedMerchantId: null,
      matchedDestination: null,
      reasonCode: 'DESTINATION_CONFLICT',
      evidence: {
        normalizedScannedDestination: 'attacker@ybl',
        activeTrustedDestinationsChecked: 1,
        exactMatch: false,
      },
    });
    const quality = createMockImageQualityResult();
    const tamper = createMockTamperResult({
      visualDeviationIndex: 0.55,
      boundaryAnomalyDetected: true,
    });

    const result = composeVerificationResult(dest, quality, tamper);

    // Destination conflict strictly takes precedence over visual anomaly evidence
    expect(result.status).toBe('DESTINATION_MISMATCH');
    expect(result.riskFactors).toContain('DESTINATION_CONFLICT');
    expect(result.recommendation).toBe('DO_NOT_PROCEED_WITH_PAYMENT');
  });

  it('12. No usable destination -> INSUFFICIENT_EVIDENCE', () => {
    const dest = createMockDestinationResult({
      status: 'INSUFFICIENT_EVIDENCE',
      destinationMatch: false,
      scannedDestination: null,
      matchedMerchantId: null,
      matchedDestination: null,
      reasonCode: 'INSUFFICIENT_DESTINATION_DATA',
      evidence: {
        normalizedScannedDestination: null,
        activeTrustedDestinationsChecked: 0,
        exactMatch: false,
      },
    });
    const quality = createMockImageQualityResult();

    const result = composeVerificationResult(dest, quality, null);

    expect(result.status).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.riskFactors).toContain('INSUFFICIENT_DESTINATION_DATA');
    expect(result.recommendation).toBe('CAPTURE_CLEARER_IMAGE');
  });

  it('13. Payee name does not alter destination status or composite status', () => {
    const basePayload: ParsedPaymentPayload = {
      format: 'UPI_URI',
      rawPayload: 'upi://pay?pa=store@icici&pn=Original%20Name',
      paymentAddress: 'store@icici',
      payeeName: 'Original Name',
      amount: null,
      currency: 'INR',
      merchantCategoryCode: null,
      mode: null,
      url: null,
      refUrl: null,
    };

    const trusted = [
      {
        merchantId: 'm1',
        destinationType: 'VPA' as const,
        destinationValue: 'store@icici',
        isActive: true,
      },
    ];

    const destResult1 = verifyDestination(basePayload, trusted);
    const destResult2 = verifyDestination(
      { ...basePayload, payeeName: 'Completely Different Name' },
      trusted,
    );

    const quality = createMockImageQualityResult();

    const comp1 = composeVerificationResult(destResult1, quality, null);
    const comp2 = composeVerificationResult(destResult2, quality, null);

    expect(comp1.status).toBe('VERIFIED');
    expect(comp2.status).toBe('VERIFIED');
    expect(comp1.status).toBe(comp2.status);
  });

  it('14. Amount does not alter destination status or composite status', () => {
    const basePayload: ParsedPaymentPayload = {
      format: 'UPI_URI',
      rawPayload: 'upi://pay?pa=store@icici&am=10.00',
      paymentAddress: 'store@icici',
      payeeName: null,
      amount: '10.00',
      currency: 'INR',
      merchantCategoryCode: null,
      mode: null,
      url: null,
      refUrl: null,
    };

    const trusted = [
      {
        merchantId: 'm1',
        destinationType: 'VPA' as const,
        destinationValue: 'store@icici',
        isActive: true,
      },
    ];

    const destResult1 = verifyDestination(basePayload, trusted);
    const destResult2 = verifyDestination(
      { ...basePayload, amount: '99999.00' },
      trusted,
    );

    const quality = createMockImageQualityResult();

    const comp1 = composeVerificationResult(destResult1, quality, null);
    const comp2 = composeVerificationResult(destResult2, quality, null);

    expect(comp1.status).toBe('VERIFIED');
    expect(comp2.status).toBe('VERIFIED');
    expect(comp1.status).toBe(comp2.status);
  });

  it('15. Merchant Category Code (MCC) does not alter destination status or composite status', () => {
    const basePayload: ParsedPaymentPayload = {
      format: 'UPI_URI',
      rawPayload: 'upi://pay?pa=store@icici&mc=5411',
      paymentAddress: 'store@icici',
      payeeName: null,
      amount: null,
      currency: 'INR',
      merchantCategoryCode: '5411',
      mode: null,
      url: null,
      refUrl: null,
    };

    const trusted = [
      {
        merchantId: 'm1',
        destinationType: 'VPA' as const,
        destinationValue: 'store@icici',
        isActive: true,
      },
    ];

    const destResult1 = verifyDestination(basePayload, trusted);
    const destResult2 = verifyDestination(
      { ...basePayload, merchantCategoryCode: '9999' },
      trusted,
    );

    const quality = createMockImageQualityResult();

    const comp1 = composeVerificationResult(destResult1, quality, null);
    const comp2 = composeVerificationResult(destResult2, quality, null);

    expect(comp1.status).toBe('VERIFIED');
    expect(comp2.status).toBe('VERIFIED');
    expect(comp1.status).toBe(comp2.status);
  });

  it('16. Risk factors are deterministic and deduplicated', () => {
    const dest = createMockDestinationResult({
      status: 'DESTINATION_MISMATCH',
      reasonCode: 'DESTINATION_CONFLICT',
    });
    const quality = createMockImageQualityResult({ overallQuality: 'DEGRADED' });
    const tamper = createMockTamperResult({
      boundaryAnomalyDetected: true,
      visualDeviationIndex: 0.5,
    });

    const result = composeVerificationResult(dest, quality, tamper);

    // Factors should appear once each, in expected deterministic order
    expect(result.riskFactors).toEqual([
      'DESTINATION_CONFLICT',
      'BOUNDARY_EDGE_ANOMALY',
      'VISUAL_STRUCTURAL_DIFFERENCE',
      'IMAGE_QUALITY_DEGRADED',
    ]);
  });

  it('17. Evidence object contains expected nested fields', () => {
    const dest = createMockDestinationResult();
    const quality = createMockImageQualityResult();
    const tamper = createMockTamperResult();

    const result = composeVerificationResult(dest, quality, tamper);

    expect(result.evidence.destination).toBeDefined();
    expect(result.evidence.destination.scannedDestination).toBe('store@icici');
    expect(result.evidence.destination.destinationMatch).toBe(true);
    expect(result.evidence.destination.activeTrustedDestinationsChecked).toBe(1);
    expect(result.evidence.destination.exactMatch).toBe(true);

    expect(result.evidence.imageQuality).toBeDefined();
    expect(result.evidence.imageQuality.overallQuality).toBe('ACCEPTABLE');
    expect(result.evidence.imageQuality.brightnessClassification).toBe('ACCEPTABLE');
    expect(result.evidence.imageQuality.contrastClassification).toBe(
      'ACCEPTABLE_CONTRAST',
    );
    expect(result.evidence.imageQuality.sharpnessClassification).toBe(
      'ACCEPTABLE_SHARPNESS',
    );

    expect(result.evidence.tamper).toBeDefined();
    expect(result.evidence.tamper?.available).toBe(true);
    expect(result.evidence.tamper?.analysisQuality).toBe('COMPARABLE');
    expect(typeof result.evidence.tamper?.visualDeviationIndex).toBe('number');
    expect(typeof result.evidence.tamper?.boundaryAnomalyScore).toBe('number');
    expect(typeof result.evidence.tamper?.boundaryAnomalyDetected).toBe('boolean');
    expect(Array.isArray(result.evidence.tamper?.anomalyIndicators)).toBe(true);
  });

  it('18. Recommendation matches final status across all 5 canonical statuses', () => {
    const statuses: Array<{
      dest: Partial<VerificationResult>;
      quality: Partial<ImageQualityResult>;
      tamper?: Partial<TamperAnalysisResult> | null;
      expectedStatus: string;
      expectedRec: string;
    }> = [
      {
        dest: { status: 'VERIFIED' },
        quality: { overallQuality: 'ACCEPTABLE' },
        tamper: null,
        expectedStatus: 'VERIFIED',
        expectedRec: 'REVIEW_NOT_REQUIRED',
      },
      {
        dest: { status: 'DESTINATION_MISMATCH' },
        quality: { overallQuality: 'ACCEPTABLE' },
        tamper: null,
        expectedStatus: 'DESTINATION_MISMATCH',
        expectedRec: 'DO_NOT_PROCEED_WITH_PAYMENT',
      },
      {
        dest: { status: 'UNVERIFIED' },
        quality: { overallQuality: 'ACCEPTABLE' },
        tamper: null,
        expectedStatus: 'UNVERIFIED',
        expectedRec: 'VERIFY_MERCHANT_BEFORE_PAYMENT',
      },
      {
        dest: { status: 'VERIFIED' },
        quality: { overallQuality: 'ACCEPTABLE' },
        tamper: { boundaryAnomalyDetected: true },
        expectedStatus: 'SUSPICIOUS',
        expectedRec: 'MANUAL_INSPECTION_RECOMMENDED',
      },
      {
        dest: { status: 'INSUFFICIENT_EVIDENCE' },
        quality: { overallQuality: 'ACCEPTABLE' },
        tamper: null,
        expectedStatus: 'INSUFFICIENT_EVIDENCE',
        expectedRec: 'CAPTURE_CLEARER_IMAGE',
      },
    ];

    for (const testCase of statuses) {
      const result = composeVerificationResult(
        createMockDestinationResult(testCase.dest),
        createMockImageQualityResult(testCase.quality),
        testCase.tamper === null ? null : createMockTamperResult(testCase.tamper ?? {}),
      );
      expect(result.status).toBe(testCase.expectedStatus);
      expect(result.recommendation).toBe(testCase.expectedRec);
    }
  });

  it('19. Repeated identical inputs produce deeply equal results', () => {
    const dest = createMockDestinationResult();
    const quality = createMockImageQualityResult();
    const tamper = createMockTamperResult();

    const run1 = composeVerificationResult(dest, quality, tamper);
    const run2 = composeVerificationResult(dest, quality, tamper);

    expect(run1).toEqual(run2);
  });

  it('20. Executes without network calls', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const dest = createMockDestinationResult();
    const quality = createMockImageQualityResult();
    const tamper = createMockTamperResult();

    composeVerificationResult(dest, quality, tamper);

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('21. Operates purely in-memory without filesystem writes', () => {
    const dest = createMockDestinationResult();
    const quality = createMockImageQualityResult();
    const tamper = createMockTamperResult();

    const result = composeVerificationResult(dest, quality, tamper);
    expect(result).toBeDefined();
  });

  it('22. Existing module results are not mutated', () => {
    const dest = createMockDestinationResult();
    const quality = createMockImageQualityResult();
    const tamper = createMockTamperResult();

    const destSnapshot = JSON.stringify(dest);
    const qualitySnapshot = JSON.stringify(quality);
    const tamperSnapshot = JSON.stringify(tamper);

    composeVerificationResult(dest, quality, tamper);

    expect(JSON.stringify(dest)).toBe(destSnapshot);
    expect(JSON.stringify(quality)).toBe(qualitySnapshot);
    expect(JSON.stringify(tamper)).toBe(tamperSnapshot);
  });

  // Task 14 — Status Precedence Test Matrix
  describe('Status Precedence Test Matrix (Rules C01 - C06)', () => {
    it('Matrix A: No destination + good image + no tamper -> INSUFFICIENT_EVIDENCE', () => {
      const dest = createMockDestinationResult({ status: 'INSUFFICIENT_EVIDENCE' });
      const quality = createMockImageQualityResult({ overallQuality: 'ACCEPTABLE' });
      const tamper = createMockTamperResult();

      const result = composeVerificationResult(dest, quality, tamper);
      expect(result.status).toBe('INSUFFICIENT_EVIDENCE');
    });

    it('Matrix B: No registry + bad image + tamper evidence -> UNVERIFIED', () => {
      const dest = createMockDestinationResult({ status: 'UNVERIFIED' });
      const quality = createMockImageQualityResult({ overallQuality: 'INSUFFICIENT' });
      const tamper = createMockTamperResult({ boundaryAnomalyDetected: true });

      const result = composeVerificationResult(dest, quality, tamper);
      expect(result.status).toBe('UNVERIFIED');
    });

    it('Matrix C: Destination mismatch + bad image + tamper evidence -> DESTINATION_MISMATCH', () => {
      const dest = createMockDestinationResult({ status: 'DESTINATION_MISMATCH' });
      const quality = createMockImageQualityResult({ overallQuality: 'INSUFFICIENT' });
      const tamper = createMockTamperResult({ boundaryAnomalyDetected: true });

      const result = composeVerificationResult(dest, quality, tamper);
      expect(result.status).toBe('DESTINATION_MISMATCH');
    });

    it('Matrix D: Destination match + insufficient image quality + no tamper -> INSUFFICIENT_EVIDENCE', () => {
      const dest = createMockDestinationResult({ status: 'VERIFIED' });
      const quality = createMockImageQualityResult({ overallQuality: 'INSUFFICIENT' });

      const result = composeVerificationResult(dest, quality, null);
      expect(result.status).toBe('INSUFFICIENT_EVIDENCE');
    });

    it('Matrix E: Destination match + good image + strong visual deviation -> SUSPICIOUS', () => {
      const dest = createMockDestinationResult({ status: 'VERIFIED' });
      const quality = createMockImageQualityResult({ overallQuality: 'ACCEPTABLE' });
      const tamper = createMockTamperResult({
        visualDeviationIndex: VISUAL_DEVIATION_HIGH_THRESHOLD + 0.05,
      });

      const result = composeVerificationResult(dest, quality, tamper);
      expect(result.status).toBe('SUSPICIOUS');
    });

    it('Matrix F: Destination match + good image + no visual anomaly -> VERIFIED', () => {
      const dest = createMockDestinationResult({ status: 'VERIFIED' });
      const quality = createMockImageQualityResult({ overallQuality: 'ACCEPTABLE' });
      const tamper = createMockTamperResult({
        visualDeviationIndex: 0.02,
        boundaryAnomalyDetected: false,
      });

      const result = composeVerificationResult(dest, quality, tamper);
      expect(result.status).toBe('VERIFIED');
    });

    it('Matrix G: Destination match + good image + tamper inconclusive -> VERIFIED', () => {
      const dest = createMockDestinationResult({ status: 'VERIFIED' });
      const quality = createMockImageQualityResult({ overallQuality: 'ACCEPTABLE' });
      const tamper = createMockTamperResult({
        analysisQuality: 'INCONCLUSIVE',
        boundaryAnomalyDetected: false,
        visualDeviationIndex: 0.0,
      });

      const result = composeVerificationResult(dest, quality, tamper);
      expect(result.status).toBe('VERIFIED');
    });

    it('Matrix H: Destination match + degraded image + no visual anomaly -> VERIFIED', () => {
      const dest = createMockDestinationResult({ status: 'VERIFIED' });
      const quality = createMockImageQualityResult({ overallQuality: 'DEGRADED' });
      const tamper = createMockTamperResult({
        visualDeviationIndex: 0.03,
        boundaryAnomalyDetected: false,
      });

      const result = composeVerificationResult(dest, quality, tamper);
      expect(result.status).toBe('VERIFIED');
    });
  });

  // Task 15 — Visual Deviation Boundary Testing
  describe('Visual Deviation Threshold Boundary Tests', () => {
    it('Just below high threshold -> VERIFIED', () => {
      const dest = createMockDestinationResult({ status: 'VERIFIED' });
      const quality = createMockImageQualityResult({ overallQuality: 'ACCEPTABLE' });
      const tamper = createMockTamperResult({
        visualDeviationIndex: VISUAL_DEVIATION_HIGH_THRESHOLD - 0.0001,
        boundaryAnomalyDetected: false,
      });

      const result = composeVerificationResult(dest, quality, tamper);
      expect(result.status).toBe('VERIFIED');
      expect(result.riskFactors).not.toContain('VISUAL_STRUCTURAL_DIFFERENCE');
    });

    it('Exactly at high threshold -> SUSPICIOUS', () => {
      const dest = createMockDestinationResult({ status: 'VERIFIED' });
      const quality = createMockImageQualityResult({ overallQuality: 'ACCEPTABLE' });
      const tamper = createMockTamperResult({
        visualDeviationIndex: VISUAL_DEVIATION_HIGH_THRESHOLD,
        boundaryAnomalyDetected: false,
      });

      const result = composeVerificationResult(dest, quality, tamper);
      expect(result.status).toBe('SUSPICIOUS');
      expect(result.riskFactors).toContain('VISUAL_STRUCTURAL_DIFFERENCE');
    });

    it('Just above high threshold -> SUSPICIOUS', () => {
      const dest = createMockDestinationResult({ status: 'VERIFIED' });
      const quality = createMockImageQualityResult({ overallQuality: 'ACCEPTABLE' });
      const tamper = createMockTamperResult({
        visualDeviationIndex: VISUAL_DEVIATION_HIGH_THRESHOLD + 0.0001,
        boundaryAnomalyDetected: false,
      });

      const result = composeVerificationResult(dest, quality, tamper);
      expect(result.status).toBe('SUSPICIOUS');
      expect(result.riskFactors).toContain('VISUAL_STRUCTURAL_DIFFERENCE');
    });
  });

  // Object-based input overload test
  it('Supports CompositeVerificationInput object interface', () => {
    const dest = createMockDestinationResult();
    const quality = createMockImageQualityResult();
    const tamper = createMockTamperResult();

    const result = composeVerificationResult({
      destinationResult: dest,
      imageQualityResult: quality,
      tamperResult: tamper,
    });

    expect(result.status).toBe('VERIFIED');
    expect(result.destinationMatch).toBe(true);
  });
});
