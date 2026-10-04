/**
 * Supported payment destination types.
 */
export type DestinationType = 'VPA' | 'URL';

/**
 * Application-level trusted destination registration anchor.
 * Does not expose or store private banking credentials.
 */
export interface TrustedDestination {
  /** Identifier of the owning merchant */
  merchantId: string;
  /** Type of payment destination (VPA for UPI addresses, URL for web addresses) */
  destinationType: DestinationType;
  /** The canonical trusted payment destination value */
  destinationValue: string;
  /** Whether this trust anchor is currently active for verification */
  isActive: boolean;
}

/**
 * Canonical destination verification status.
 * Note: SUSPICIOUS belongs to the visual-tamper layer and is not emitted here.
 */
export type CanonicalVerificationStatus =
  'VERIFIED' | 'DESTINATION_MISMATCH' | 'UNVERIFIED' | 'INSUFFICIENT_EVIDENCE';

/**
 * Machine-readable reason codes explaining the deterministic verification decision.
 */
export type VerificationReasonCode =
  | 'DESTINATION_MATCH'
  | 'DESTINATION_CONFLICT'
  | 'NO_TRUSTED_REGISTRATION'
  | 'NO_PAYMENT_DESTINATION'
  | 'INSUFFICIENT_DESTINATION_DATA';

/**
 * Structured, deterministic evidence collected during destination evaluation.
 */
export interface VerificationEvidence {
  /** Normalized representation of the scanned destination string */
  normalizedScannedDestination: string | null;
  /** Count of active trusted registrations evaluated in this context */
  activeTrustedDestinationsChecked: number;
  /** Whether an exact string equality match was achieved */
  exactMatch: boolean;
}

/**
 * The strongly typed canonical result emitted by the destination verification engine.
 */
export interface VerificationResult {
  /** Canonical verification status */
  status: CanonicalVerificationStatus;
  /** Whether the scanned destination matched an active trusted registration */
  destinationMatch: boolean;
  /** Original scanned destination extracted from payload */
  scannedDestination: string | null;
  /** The merchant ID of the matched trust anchor, if verified */
  matchedMerchantId: string | null;
  /** The matched registered destination string, if verified */
  matchedDestination: string | null;
  /** Stable machine-readable reason code */
  reasonCode: VerificationReasonCode;
  /** Human-readable factual explanation of the decision */
  reason: string;
  /** Deterministic structured evidence */
  evidence: VerificationEvidence;
}
