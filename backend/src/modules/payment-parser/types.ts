/**
 * Discriminated format identifiers for decoded QR payloads.
 */
export type PaymentPayloadFormat = 'UPI_URI' | 'GENERIC_URL' | 'TEXT';

/**
 * Structured representation of a parsed UPI payment URI (upi://pay?...)
 */
export interface ParsedUpiPayload {
  format: 'UPI_URI';
  rawPayload: string;
  /** Canonical payment destination address (normalized to lowercase) */
  paymentAddress: string;
  /** Verified/display payee name if present in QR */
  payeeName: string | null;
  /** Transaction amount preserved as exact string to avoid floating-point errors */
  amount: string | null;
  /** 4-digit Merchant Category Code */
  merchantCategoryCode: string | null;
  /** 3-letter currency code, defaulting to 'INR' if omitted */
  currency: string;
  /** Transaction mode (e.g. '02' for static QR) */
  mode: string | null;
  /** Transaction reference or merchant URL */
  url: string | null;
  /** Reference URL parameter */
  refUrl: string | null;
}

/**
 * Structured representation of a standard HTTP/HTTPS web address.
 */
export interface ParsedGenericUrlPayload {
  format: 'GENERIC_URL';
  rawPayload: string;
  url: string;
}

/**
 * Structured representation of arbitrary text or non-payment payload.
 */
export interface ParsedTextPayload {
  format: 'TEXT';
  rawPayload: string;
}

/**
 * Union type of all valid parsed payment payloads.
 */
export type ParsedPaymentPayload =
  ParsedUpiPayload | ParsedGenericUrlPayload | ParsedTextPayload;
