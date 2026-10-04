import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import QRCode from 'qrcode';
import { analyzeImageQuality } from './analyzer.js';
import { InvalidImageError, ImageTooLargeError } from './errors.js';
import {
  classifyBrightness,
  classifyContrast,
  classifySharpness,
  evaluateOverallQuality,
  BRIGHTNESS_TOO_DARK_THRESHOLD,
  BRIGHTNESS_TOO_BRIGHT_THRESHOLD,
  CONTRAST_LOW_THRESHOLD,
  SHARPNESS_BLUR_THRESHOLD,
  SHARPNESS_EXTREME_BLUR_THRESHOLD,
  DYNAMIC_RANGE_LOW_THRESHOLD,
  MIN_USABLE_DIMENSION,
  MIN_RECOMMENDED_DIMENSION,
} from './rules.js';

/** Helper to generate a sharp synthetic QR code PNG */
async function generateSampleQrBuffer(): Promise<Buffer> {
  return QRCode.toBuffer('upi://pay?pa=store@icici&pn=TestStore&mc=5411', {
    type: 'png',
    width: 400,
    margin: 4,
    errorCorrectionLevel: 'M',
  });
}

describe('Deterministic Image Quality Analyzer', () => {
  it('1. Normal high-quality synthetic image returns ACCEPTABLE', async () => {
    const qrBuffer = await generateSampleQrBuffer();
    const result = await analyzeImageQuality(qrBuffer);

    expect(result.width).toBe(400);
    expect(result.height).toBe(400);
    expect(result.pixelCount).toBe(160000);
    expect(result.meanBrightness).toBeGreaterThanOrEqual(0.3);
    expect(result.meanBrightness).toBeLessThanOrEqual(0.7);
    expect(result.brightnessClassification).toBe('ACCEPTABLE');
    expect(result.contrastScore).toBeGreaterThanOrEqual(0.5);
    expect(result.contrastClassification).toBe('ACCEPTABLE_CONTRAST');
    expect(result.sharpnessScore).toBeGreaterThanOrEqual(0.2);
    expect(result.sharpnessClassification).toBe('ACCEPTABLE_SHARPNESS');
    expect(result.overallQuality).toBe('ACCEPTABLE');
    expect(result.qualityFlags).toEqual([]);
  });

  it('2. Very dark image returns TOO_DARK classification', async () => {
    // Solid dark gray/black image
    const darkBuffer = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 15, g: 15, b: 15 },
      },
    })
      .png()
      .toBuffer();

    const result = await analyzeImageQuality(darkBuffer);

    expect(result.brightnessClassification).toBe('TOO_DARK');
    expect(result.meanBrightness).toBeLessThan(BRIGHTNESS_TOO_DARK_THRESHOLD);
    expect(result.qualityFlags).toContain('TOO_DARK');
    expect(['DEGRADED', 'INSUFFICIENT']).toContain(result.overallQuality);
  });

  it('3. Very bright image returns TOO_BRIGHT classification', async () => {
    // Solid near-white image
    const brightBuffer = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 245, g: 245, b: 245 },
      },
    })
      .png()
      .toBuffer();

    const result = await analyzeImageQuality(brightBuffer);

    expect(result.brightnessClassification).toBe('TOO_BRIGHT');
    expect(result.meanBrightness).toBeGreaterThan(BRIGHTNESS_TOO_BRIGHT_THRESHOLD);
    expect(result.qualityFlags).toContain('TOO_BRIGHT');
    expect(['DEGRADED', 'INSUFFICIENT']).toContain(result.overallQuality);
  });

  it('4. Low-contrast image returns LOW_CONTRAST classification', async () => {
    // Flat mid-gray image with zero contrast
    const flatGrayBuffer = await sharp({
      create: {
        width: 300,
        height: 300,
        channels: 3,
        background: { r: 128, g: 128, b: 128 },
      },
    })
      .png()
      .toBuffer();

    const result = await analyzeImageQuality(flatGrayBuffer);

    expect(result.contrastClassification).toBe('LOW_CONTRAST');
    expect(result.contrastScore).toBe(0);
    expect(result.dynamicRange).toBe(0);
    expect(result.qualityFlags).toContain('LOW_CONTRAST');
  });

  it('5. Synthetic blurred image returns BLURRY classification', async () => {
    const qrBuffer = await generateSampleQrBuffer();
    // Heavily blur the image
    const blurredBuffer = await sharp(qrBuffer).blur(20).png().toBuffer();

    const result = await analyzeImageQuality(blurredBuffer);

    expect(result.sharpnessClassification).toBe('BLURRY');
    expect(result.sharpnessScore).toBeLessThan(SHARPNESS_BLUR_THRESHOLD);
    expect(result.qualityFlags).toContain('BLURRY');
    expect(['DEGRADED', 'INSUFFICIENT']).toContain(result.overallQuality);
  });

  it('6. Extremely small image returns INSUFFICIENT with UNUSABLE_DIMENSIONS', async () => {
    // 50x50 image (< MIN_USABLE_DIMENSION of 64px)
    const tinyBuffer = await sharp({
      create: {
        width: 50,
        height: 50,
        channels: 3,
        background: { r: 120, g: 120, b: 120 },
      },
    })
      .png()
      .toBuffer();

    const result = await analyzeImageQuality(tinyBuffer);

    expect(result.width).toBe(50);
    expect(result.height).toBe(50);
    expect(result.qualityFlags).toContain('UNUSABLE_DIMENSIONS');
    expect(result.overallQuality).toBe('INSUFFICIENT');
  });

  it('7. Sub-recommended dimension image returns DEGRADED with LOW_RESOLUTION', async () => {
    // 150x150 image (>= 64px but < 200px)
    const qrBuffer = await QRCode.toBuffer('upi://pay?pa=store@icici', {
      type: 'png',
      width: 150,
      margin: 2,
    });

    const result = await analyzeImageQuality(qrBuffer);

    expect(result.width).toBe(150);
    expect(result.height).toBe(150);
    expect(result.qualityFlags).toContain('LOW_RESOLUTION');
    expect(result.overallQuality).toBe('DEGRADED');
  });

  it('8. Invalid random bytes throws InvalidImageError (E_INVALID_IMAGE)', async () => {
    const randomBuffer = Buffer.from('NOT_AN_IMAGE_RANDOM_CORRUPT_BYTES_9999');

    await expect(analyzeImageQuality(randomBuffer)).rejects.toThrow(InvalidImageError);
    await expect(analyzeImageQuality(randomBuffer)).rejects.toMatchObject({
      code: 'E_INVALID_IMAGE',
      statusCode: 400,
    });
  });

  it('9. Empty buffer throws InvalidImageError (E_INVALID_IMAGE)', async () => {
    const emptyBuffer = Buffer.alloc(0);

    await expect(analyzeImageQuality(emptyBuffer)).rejects.toThrow(InvalidImageError);
    await expect(analyzeImageQuality(emptyBuffer)).rejects.toMatchObject({
      code: 'E_INVALID_IMAGE',
      statusCode: 400,
    });
  });

  it('10. Unsupported format throws controlled InvalidImageError', async () => {
    // Generate a valid GIF (unsupported; only jpeg, png, webp allowed)
    const gifBuffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 100, g: 100, b: 100 },
      },
    })
      .gif()
      .toBuffer();

    await expect(analyzeImageQuality(gifBuffer)).rejects.toThrow(InvalidImageError);
    await expect(analyzeImageQuality(gifBuffer)).rejects.toThrow(
      /Unsupported image format/,
    );
  });

  it('11. Oversized image buffer throws ImageTooLargeError (E_IMAGE_TOO_LARGE)', async () => {
    // 10 MB + 1 byte
    const largeBuffer = Buffer.alloc(10 * 1024 * 1024 + 1);

    await expect(analyzeImageQuality(largeBuffer)).rejects.toThrow(ImageTooLargeError);
    await expect(analyzeImageQuality(largeBuffer)).rejects.toMatchObject({
      code: 'E_IMAGE_TOO_LARGE',
      statusCode: 400,
    });
  });

  it('12. Supports JPEG and WebP formats accurately', async () => {
    const qrBuffer = await generateSampleQrBuffer();
    const jpegBuffer = await sharp(qrBuffer).jpeg().toBuffer();
    const webpBuffer = await sharp(qrBuffer).webp().toBuffer();

    const jpegResult = await analyzeImageQuality(jpegBuffer);
    const webpResult = await analyzeImageQuality(webpBuffer);

    expect(jpegResult.overallQuality).toBe('ACCEPTABLE');
    expect(webpResult.overallQuality).toBe('ACCEPTABLE');
    expect(jpegResult.width).toBe(400);
    expect(webpResult.width).toBe(400);
  });

  it('13. Determinism: Same input analyzed twice produces identical numeric metrics', async () => {
    const qrBuffer = await generateSampleQrBuffer();

    const run1 = await analyzeImageQuality(qrBuffer);
    const run2 = await analyzeImageQuality(qrBuffer);

    expect(run1).toEqual(run2);
  });

  it('14. Complete network isolation: Zero fetch calls executed', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const qrBuffer = await generateSampleQrBuffer();

    await analyzeImageQuality(qrBuffer);

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('15. Caller input buffer is never mutated', async () => {
    const qrBuffer = await generateSampleQrBuffer();
    const copyBuffer = Buffer.from(qrBuffer);

    await analyzeImageQuality(qrBuffer);

    expect(qrBuffer.equals(copyBuffer)).toBe(true);
  });

  it('16. Quality flags are stable and deterministic', async () => {
    const qrBuffer = await generateSampleQrBuffer();
    const darkBuffer = await sharp(qrBuffer)
      .modulate({ brightness: 0.1 })
      .png()
      .toBuffer();

    const res1 = await analyzeImageQuality(darkBuffer);
    const res2 = await analyzeImageQuality(darkBuffer);

    expect(res1.qualityFlags).toEqual(res2.qualityFlags);
    expect(res1.qualityFlags).toContain('TOO_DARK');
  });

  describe('Task 15: Heuristic Threshold Boundary Testing', () => {
    it('Brightness threshold boundaries: TOO_DARK (< 0.20), ACCEPTABLE ([0.20, 0.85]), TOO_BRIGHT (> 0.85)', () => {
      // Dark boundary
      expect(classifyBrightness(BRIGHTNESS_TOO_DARK_THRESHOLD - 0.001)).toBe('TOO_DARK');
      expect(classifyBrightness(BRIGHTNESS_TOO_DARK_THRESHOLD)).toBe('ACCEPTABLE');
      expect(classifyBrightness(BRIGHTNESS_TOO_DARK_THRESHOLD + 0.001)).toBe(
        'ACCEPTABLE',
      );

      // Bright boundary
      expect(classifyBrightness(BRIGHTNESS_TOO_BRIGHT_THRESHOLD - 0.001)).toBe(
        'ACCEPTABLE',
      );
      expect(classifyBrightness(BRIGHTNESS_TOO_BRIGHT_THRESHOLD)).toBe('ACCEPTABLE');
      expect(classifyBrightness(BRIGHTNESS_TOO_BRIGHT_THRESHOLD + 0.001)).toBe(
        'TOO_BRIGHT',
      );
    });

    it('Contrast threshold boundaries: LOW_CONTRAST (< 0.25), ACCEPTABLE_CONTRAST (>= 0.25)', () => {
      expect(classifyContrast(CONTRAST_LOW_THRESHOLD - 0.001)).toBe('LOW_CONTRAST');
      expect(classifyContrast(CONTRAST_LOW_THRESHOLD)).toBe('ACCEPTABLE_CONTRAST');
      expect(classifyContrast(CONTRAST_LOW_THRESHOLD + 0.001)).toBe(
        'ACCEPTABLE_CONTRAST',
      );
    });

    it('Sharpness threshold boundaries: BLURRY (< 0.15), ACCEPTABLE_SHARPNESS (>= 0.15)', () => {
      expect(classifySharpness(SHARPNESS_BLUR_THRESHOLD - 0.001)).toBe('BLURRY');
      expect(classifySharpness(SHARPNESS_BLUR_THRESHOLD)).toBe('ACCEPTABLE_SHARPNESS');
      expect(classifySharpness(SHARPNESS_BLUR_THRESHOLD + 0.001)).toBe(
        'ACCEPTABLE_SHARPNESS',
      );
    });

    it('Extreme blur boundary (< 0.04) causes INSUFFICIENT quality', () => {
      const justBelow = evaluateOverallQuality({
        width: 400,
        height: 400,
        meanBrightness: 0.5,
        contrastScore: 0.5,
        sharpnessScore: SHARPNESS_EXTREME_BLUR_THRESHOLD - 0.001,
        dynamicRange: 0.8,
        brightnessClassification: 'ACCEPTABLE',
        contrastClassification: 'ACCEPTABLE_CONTRAST',
        sharpnessClassification: 'BLURRY',
      });
      expect(justBelow.qualityFlags).toContain('EXTREME_BLUR');
      expect(justBelow.overallQuality).toBe('INSUFFICIENT');

      const atThreshold = evaluateOverallQuality({
        width: 400,
        height: 400,
        meanBrightness: 0.5,
        contrastScore: 0.5,
        sharpnessScore: SHARPNESS_EXTREME_BLUR_THRESHOLD,
        dynamicRange: 0.8,
        brightnessClassification: 'ACCEPTABLE',
        contrastClassification: 'ACCEPTABLE_CONTRAST',
        sharpnessClassification: 'BLURRY',
      });
      expect(atThreshold.qualityFlags).not.toContain('EXTREME_BLUR');
      expect(atThreshold.qualityFlags).toContain('BLURRY');
      expect(atThreshold.overallQuality).toBe('DEGRADED');
    });

    it('Dimension threshold boundaries: MIN_USABLE (64px) and MIN_RECOMMENDED (200px)', () => {
      // Below 64px -> UNUSABLE_DIMENSIONS & INSUFFICIENT
      const belowUsable = evaluateOverallQuality({
        width: MIN_USABLE_DIMENSION - 1,
        height: 200,
        meanBrightness: 0.5,
        contrastScore: 0.5,
        sharpnessScore: 0.5,
        dynamicRange: 0.8,
        brightnessClassification: 'ACCEPTABLE',
        contrastClassification: 'ACCEPTABLE_CONTRAST',
        sharpnessClassification: 'ACCEPTABLE_SHARPNESS',
      });
      expect(belowUsable.qualityFlags).toContain('UNUSABLE_DIMENSIONS');
      expect(belowUsable.overallQuality).toBe('INSUFFICIENT');

      // Exactly 64px -> usable but LOW_RESOLUTION (< 200px) & DEGRADED
      const atUsable = evaluateOverallQuality({
        width: MIN_USABLE_DIMENSION,
        height: MIN_USABLE_DIMENSION,
        meanBrightness: 0.5,
        contrastScore: 0.5,
        sharpnessScore: 0.5,
        dynamicRange: 0.8,
        brightnessClassification: 'ACCEPTABLE',
        contrastClassification: 'ACCEPTABLE_CONTRAST',
        sharpnessClassification: 'ACCEPTABLE_SHARPNESS',
      });
      expect(atUsable.qualityFlags).not.toContain('UNUSABLE_DIMENSIONS');
      expect(atUsable.qualityFlags).toContain('LOW_RESOLUTION');
      expect(atUsable.overallQuality).toBe('DEGRADED');

      // Exactly 200px -> meets recommended dimension -> ACCEPTABLE
      const atRecommended = evaluateOverallQuality({
        width: MIN_RECOMMENDED_DIMENSION,
        height: MIN_RECOMMENDED_DIMENSION,
        meanBrightness: 0.5,
        contrastScore: 0.5,
        sharpnessScore: 0.5,
        dynamicRange: 0.8,
        brightnessClassification: 'ACCEPTABLE',
        contrastClassification: 'ACCEPTABLE_CONTRAST',
        sharpnessClassification: 'ACCEPTABLE_SHARPNESS',
      });
      expect(atRecommended.qualityFlags).toEqual([]);
      expect(atRecommended.overallQuality).toBe('ACCEPTABLE');
    });

    it('Dynamic range threshold boundary (< 0.30)', () => {
      const belowRange = evaluateOverallQuality({
        width: 400,
        height: 400,
        meanBrightness: 0.5,
        contrastScore: 0.5,
        sharpnessScore: 0.5,
        dynamicRange: DYNAMIC_RANGE_LOW_THRESHOLD - 0.01,
        brightnessClassification: 'ACCEPTABLE',
        contrastClassification: 'ACCEPTABLE_CONTRAST',
        sharpnessClassification: 'ACCEPTABLE_SHARPNESS',
      });
      expect(belowRange.qualityFlags).toContain('LOW_DYNAMIC_RANGE');
      expect(belowRange.overallQuality).toBe('DEGRADED');

      const atRange = evaluateOverallQuality({
        width: 400,
        height: 400,
        meanBrightness: 0.5,
        contrastScore: 0.5,
        sharpnessScore: 0.5,
        dynamicRange: DYNAMIC_RANGE_LOW_THRESHOLD,
        brightnessClassification: 'ACCEPTABLE',
        contrastClassification: 'ACCEPTABLE_CONTRAST',
        sharpnessClassification: 'ACCEPTABLE_SHARPNESS',
      });
      expect(atRange.qualityFlags).toEqual([]);
      expect(atRange.overallQuality).toBe('ACCEPTABLE');
    });
  });
});
