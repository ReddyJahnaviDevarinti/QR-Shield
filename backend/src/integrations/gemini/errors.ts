/**
 * Base error class for Gemini explanation module.
 */
export class GeminiExplanationError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'GeminiExplanationError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when the Gemini API request times out (e.g., > 5000 ms).
 */
export class GeminiTimeoutError extends GeminiExplanationError {
  constructor(timeoutMs: number) {
    super(
      'E_GEMINI_TIMEOUT',
      `Gemini explanation request timed out after ${timeoutMs} ms.`,
    );
    this.name = 'GeminiTimeoutError';
  }
}

/**
 * Thrown when the Gemini model output is malformed or violates the required JSON schema.
 */
export class GeminiMalformedOutputError extends GeminiExplanationError {
  constructor(details: string) {
    super(
      'E_GEMINI_MALFORMED_OUTPUT',
      `Gemini explanation output was malformed: ${details}`,
    );
    this.name = 'GeminiMalformedOutputError';
  }
}

/**
 * Thrown when Gemini is unconfigured (missing GEMINI_API_KEY).
 */
export class GeminiNotConfiguredError extends GeminiExplanationError {
  constructor() {
    super(
      'E_GEMINI_NOT_CONFIGURED',
      'GEMINI_API_KEY is not configured in the environment.',
    );
    this.name = 'GeminiNotConfiguredError';
  }
}
