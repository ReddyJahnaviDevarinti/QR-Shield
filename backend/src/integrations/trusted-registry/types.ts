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
