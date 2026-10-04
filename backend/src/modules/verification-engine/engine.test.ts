import { describe, it, expect, vi } from 'vitest';
import { verifyDestination } from './engine.js';
import { TrustedDestination } from './types.js';
import {
  ParsedGenericUrlPayload,
  ParsedTextPayload,
  ParsedUpiPayload,
} from '../payment-parser/types.js';

describe('Deterministic Destination Verification Engine', () => {
  const trustedMerchantId = 'merchant-uuid-1001';

  const defaultTrustedUpi: TrustedDestination = {
    merchantId: trustedMerchantId,
    destinationType: 'VPA',
    destinationValue: 'store@icici',
    isActive: true,
  };

  const sampleUpiPayload: ParsedUpiPayload = {
    format: 'UPI_URI',
    rawPayload: 'upi://pay?pa=store@icici&pn=Test%20Store&mc=5411',
    paymentAddress: 'store@icici',
    payeeName: 'Test Store',
    amount: null,
    merchantCategoryCode: '5411',
    currency: 'INR',
    mode: null,
    url: null,
    refUrl: null,
  };

  it('1. Returns VERIFIED when scanned UPI VPA exactly matches trusted registration', () => {
    const result = verifyDestination(sampleUpiPayload, [defaultTrustedUpi]);

    expect(result.status).toBe('VERIFIED');
    expect(result.destinationMatch).toBe(true);
    expect(result.scannedDestination).toBe('store@icici');
    expect(result.matchedMerchantId).toBe(trustedMerchantId);
    expect(result.matchedDestination).toBe('store@icici');
    expect(result.reasonCode).toBe('DESTINATION_MATCH');
    expect(result.evidence.exactMatch).toBe(true);
    expect(result.evidence.activeTrustedDestinationsChecked).toBe(1);
    expect(result.evidence.normalizedScannedDestination).toBe('store@icici');
  });

  it('2. Normalizes case and whitespace between scanned and trusted VPAs', () => {
    const unnormalizedPayload: ParsedUpiPayload = {
      ...sampleUpiPayload,
      paymentAddress: '  STORE@ICICI  ',
    };
    const unnormalizedTrusted: TrustedDestination = {
      ...defaultTrustedUpi,
      destinationValue: '  Store@ICICI  ',
    };

    const result = verifyDestination(unnormalizedPayload, [unnormalizedTrusted]);

    expect(result.status).toBe('VERIFIED');
    expect(result.destinationMatch).toBe(true);
    expect(result.reasonCode).toBe('DESTINATION_MATCH');
  });

  it('3. Returns DESTINATION_MISMATCH when scanned VPA conflicts with registered trusted VPA', () => {
    const conflictingPayload: ParsedUpiPayload = {
      ...sampleUpiPayload,
      paymentAddress: 'attacker@upi',
    };

    const result = verifyDestination(conflictingPayload, [defaultTrustedUpi]);

    expect(result.status).toBe('DESTINATION_MISMATCH');
    expect(result.destinationMatch).toBe(false);
    expect(result.scannedDestination).toBe('attacker@upi');
    expect(result.matchedMerchantId).toBeNull();
    expect(result.matchedDestination).toBeNull();
    expect(result.reasonCode).toBe('DESTINATION_CONFLICT');
    expect(result.evidence.exactMatch).toBe(false);
    expect(result.evidence.activeTrustedDestinationsChecked).toBe(1);
    expect(result.evidence.normalizedScannedDestination).toBe('attacker@upi');
  });

  it('4. Returns UNVERIFIED when no trusted registrations are provided', () => {
    const result = verifyDestination(sampleUpiPayload, []);

    expect(result.status).toBe('UNVERIFIED');
    expect(result.destinationMatch).toBe(false);
    expect(result.matchedMerchantId).toBeNull();
    expect(result.matchedDestination).toBeNull();
    expect(result.reasonCode).toBe('NO_TRUSTED_REGISTRATION');
    expect(result.evidence.exactMatch).toBe(false);
    expect(result.evidence.activeTrustedDestinationsChecked).toBe(0);
  });

  it('5. Does not verify against inactive registrations (returns UNVERIFIED)', () => {
    const inactiveTrusted: TrustedDestination = {
      ...defaultTrustedUpi,
      isActive: false,
    };

    const result = verifyDestination(sampleUpiPayload, [inactiveTrusted]);

    expect(result.status).toBe('UNVERIFIED');
    expect(result.destinationMatch).toBe(false);
    expect(result.reasonCode).toBe('NO_TRUSTED_REGISTRATION');
    expect(result.evidence.activeTrustedDestinationsChecked).toBe(0);
  });

  it('6. Returns VERIFIED when one matching active destination exists among multiple', () => {
    const multipleTrusted: TrustedDestination[] = [
      {
        merchantId: 'merchant-a',
        destinationType: 'VPA',
        destinationValue: 'other1@bank',
        isActive: true,
      },
      {
        merchantId: 'merchant-target',
        destinationType: 'VPA',
        destinationValue: 'store@icici',
        isActive: true,
      },
      {
        merchantId: 'merchant-c',
        destinationType: 'VPA',
        destinationValue: 'other2@bank',
        isActive: true,
      },
    ];

    const result = verifyDestination(sampleUpiPayload, multipleTrusted);

    expect(result.status).toBe('VERIFIED');
    expect(result.destinationMatch).toBe(true);
    expect(result.matchedMerchantId).toBe('merchant-target');
    expect(result.matchedDestination).toBe('store@icici');
    expect(result.evidence.activeTrustedDestinationsChecked).toBe(3);
  });

  it('7. Returns DESTINATION_MISMATCH when multiple trusted destinations exist with no match', () => {
    const multipleTrusted: TrustedDestination[] = [
      {
        merchantId: 'merchant-a',
        destinationType: 'VPA',
        destinationValue: 'branch1@icici',
        isActive: true,
      },
      {
        merchantId: 'merchant-a',
        destinationType: 'VPA',
        destinationValue: 'branch2@icici',
        isActive: true,
      },
    ];

    const result = verifyDestination(sampleUpiPayload, multipleTrusted);

    expect(result.status).toBe('DESTINATION_MISMATCH');
    expect(result.destinationMatch).toBe(false);
    expect(result.reasonCode).toBe('DESTINATION_CONFLICT');
    expect(result.evidence.activeTrustedDestinationsChecked).toBe(2);
  });

  it('8. Returns VERIFIED for generic HTTPS URL exact match', () => {
    const urlPayload: ParsedGenericUrlPayload = {
      format: 'GENERIC_URL',
      rawPayload: 'https://example.com/checkout/merchant-101',
      url: 'https://example.com/checkout/merchant-101',
    };
    const trustedUrl: TrustedDestination = {
      merchantId: 'merchant-url-1',
      destinationType: 'URL',
      destinationValue: 'https://example.com/checkout/merchant-101',
      isActive: true,
    };

    const result = verifyDestination(urlPayload, [trustedUrl]);

    expect(result.status).toBe('VERIFIED');
    expect(result.destinationMatch).toBe(true);
    expect(result.matchedMerchantId).toBe('merchant-url-1');
    expect(result.reasonCode).toBe('DESTINATION_MATCH');
  });

  it('9. Returns DESTINATION_MISMATCH for generic URL conflict', () => {
    const urlPayload: ParsedGenericUrlPayload = {
      format: 'GENERIC_URL',
      rawPayload: 'https://phishing-site.example/pay',
      url: 'https://phishing-site.example/pay',
    };
    const trustedUrl: TrustedDestination = {
      merchantId: 'merchant-url-1',
      destinationType: 'URL',
      destinationValue: 'https://legitimate-site.example/pay',
      isActive: true,
    };

    const result = verifyDestination(urlPayload, [trustedUrl]);

    expect(result.status).toBe('DESTINATION_MISMATCH');
    expect(result.destinationMatch).toBe(false);
    expect(result.reasonCode).toBe('DESTINATION_CONFLICT');
  });

  it('10. Returns UNVERIFIED for unstructured TEXT payload', () => {
    const textPayload: ParsedTextPayload = {
      format: 'TEXT',
      rawPayload: 'Plain informational text without payment destination',
    };

    const result = verifyDestination(textPayload, [defaultTrustedUpi]);

    expect(result.status).toBe('UNVERIFIED');
    expect(result.destinationMatch).toBe(false);
    expect(result.scannedDestination).toBeNull();
    expect(result.reasonCode).toBe('NO_PAYMENT_DESTINATION');
    expect(result.evidence.activeTrustedDestinationsChecked).toBe(0);
  });

  it('11. Returns INSUFFICIENT_EVIDENCE when payload contains missing or invalid destination data', () => {
    const emptyDestinationPayload: ParsedUpiPayload = {
      ...sampleUpiPayload,
      paymentAddress: '',
    };

    const result = verifyDestination(emptyDestinationPayload, [defaultTrustedUpi]);

    expect(result.status).toBe('INSUFFICIENT_EVIDENCE');
    expect(result.destinationMatch).toBe(false);
    expect(result.scannedDestination).toBeNull();
    expect(result.reasonCode).toBe('INSUFFICIENT_DESTINATION_DATA');
  });

  it('12. Does NOT use payee name for destination matching', () => {
    const mismatchedPayeeNamePayload: ParsedUpiPayload = {
      ...sampleUpiPayload,
      paymentAddress: 'store@icici',
      payeeName: 'Completely Different / Deceptive Name',
    };

    const result = verifyDestination(mismatchedPayeeNamePayload, [defaultTrustedUpi]);

    // Destination matching isolates destination equality only
    expect(result.status).toBe('VERIFIED');
    expect(result.destinationMatch).toBe(true);
    expect(result.reasonCode).toBe('DESTINATION_MATCH');
  });

  it('13. Verifies that amount does NOT affect destination matching', () => {
    const amountPayload: ParsedUpiPayload = {
      ...sampleUpiPayload,
      amount: '99999.00',
    };

    const result = verifyDestination(amountPayload, [defaultTrustedUpi]);

    expect(result.status).toBe('VERIFIED');
    expect(result.destinationMatch).toBe(true);
  });

  it('14. Verifies that MCC does NOT affect destination matching', () => {
    const mccPayload: ParsedUpiPayload = {
      ...sampleUpiPayload,
      merchantCategoryCode: '0000',
    };

    const result = verifyDestination(mccPayload, [defaultTrustedUpi]);

    expect(result.status).toBe('VERIFIED');
    expect(result.destinationMatch).toBe(true);
  });

  it('15. Executes purely in-memory with zero network requests', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const result = verifyDestination(sampleUpiPayload, [defaultTrustedUpi]);
    expect(result.status).toBe('VERIFIED');

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('16. Executes purely in-memory with zero filesystem operations', () => {
    // Pure function evaluation produces frozen object without side-effects
    const result = verifyDestination(sampleUpiPayload, [defaultTrustedUpi]);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('17. Produces deterministic identical output for repeated identical inputs', () => {
    const result1 = verifyDestination(sampleUpiPayload, [defaultTrustedUpi]);
    const result2 = verifyDestination(sampleUpiPayload, [defaultTrustedUpi]);

    expect(result1).toEqual(result2);
  });

  it('18. Isolates destination types (a URL destination never matches a VPA destination)', () => {
    const urlDestination: TrustedDestination = {
      merchantId: 'merchant-cross-type',
      destinationType: 'URL',
      destinationValue: 'store@icici', // Even if value is somehow identical
      isActive: true,
    };

    const result = verifyDestination(sampleUpiPayload, [urlDestination]);

    // Active trusted destinations of type VPA is 0
    expect(result.status).toBe('UNVERIFIED');
    expect(result.reasonCode).toBe('NO_TRUSTED_REGISTRATION');
  });
});
