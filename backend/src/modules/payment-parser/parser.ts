import {
  AmbiguousParameterError,
  EmptyPayloadError,
  InvalidAmountError,
  InvalidCurrencyError,
  InvalidMccError,
  InvalidUpiPayloadError,
  MalformedUriError,
  PaymentParserError,
} from './errors.js';
import {
  ParsedGenericUrlPayload,
  ParsedPaymentPayload,
  ParsedTextPayload,
  ParsedUpiPayload,
} from './types.js';

/**
 * Security-critical query parameters where duplicates cause ambiguity
 * and must be strictly rejected.
 */
const SECURITY_SENSITIVE_PARAMS: ReadonlySet<string> = new Set([
  'pa', // Payee Address / VPA
  'am', // Transaction Amount
  'cu', // Currency
  'pn', // Payee Name
  'mc', // Merchant Category Code
]);

/**
 * Deterministically parses a raw string payload decoded from a QR code into
 * a strongly typed representation (UPI_URI, GENERIC_URL, or TEXT).
 *
 * Purity & Determinism Guarantee:
 * - Pure CPU string parsing only; never performs I/O, network requests, or database queries.
 * - Does not determine if a merchant/VPA is legitimate or trusted (that is the domain of verification).
 *
 * @param rawPayload - Raw string payload extracted from the QR code.
 * @returns Strongly typed ParsedPaymentPayload.
 * @throws PaymentParserError on malformed, ambiguous, or invalid data.
 */
export function parsePaymentPayload(rawPayload: string): ParsedPaymentPayload {
  // 1. Guard against non-string and empty inputs
  if (typeof rawPayload !== 'string') {
    throw new EmptyPayloadError('Payload must be a string.');
  }

  const trimmed = rawPayload.trim();
  if (trimmed.length === 0) {
    throw new EmptyPayloadError('QR payload string cannot be empty or whitespace only.');
  }

  // 2. Identify UPI Payment URIs (upi://pay?...)
  if (trimmed.toLowerCase().startsWith('upi:')) {
    return parseUpiPayload(trimmed, rawPayload);
  }

  // 3. Identify Generic Web URLs (http:// or https://)
  const genericUrl = tryParseGenericUrl(trimmed, rawPayload);
  if (genericUrl) {
    return genericUrl;
  }

  // 4. Default: Unstructured plain text payload
  const textPayload: ParsedTextPayload = {
    format: 'TEXT',
    rawPayload,
  };
  return textPayload;
}

/**
 * Parses and strictly validates a UPI payment URI.
 */
function parseUpiPayload(trimmed: string, rawPayload: string): ParsedUpiPayload {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch (err) {
    throw new MalformedUriError(
      `Malformed UPI URI: ${err instanceof Error ? err.message : 'Invalid URI syntax'}`,
    );
  }

  // Verify the scheme is strictly 'upi:'
  if (parsedUrl.protocol.toLowerCase() !== 'upi:') {
    throw new MalformedUriError('URI scheme must be "upi:".');
  }

  // Action/path must identify 'pay' (e.g. upi://pay or upi:pay)
  const action = (parsedUrl.hostname || parsedUrl.pathname)
    .replace(/^\/+/, '')
    .toLowerCase();

  if (action !== 'pay') {
    throw new InvalidUpiPayloadError(
      `Invalid UPI action "${action}". Only payment actions ("upi://pay") are supported.`,
    );
  }

  // Extract query parameters case-insensitively and collect all occurrences
  const paramMap = new Map<string, string[]>();
  try {
    // Validate percent-encoding integrity across query string
    decodeURI(parsedUrl.search);

    for (const [key, value] of parsedUrl.searchParams.entries()) {
      const normKey = key.toLowerCase().trim();
      const list = paramMap.get(normKey) ?? [];
      list.push(value);
      paramMap.set(normKey, list);
    }
  } catch (err) {
    if (err instanceof PaymentParserError) {
      throw err;
    }
    throw new MalformedUriError(
      `Failed to parse query parameters: ${err instanceof Error ? err.message : 'Invalid encoding'}`,
    );
  }

  // Guard against ambiguous duplicates in security-sensitive parameters
  for (const secParam of SECURITY_SENSITIVE_PARAMS) {
    const occurrences = paramMap.get(secParam);
    if (occurrences && occurrences.length > 1) {
      throw new AmbiguousParameterError(secParam);
    }
  }

  /**
   * Deterministic duplicate rule for non-security parameters:
   * First occurrence is used; subsequent duplicates are safely ignored.
   */
  const getParam = (name: string): string | null => {
    const values = paramMap.get(name.toLowerCase());
    if (!values || values.length === 0) return null;
    const first = values[0]?.trim();
    return first && first.length > 0 ? first : null;
  };

  // 1. Payee Address (pa) — Canonical destination; mandatory
  const rawPa = getParam('pa');
  if (!rawPa) {
    throw new InvalidUpiPayloadError(
      'Missing mandatory UPI payment destination address ("pa").',
    );
  }

  const paymentAddress = rawPa.toLowerCase();
  if (
    !paymentAddress.includes('@') ||
    paymentAddress.startsWith('@') ||
    paymentAddress.endsWith('@') ||
    paymentAddress.split('@').length !== 2
  ) {
    throw new InvalidUpiPayloadError(
      `Invalid UPI Virtual Payment Address format "${paymentAddress}". Expected format "user@handle".`,
    );
  }

  // 2. Payee Name (pn) — Optional
  const payeeName = getParam('pn');

  // 3. Transaction Amount (am) — Optional, but if present must be positive decimal
  const rawAm = getParam('am');
  let amount: string | null = null;
  if (rawAm !== null) {
    if (!/^\d+(\.\d{1,2})?$/.test(rawAm) || Number(rawAm) <= 0) {
      throw new InvalidAmountError(
        `Invalid transaction amount "${rawAm}". Must be a positive decimal number with up to 2 decimal places.`,
      );
    }
    amount = rawAm;
  }

  // 4. Currency (cu) — Optional, defaults to 'INR'
  const rawCu = getParam('cu');
  let currency = 'INR';
  if (rawCu !== null) {
    const normCu = rawCu.toUpperCase();
    if (!/^[A-Z]{3}$/.test(normCu)) {
      throw new InvalidCurrencyError(
        `Invalid currency code "${rawCu}". Must be a 3-letter alphabetic currency code (e.g. INR).`,
      );
    }
    currency = normCu;
  }

  // 5. Merchant Category Code (mc) — Optional, 4-digit code
  const rawMc = getParam('mc');
  let merchantCategoryCode: string | null = null;
  if (rawMc !== null) {
    if (!/^\d{4}$/.test(rawMc)) {
      throw new InvalidMccError(
        `Invalid Merchant Category Code "${rawMc}". Must be a 4-digit numeric code.`,
      );
    }
    merchantCategoryCode = rawMc;
  }

  // 6. Mode, Url, RefUrl — Optional
  const mode = getParam('mode');
  const url = getParam('url');
  const refUrl = getParam('refurl') ?? getParam('ref_url');

  return {
    format: 'UPI_URI',
    rawPayload,
    paymentAddress,
    payeeName,
    amount,
    merchantCategoryCode,
    currency,
    mode,
    url,
    refUrl,
  };
}

/**
 * Attempts to parse payload as a generic HTTP or HTTPS URL.
 */
function tryParseGenericUrl(
  trimmed: string,
  rawPayload: string,
): ParsedGenericUrlPayload | null {
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return {
        format: 'GENERIC_URL',
        rawPayload,
        url: trimmed,
      };
    }
    return null;
  } catch {
    return null;
  }
}
