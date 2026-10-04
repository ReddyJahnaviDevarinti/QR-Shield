export type PaymentParserErrorCode =
  | 'E_EMPTY_PAYLOAD'
  | 'E_MALFORMED_URI'
  | 'E_INVALID_UPI_PAYLOAD'
  | 'E_AMBIGUOUS_PARAMETER'
  | 'E_INVALID_AMOUNT'
  | 'E_INVALID_CURRENCY'
  | 'E_INVALID_MCC';

/**
 * Base controlled error for payment payload parsing failures.
 */
export class PaymentParserError extends Error {
  public readonly code: PaymentParserErrorCode;
  public readonly statusCode: number;

  constructor(code: PaymentParserErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = 'PaymentParserError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(): {
    error: { code: PaymentParserErrorCode; message: string; statusCode: number };
  } {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
      },
    };
  }
}

export class EmptyPayloadError extends PaymentParserError {
  constructor(message = 'QR payload string cannot be empty or whitespace only.') {
    super('E_EMPTY_PAYLOAD', message, 400);
  }
}

export class MalformedUriError extends PaymentParserError {
  constructor(
    message = 'The payload contains a malformed URI or invalid percent-encoding.',
  ) {
    super('E_MALFORMED_URI', message, 400);
  }
}

export class InvalidUpiPayloadError extends PaymentParserError {
  constructor(
    message = 'Invalid UPI URI structure or missing mandatory payment destination ("pa").',
  ) {
    super('E_INVALID_UPI_PAYLOAD', message, 400);
  }
}

export class AmbiguousParameterError extends PaymentParserError {
  constructor(paramName: string) {
    super(
      'E_AMBIGUOUS_PARAMETER',
      `Ambiguous duplicate security-sensitive parameter detected: "${paramName}".`,
      400,
    );
  }
}

export class InvalidAmountError extends PaymentParserError {
  constructor(
    message = 'Invalid transaction amount. Must be a positive decimal number with up to 2 decimal places.',
  ) {
    super('E_INVALID_AMOUNT', message, 400);
  }
}

export class InvalidCurrencyError extends PaymentParserError {
  constructor(
    message = 'Invalid currency code. Must be a 3-letter alphabetic ISO code (e.g. INR).',
  ) {
    super('E_INVALID_CURRENCY', message, 400);
  }
}

export class InvalidMccError extends PaymentParserError {
  constructor(
    message = 'Invalid Merchant Category Code (MCC). Must be a 4-digit numeric code.',
  ) {
    super('E_INVALID_MCC', message, 400);
  }
}
