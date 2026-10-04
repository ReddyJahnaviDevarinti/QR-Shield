import { describe, it, expect } from 'vitest';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { decodeQr } from './decoder.js';
import { InvalidImageError, NoQrDetectedError, QrDecoderError } from './errors.js';

describe('Deterministic QR Decoder', () => {
  it('1. Decodes a valid generated UPI QR code accurately', async () => {
    const upiPayload = 'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411';
    const pngBuffer = await QRCode.toBuffer(upiPayload, {
      type: 'png',
      width: 400,
      margin: 4,
      errorCorrectionLevel: 'M',
    });

    const result = await decodeQr(pngBuffer);

    expect(result.rawPayload).toBe(upiPayload);
    expect(result.width).toBe(400);
    expect(result.height).toBe(400);
    expect(result.finderPatternsDetected).toBeGreaterThanOrEqual(3);
    expect(result.points).toHaveLength(4);
    expect(result.location.topLeftCorner.x).toBeGreaterThanOrEqual(0);
    expect(result.location.topRightCorner.x).toBeGreaterThan(0);
  });

  it('2. Decodes a valid generated URL QR code', async () => {
    const urlPayload = 'https://example.com/test';
    const pngBuffer = await QRCode.toBuffer(urlPayload, {
      type: 'png',
      width: 350,
      margin: 2,
    });

    const result = await decodeQr(pngBuffer);

    expect(result.rawPayload).toBe(urlPayload);
    expect(result.width).toBe(350);
    expect(result.height).toBe(350);
    expect(result.finderPatternsDetected).toBeGreaterThanOrEqual(3);
  });

  it('3. Decodes a valid generated plain text QR code', async () => {
    const textPayload = 'Plain text payload for QRShield deterministic testing';
    const pngBuffer = await QRCode.toBuffer(textPayload, {
      type: 'png',
      width: 300,
    });

    const result = await decodeQr(pngBuffer);

    expect(result.rawPayload).toBe(textPayload);
    expect(result.width).toBe(300);
    expect(result.height).toBe(300);
    expect(result.finderPatternsDetected).toBeGreaterThanOrEqual(3);
  });

  it('4. Throws a controlled InvalidImageError for random corrupt bytes', async () => {
    const corruptBuffer = Buffer.from([0xde, 0xad, 0xbe, 0xef, 0x01, 0x02, 0x03, 0x04]);

    await expect(decodeQr(corruptBuffer)).rejects.toThrow(InvalidImageError);
    await expect(decodeQr(corruptBuffer)).rejects.toMatchObject({
      code: 'E_INVALID_IMAGE',
      statusCode: 400,
    });
  });

  it('5. Throws a controlled InvalidImageError for empty buffer', async () => {
    const emptyBuffer = Buffer.alloc(0);

    await expect(decodeQr(emptyBuffer)).rejects.toThrow(InvalidImageError);
    await expect(decodeQr(emptyBuffer)).rejects.toMatchObject({
      code: 'E_INVALID_IMAGE',
      statusCode: 400,
    });
  });

  it('6. Verifies all required successful result properties', async () => {
    const testPayload = 'https://qrshield.internal.test/verification-target';
    const pngBuffer = await QRCode.toBuffer(testPayload, {
      type: 'png',
      width: 500,
      margin: 4,
    });

    const result = await decodeQr(pngBuffer);

    // Assert non-empty rawPayload
    expect(typeof result.rawPayload).toBe('string');
    expect(result.rawPayload.length).toBeGreaterThan(0);
    expect(result.rawPayload).toBe(testPayload);

    // Assert positive width and height
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);

    // Assert finder patterns >= 3
    expect(result.finderPatternsDetected).toBeGreaterThanOrEqual(3);

    // Assert location structure
    expect(result.location).toBeDefined();
    expect(typeof result.location.topLeftCorner.x).toBe('number');
    expect(typeof result.location.topLeftCorner.y).toBe('number');
    expect(typeof result.location.topRightCorner.x).toBe('number');
    expect(typeof result.location.topRightCorner.y).toBe('number');
    expect(typeof result.location.bottomRightCorner.x).toBe('number');
    expect(typeof result.location.bottomRightCorner.y).toBe('number');
    expect(typeof result.location.bottomLeftCorner.x).toBe('number');
    expect(typeof result.location.bottomLeftCorner.y).toBe('number');

    // Assert points array has 4 valid points
    expect(result.points).toHaveLength(4);
    result.points.forEach((point) => {
      expect(typeof point.x).toBe('number');
      expect(typeof point.y).toBe('number');
    });
  });

  it('7. Decodes JPEG and WebP encoded QR images', async () => {
    const payload = 'upi://pay?pa=merchant@upi&pn=Grocery%20Mart';
    const pngBuffer = await QRCode.toBuffer(payload, { type: 'png', width: 350 });

    // Convert PNG to JPEG buffer
    const jpegBuffer = await sharp(pngBuffer).jpeg({ quality: 90 }).toBuffer();
    const jpegResult = await decodeQr(jpegBuffer);
    expect(jpegResult.rawPayload).toBe(payload);
    expect(jpegResult.finderPatternsDetected).toBeGreaterThanOrEqual(3);

    // Convert PNG to WebP buffer
    const webpBuffer = await sharp(pngBuffer).webp({ quality: 90 }).toBuffer();
    const webpResult = await decodeQr(webpBuffer);
    expect(webpResult.rawPayload).toBe(payload);
    expect(webpResult.finderPatternsDetected).toBeGreaterThanOrEqual(3);
  });

  it('8. Throws controlled NoQrDetectedError when image contains no QR code', async () => {
    // Generate a solid white 200x200 PNG image
    const blankImage = await sharp({
      create: {
        width: 200,
        height: 200,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    await expect(decodeQr(blankImage)).rejects.toThrow(NoQrDetectedError);
    await expect(decodeQr(blankImage)).rejects.toMatchObject({
      code: 'E_NO_QR_DETECTED',
      statusCode: 422,
    });
  });

  it('9. Rejects non-buffer inputs with controlled error', async () => {
    // @ts-expect-error Testing invalid runtime input type
    await expect(decodeQr(null)).rejects.toThrow(QrDecoderError);
    // @ts-expect-error Testing invalid runtime input type
    await expect(decodeQr('not-a-buffer')).rejects.toThrow(QrDecoderError);
  });
});
