import { ParsedPaymentPayload } from '../payment-parser/types.js';
import { DestinationType, TrustedDestination, VerificationResult } from './types.js';
import { getActiveTrustedDestinations, normalizeDestination } from './rules.js';

/**
 * Deterministically verifies a parsed payment payload against trusted registrations.
 *
 * Strict Architectural Guarantees:
 * - Deterministic, pure-function execution: identical inputs always yield identical results.
 * - No network calls, filesystem I/O, or database queries.
 * - Zero reliance on AI/LLM heuristics for canonical verification status.
 * - Does not query banks or claim legal account ownership.
 *
 * Status Precedence:
 * 1. Payload lacks usable destination -> INSUFFICIENT_EVIDENCE
 * 2. Unstructured non-payment payload (TEXT) -> UNVERIFIED (NO_PAYMENT_DESTINATION)
 * 3. No active trusted registrations available -> UNVERIFIED (NO_TRUSTED_REGISTRATION)
 * 4. Exact normalized match with an active trusted destination -> VERIFIED (DESTINATION_MATCH)
 * 5. Active trusted destinations exist but none match -> DESTINATION_MISMATCH (DESTINATION_CONFLICT)
 *
 * @param payload - Parsed payment payload produced by the payment-parser module.
 * @param trustedDestinations - List of application-level trusted destination registrations.
 * @returns Strongly typed VerificationResult.
 */
export function verifyDestination(
  payload: ParsedPaymentPayload,
  trustedDestinations: readonly TrustedDestination[] = [],
): VerificationResult {
  // 1. Non-payment payload (TEXT) has no trusted destination
  if (payload.format === 'TEXT') {
    return Object.freeze({
      status: 'UNVERIFIED',
      destinationMatch: false,
      scannedDestination: null,
      matchedMerchantId: null,
      matchedDestination: null,
      reasonCode: 'NO_PAYMENT_DESTINATION',
      reason: 'The scanned payload does not contain a recognizable payment destination.',
      evidence: {
        normalizedScannedDestination: null,
        activeTrustedDestinationsChecked: 0,
        exactMatch: false,
      },
    });
  }

  // 2. Extract destination and destination type based on payload format
  let rawDestination: string | null = null;
  let destinationType: DestinationType | null = null;

  if (payload.format === 'UPI_URI') {
    rawDestination = payload.paymentAddress;
    destinationType = 'VPA';
  } else if (payload.format === 'GENERIC_URL') {
    rawDestination = payload.url;
    destinationType = 'URL';
  }

  // 3. Precedence 1: Check for missing or insufficient destination data
  if (
    !rawDestination ||
    typeof rawDestination !== 'string' ||
    rawDestination.trim().length === 0 ||
    !destinationType
  ) {
    return Object.freeze({
      status: 'INSUFFICIENT_EVIDENCE',
      destinationMatch: false,
      scannedDestination: null,
      matchedMerchantId: null,
      matchedDestination: null,
      reasonCode: 'INSUFFICIENT_DESTINATION_DATA',
      reason:
        'The payload does not contain sufficient structured destination information for verification.',
      evidence: {
        normalizedScannedDestination: null,
        activeTrustedDestinationsChecked: 0,
        exactMatch: false,
      },
    });
  }

  // 4. Normalize the scanned destination
  const normalizedScanned = normalizeDestination(rawDestination, destinationType);
  if (normalizedScanned.length === 0) {
    return Object.freeze({
      status: 'INSUFFICIENT_EVIDENCE',
      destinationMatch: false,
      scannedDestination: null,
      matchedMerchantId: null,
      matchedDestination: null,
      reasonCode: 'INSUFFICIENT_DESTINATION_DATA',
      reason: 'The normalized payment destination is empty.',
      evidence: {
        normalizedScannedDestination: null,
        activeTrustedDestinationsChecked: 0,
        exactMatch: false,
      },
    });
  }

  // 5. Precedence 2: Filter active trusted registrations of matching type
  const activeDestinations = getActiveTrustedDestinations(
    trustedDestinations,
    destinationType,
  );

  if (activeDestinations.length === 0) {
    return Object.freeze({
      status: 'UNVERIFIED',
      destinationMatch: false,
      scannedDestination: rawDestination,
      matchedMerchantId: null,
      matchedDestination: null,
      reasonCode: 'NO_TRUSTED_REGISTRATION',
      reason: 'No active trusted destination is available for comparison.',
      evidence: {
        normalizedScannedDestination: normalizedScanned,
        activeTrustedDestinationsChecked: 0,
        exactMatch: false,
      },
    });
  }

  // 6. Precedence 3 & 4: Exact matching against active trusted destinations
  for (const trusted of activeDestinations) {
    const normalizedTrusted = normalizeDestination(
      trusted.destinationValue,
      trusted.destinationType,
    );

    if (normalizedScanned === normalizedTrusted) {
      return Object.freeze({
        status: 'VERIFIED',
        destinationMatch: true,
        scannedDestination: rawDestination,
        matchedMerchantId: trusted.merchantId,
        matchedDestination: trusted.destinationValue,
        reasonCode: 'DESTINATION_MATCH',
        reason: 'The scanned payment destination matches an active trusted registration.',
        evidence: {
          normalizedScannedDestination: normalizedScanned,
          activeTrustedDestinationsChecked: activeDestinations.length,
          exactMatch: true,
        },
      });
    }
  }

  // 7. Precedence 4: Active trusted destinations exist, but none match
  return Object.freeze({
    status: 'DESTINATION_MISMATCH',
    destinationMatch: false,
    scannedDestination: rawDestination,
    matchedMerchantId: null,
    matchedDestination: null,
    reasonCode: 'DESTINATION_CONFLICT',
    reason:
      'The scanned payment destination does not match any registered trusted destination for this merchant.',
    evidence: {
      normalizedScannedDestination: normalizedScanned,
      activeTrustedDestinationsChecked: activeDestinations.length,
      exactMatch: false,
    },
  });
}
