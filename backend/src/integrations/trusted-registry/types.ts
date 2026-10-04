/**
 * Supported payment destination types recognized by the database registry.
 */
export type RegistryDestinationType = 'VPA' | 'URL' | 'ACCOUNT';

/**
 * Strongly typed trusted destination record returned by the Supabase registry adapter.
 * Contains only the fields required by the verification engine.
 */
export interface TrustedRegistryDestination {
  /** Identifier of the merchant owning this destination */
  merchantId: string;
  /** Destination protocol type */
  destinationType: RegistryDestinationType;
  /** Canonical destination string value */
  destinationValue: string;
  /** Active status flag */
  isActive: boolean;
}

/**
 * Strongly typed reference QR record returned by the Supabase registry adapter.
 */
export interface ReferenceQrRecord {
  /** Identifier of the reference QR record */
  id: string;
  /** Identifier of the merchant owning this reference QR */
  merchantId: string;
  /** Storage path inside the private reference-qrs bucket */
  storagePath: string;
  /** SHA-256 hash of the decoded payload */
  payloadHash: string;
  /** Raw decoded string payload */
  rawPayload: string;
  /** Optional finder coordinates extracted by the QR decoder */
  finderCoordinates?: unknown;
  /** ISO timestamp when the reference QR was uploaded */
  uploadedAt: string;
}
