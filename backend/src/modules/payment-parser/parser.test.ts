import { describe, it, expect, vi } from 'vitest';
import { parsePaymentPayload } from './parser.js';
import {
  AmbiguousParameterError,
  EmptyPayloadError,
  InvalidAmountError,
  InvalidCurrencyError,
  InvalidMccError,
  InvalidUpiPayloadError,
  MalformedUriError,
} from './errors.js';
import { ParsedUpiPayload } from './types.js';

describe('Deterministic Payment Payload Parser', () => {
  it('1. Parses a full UPI URI with all supported parameters', () => {
    const raw =
      'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411&am=150.00&cu=INR&mode=02';
    const result = parsePaymentPayload(raw);

    expect(result.format).toBe('UPI_URI');
    const upi = result as ParsedUpiPayload;
    expect(upi.rawPayload).toBe(raw);
    expect(upi.paymentAddress).toBe('store@icici');
    expect(upi.payeeName).toBe('Test Store');
    expect(upi.merchantCategoryCode).toBe('5411');
    expect(upi.amount).toBe('150.00');
    expect(typeof upi.amount).toBe('string');
    expect(upi.currency).toBe('INR');
    expect(upi.mode).toBe('02');
    expect(upi.url).toBeNull();
    expect(upi.refUrl).toBeNull();
  });

  it('2. Parses a minimal UPI URI and applies defaults', () => {
    const raw = 'upi://pay?pa=store@icici';
    const result = parsePaymentPayload(raw);

    expect(result.format).toBe('UPI_URI');
    const upi = result as ParsedUpiPayload;
    expect(upi.rawPayload).toBe(raw);
    expect(upi.paymentAddress).toBe('store@icici');
    expect(upi.payeeName).toBeNull();
    expect(upi.amount).toBeNull();
    expect(upi.merchantCategoryCode).toBeNull();
    expect(upi.currency).toBe('INR'); // Defaults to INR
    expect(upi.mode).toBeNull();
    expect(upi.url).toBeNull();
    expect(upi.refUrl).toBeNull();
  });

  it('3. Decodes URL-encoded merchant names with spaces, +, and special characters', () => {
    const raw = 'upi://pay?pa=store@icici&pn=Fresh%20%26%20Green+Organic+Market';
    const result = parsePaymentPayload(raw);

    expect(result.format).toBe('UPI_URI');
    const upi = result as ParsedUpiPayload;
    expect(upi.payeeName).toBe('Fresh & Green Organic Market');
  });

  it('4. Trims and lowercases the payment address (VPA)', () => {
    const raw = 'upi://pay?pa=%20%20STORE.Branch1@ICICI%20%20';
    const result = parsePaymentPayload(raw);

    expect(result.format).toBe('UPI_URI');
    const upi = result as ParsedUpiPayload;
    expect(upi.paymentAddress).toBe('store.branch1@icici');
  });

  it('5. Classifies generic HTTPS and HTTP URLs as GENERIC_URL', () => {
    const httpsUrl = 'https://example.com/checkout/merchant-qr';
    const httpsResult = parsePaymentPayload(httpsUrl);
    expect(httpsResult.format).toBe('GENERIC_URL');
    if (httpsResult.format === 'GENERIC_URL') {
      expect(httpsResult.url).toBe(httpsUrl);
      expect(httpsResult.rawPayload).toBe(httpsUrl);
    }

    const httpUrl = 'http://merchant.local/pay';
    const httpResult = parsePaymentPayload(httpUrl);
    expect(httpResult.format).toBe('GENERIC_URL');
    if (httpResult.format === 'GENERIC_URL') {
      expect(httpResult.url).toBe(httpUrl);
    }
  });

  it('6. Classifies non-URL, non-UPI content as TEXT', () => {
    const textPayload = 'Plain text QR payload without payment instructions';
    const result = parsePaymentPayload(textPayload);

    expect(result.format).toBe('TEXT');
    expect(result.rawPayload).toBe(textPayload);
  });

  it('7. Rejects UPI payloads missing the mandatory "pa" parameter', () => {
    const missingPa = 'upi://pay?pn=Store%20Name&am=100.00';
    expect(() => parsePaymentPayload(missingPa)).toThrow(InvalidUpiPayloadError);
    expect(() => parsePaymentPayload(missingPa)).toThrowError(
      expect.objectContaining({
        code: 'E_INVALID_UPI_PAYLOAD',
        statusCode: 400,
      }),
    );

    const emptyPa = 'upi://pay?pa=&pn=Store';
    expect(() => parsePaymentPayload(emptyPa)).toThrow(InvalidUpiPayloadError);
  });

  it('8. Rejects empty and whitespace-only payloads', () => {
    expect(() => parsePaymentPayload('')).toThrow(EmptyPayloadError);
    expect(() => parsePaymentPayload('   ')).toThrow(EmptyPayloadError);
    expect(() => parsePaymentPayload('')).toThrowError(
      expect.objectContaining({
        code: 'E_EMPTY_PAYLOAD',
        statusCode: 400,
      }),
    );

    // @ts-expect-error Testing non-string input at runtime
    expect(() => parsePaymentPayload(null)).toThrow(EmptyPayloadError);
  });

  it('9. Rejects invalid transaction amounts', () => {
    // Non-numeric
    expect(() => parsePaymentPayload('upi://pay?pa=store@icici&am=abc')).toThrow(
      InvalidAmountError,
    );
    expect(() => parsePaymentPayload('upi://pay?pa=store@icici&am=abc')).toThrowError(
      expect.objectContaining({
        code: 'E_INVALID_AMOUNT',
        statusCode: 400,
      }),
    );

    // Negative amount
    expect(() => parsePaymentPayload('upi://pay?pa=store@icici&am=-50.00')).toThrow(
      InvalidAmountError,
    );

    // Zero amount
    expect(() => parsePaymentPayload('upi://pay?pa=store@icici&am=0')).toThrow(
      InvalidAmountError,
    );
    expect(() => parsePaymentPayload('upi://pay?pa=store@icici&am=0.00')).toThrow(
      InvalidAmountError,
    );

    // Excessive decimal places (> 2)
    expect(() => parsePaymentPayload('upi://pay?pa=store@icici&am=10.999')).toThrow(
      InvalidAmountError,
    );
  });

  it('10. Rejects invalid currency codes', () => {
    // Too long
    expect(() => parsePaymentPayload('upi://pay?pa=store@icici&cu=TOOLONG')).toThrow(
      InvalidCurrencyError,
    );
    expect(() => parsePaymentPayload('upi://pay?pa=store@icici&cu=TOOLONG')).toThrowError(
      expect.objectContaining({
        code: 'E_INVALID_CURRENCY',
        statusCode: 400,
      }),
    );

    // Numeric or too short
    expect(() => parsePaymentPayload('upi://pay?pa=store@icici&cu=12')).toThrow(
      InvalidCurrencyError,
    );
    expect(() => parsePaymentPayload('upi://pay?pa=store@icici&cu=US')).toThrow(
      InvalidCurrencyError,
    );
  });

  it('11. Rejects invalid Merchant Category Codes (MCC)', () => {
    // Not 4 digits
    expect(() => parsePaymentPayload('upi://pay?pa=store@icici&mc=541')).toThrow(
      InvalidMccError,
    );
    expect(() => parsePaymentPayload('upi://pay?pa=store@icici&mc=54111')).toThrow(
      InvalidMccError,
    );
    expect(() => parsePaymentPayload('upi://pay?pa=store@icici&mc=541')).toThrowError(
      expect.objectContaining({
        code: 'E_INVALID_MCC',
        statusCode: 400,
      }),
    );

    // Non-numeric
    expect(() => parsePaymentPayload('upi://pay?pa=store@icici&mc=abcd')).toThrow(
      InvalidMccError,
    );
  });

  it('12. Rejects ambiguous duplicate security-sensitive parameters', () => {
    // Duplicate pa
    const duplicatePa = 'upi://pay?pa=store1@icici&pa=store2@icici';
    expect(() => parsePaymentPayload(duplicatePa)).toThrow(AmbiguousParameterError);
    expect(() => parsePaymentPayload(duplicatePa)).toThrowError(
      expect.objectContaining({
        code: 'E_AMBIGUOUS_PARAMETER',
        statusCode: 400,
      }),
    );

    // Case-insensitive duplicate pa
    const caseDuplicatePa = 'upi://pay?pa=store1@icici&PA=store2@icici';
    expect(() => parsePaymentPayload(caseDuplicatePa)).toThrow(AmbiguousParameterError);

    // Duplicate amount
    const duplicateAm = 'upi://pay?pa=store@icici&am=100.00&am=200.00';
    expect(() => parsePaymentPayload(duplicateAm)).toThrow(AmbiguousParameterError);

    // Duplicate currency
    const duplicateCu = 'upi://pay?pa=store@icici&cu=INR&cu=USD';
    expect(() => parsePaymentPayload(duplicateCu)).toThrow(AmbiguousParameterError);

    // Duplicate payee name
    const duplicatePn = 'upi://pay?pa=store@icici&pn=StoreA&pn=StoreB';
    expect(() => parsePaymentPayload(duplicatePn)).toThrow(AmbiguousParameterError);

    // Duplicate MCC
    const duplicateMc = 'upi://pay?pa=store@icici&mc=5411&mc=5412';
    expect(() => parsePaymentPayload(duplicateMc)).toThrow(AmbiguousParameterError);
  });

  it('13. Deterministically retains the first value for duplicate non-security parameters', () => {
    // Duplicate mode (non-security parameter)
    const raw = 'upi://pay?pa=store@icici&mode=02&mode=01';
    const result = parsePaymentPayload(raw) as ParsedUpiPayload;

    expect(result.format).toBe('UPI_URI');
    // Documented rule: First occurrence ('02') is retained
    expect(result.mode).toBe('02');
  });

  it('14. Rejects malformed URIs with controlled error', () => {
    // Malformed percent-encoding
    const malformedPercent = 'upi://pay?pa=store%ZZ@icici';
    expect(() => parsePaymentPayload(malformedPercent)).toThrow(MalformedUriError);
    expect(() => parsePaymentPayload(malformedPercent)).toThrowError(
      expect.objectContaining({
        code: 'E_MALFORMED_URI',
        statusCode: 400,
      }),
    );

    // Invalid UPI action (e.g. collect instead of pay)
    const invalidAction = 'upi://collect?pa=store@icici';
    expect(() => parsePaymentPayload(invalidAction)).toThrow(InvalidUpiPayloadError);

    // Invalid VPA without @ symbol
    const noAtVpa = 'upi://pay?pa=invalidvpa';
    expect(() => parsePaymentPayload(noAtVpa)).toThrow(InvalidUpiPayloadError);
  });

  it('15. Executes purely in-memory with zero network or I/O calls', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = parsePaymentPayload('https://example.com/test-remote-url');
    expect(result.format).toBe('GENERIC_URL');

    // Assert fetch was never called
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it('16. Safely handles case-insensitive query parameter keys', () => {
    const raw = 'upi://pay?PA=store@icici&PN=My%20Store&AM=250.00&CU=inr&MC=5411';
    const result = parsePaymentPayload(raw) as ParsedUpiPayload;

    expect(result.format).toBe('UPI_URI');
    expect(result.paymentAddress).toBe('store@icici');
    expect(result.payeeName).toBe('My Store');
    expect(result.amount).toBe('250.00');
    expect(result.currency).toBe('INR');
    expect(result.merchantCategoryCode).toBe('5411');
  });
});
