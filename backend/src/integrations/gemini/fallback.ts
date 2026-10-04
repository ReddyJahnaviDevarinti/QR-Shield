import type { CanonicalCompositeStatus } from '../../modules/composite-verification/types.js';

/**
 * Authoritative deterministic fallback explanations for all canonical statuses.
 *
 * SAFETY RULES:
 * - Never claim fraud detected
 * - Never claim scam detected
 * - Never claim definitely fake
 * - Never claim guaranteed safe
 */
export const DETERMINISTIC_FALLBACKS: Readonly<Record<CanonicalCompositeStatus, string>> =
  {
    VERIFIED:
      'The scanned payment destination matches an active trusted registration and the available image evidence is sufficient for verification.',
    DESTINATION_MISMATCH:
      'The scanned payment destination conflicts with the active trusted destination for the selected merchant.',
    UNVERIFIED: 'No active trusted destination is available for comparison.',
    SUSPICIOUS:
      'Visual evidence indicates an anomaly that warrants manual inspection. This result does not establish fraud.',
    INSUFFICIENT_EVIDENCE:
      'The available evidence is insufficient for a reliable verification result.',
  };

/**
 * Returns the authoritative deterministic fallback explanation for a given canonical status.
 */
export function getDeterministicFallbackExplanation(
  status: CanonicalCompositeStatus,
): string {
  const fallback = DETERMINISTIC_FALLBACKS[status];
  if (!fallback) {
    return 'The available evidence is insufficient for a reliable verification result.';
  }
  return fallback;
}
