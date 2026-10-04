import { DestinationType, TrustedDestination } from './types.js';

/**
 * Normalizes a payment destination string for exact deterministic matching.
 *
 * Normalization Rules:
 * - VPA: Trim leading/trailing whitespace and lowercase the string.
 * - URL: Trim whitespace; if valid HTTP/HTTPS URL, canonicalize protocol & host
 *   casing via WHATWG URL without altering path/query semantics.
 *
 * Security Constraints:
 * - No fuzzy matching.
 * - No substring matching.
 * - No similarity scores.
 * - No remote requests or DNS resolution.
 *
 * @param value - Raw destination string.
 * @param type - Destination type ('VPA' or 'URL').
 * @returns Deterministically normalized destination string.
 */
export function normalizeDestination(value: string, type: DestinationType): string {
  const trimmed = value.trim();

  if (type === 'VPA') {
    return trimmed.toLowerCase();
  }

  // URL normalization: canonicalize protocol & host casing while preserving path/query
  try {
    const url = new URL(trimmed);
    return url.href;
  } catch {
    return trimmed;
  }
}

/**
 * Filters the provided trusted destinations to only those that are active
 * and correspond to the relevant destination type.
 *
 * @param destinations - List of candidate trusted registrations.
 * @param type - Required destination type ('VPA' or 'URL').
 * @returns Filtered array of active trusted destinations.
 */
export function getActiveTrustedDestinations(
  destinations: readonly TrustedDestination[],
  type: DestinationType,
): TrustedDestination[] {
  return destinations.filter((dest) => dest.isActive && dest.destinationType === type);
}
