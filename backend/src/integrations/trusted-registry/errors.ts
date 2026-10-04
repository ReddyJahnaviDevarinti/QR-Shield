export type RegistryErrorCode = 'E_SUPABASE_NOT_CONFIGURED' | 'E_REGISTRY_QUERY_FAILED';

/**
 * Base controlled error for trusted registry database integration failures.
 */
export class RegistryError extends Error {
  public readonly code: RegistryErrorCode;
  public readonly statusCode: number;

  constructor(code: RegistryErrorCode, message: string, statusCode = 500) {
    super(message);
    this.name = 'RegistryError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(): {
    error: { code: RegistryErrorCode; message: string; statusCode: number };
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

export class SupabaseNotConfiguredError extends RegistryError {
  constructor(message = 'Supabase server integration is not configured.') {
    super('E_SUPABASE_NOT_CONFIGURED', message, 500);
  }
}

export class RegistryQueryFailedError extends RegistryError {
  constructor(message = 'Failed to retrieve trusted destination records from database.') {
    super('E_REGISTRY_QUERY_FAILED', message, 500);
  }
}
