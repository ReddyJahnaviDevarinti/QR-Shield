export type QrDecoderErrorCode =
  'E_INVALID_IMAGE' | 'E_NO_QR_DETECTED' | 'E_DECODE_FAILED';

export class QrDecoderError extends Error {
  public readonly code: QrDecoderErrorCode;
  public readonly statusCode: number;

  constructor(code: QrDecoderErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = 'QrDecoderError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(): {
    error: { code: QrDecoderErrorCode; message: string; statusCode: number };
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

export class InvalidImageError extends QrDecoderError {
  constructor(message = 'The provided input is not a valid or supported image.') {
    super('E_INVALID_IMAGE', message, 400);
  }
}

export class NoQrDetectedError extends QrDecoderError {
  constructor(
    message = 'No readable QR code pattern was detected in the provided image.',
  ) {
    super('E_NO_QR_DETECTED', message, 422);
  }
}

export class DecodeFailedError extends QrDecoderError {
  constructor(
    message = 'QR matrix was detected but could not be error-corrected or decoded.',
  ) {
    super('E_DECODE_FAILED', message, 422);
  }
}
