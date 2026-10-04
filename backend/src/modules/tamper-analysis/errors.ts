export type TamperAnalysisErrorCode =
  | 'E_INVALID_REFERENCE_IMAGE'
  | 'E_INVALID_CANDIDATE_IMAGE'
  | 'E_REFERENCE_QR_NOT_DETECTED'
  | 'E_CANDIDATE_QR_NOT_DETECTED'
  | 'E_ALIGNMENT_FAILED'
  | 'E_COMPARISON_FAILED';

/**
 * Base controlled error for visual tamper analysis operations.
 * Protects internal implementation details, buffers, file paths, and stack traces.
 */
export class TamperAnalysisError extends Error {
  public readonly code: TamperAnalysisErrorCode;
  public readonly statusCode: number;

  constructor(code: TamperAnalysisErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = 'TamperAnalysisError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(): {
    error: { code: TamperAnalysisErrorCode; message: string; statusCode: number };
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

export class InvalidReferenceImageError extends TamperAnalysisError {
  constructor(
    message = 'The provided reference image buffer is empty, corrupt, or unsupported.',
  ) {
    super('E_INVALID_REFERENCE_IMAGE', message, 400);
  }
}

export class InvalidCandidateImageError extends TamperAnalysisError {
  constructor(
    message = 'The provided candidate image buffer is empty, corrupt, or unsupported.',
  ) {
    super('E_INVALID_CANDIDATE_IMAGE', message, 400);
  }
}

export class ReferenceQrNotDetectedError extends TamperAnalysisError {
  constructor(
    message = 'No readable QR code pattern was detected in the trusted reference image.',
  ) {
    super('E_REFERENCE_QR_NOT_DETECTED', message, 422);
  }
}

export class CandidateQrNotDetectedError extends TamperAnalysisError {
  constructor(
    message = 'No readable QR code pattern was detected in the candidate image.',
  ) {
    super('E_CANDIDATE_QR_NOT_DETECTED', message, 422);
  }
}

export class AlignmentFailedError extends TamperAnalysisError {
  constructor(
    message = 'Geometric alignment failed due to singular or degenerate corner coordinates.',
  ) {
    super('E_ALIGNMENT_FAILED', message, 422);
  }
}

export class ComparisonFailedError extends TamperAnalysisError {
  constructor(
    message = 'Failed to execute visual comparison between reference and candidate QR.',
  ) {
    super('E_COMPARISON_FAILED', message, 422);
  }
}
