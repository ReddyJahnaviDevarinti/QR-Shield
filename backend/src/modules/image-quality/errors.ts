export type ImageQualityErrorCode =
  'E_INVALID_IMAGE' | 'E_IMAGE_TOO_LARGE' | 'E_IMAGE_ANALYSIS_FAILED';

/**
 * Base controlled error class for image quality analysis failures.
 * Ensures no stack traces, raw buffers, or internal file paths leak to callers.
 */
export class ImageQualityError extends Error {
  public readonly code: ImageQualityErrorCode;
  public readonly statusCode: number;

  constructor(code: ImageQualityErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = 'ImageQualityError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(): {
    error: { code: ImageQualityErrorCode; message: string; statusCode: number };
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

export class InvalidImageError extends ImageQualityError {
  constructor(message = 'The provided buffer is empty or not a valid supported image.') {
    super('E_INVALID_IMAGE', message, 400);
  }
}

export class ImageTooLargeError extends ImageQualityError {
  constructor(message = 'Image buffer size exceeds maximum permitted limit of 10 MB.') {
    super('E_IMAGE_TOO_LARGE', message, 400);
  }
}

export class ImageAnalysisFailedError extends ImageQualityError {
  constructor(message = 'Failed to analyze image quality.') {
    super('E_IMAGE_ANALYSIS_FAILED', message, 422);
  }
}
