try {
  process.loadEnvFile?.();
} catch {
  // .env file is optional; environment variables can be provided by the runtime environment
}

export interface EnvironmentConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  ALLOWED_ORIGINS: string[];
  HOST: string;
}

function parsePort(val: string | undefined, defaultPort: number): number {
  if (!val) return defaultPort;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed) || parsed <= 0 || parsed > 65535) {
    return defaultPort;
  }
  return parsed;
}

function parseAllowedOrigins(val: string | undefined, nodeEnv: string): string[] {
  if (!val) {
    return nodeEnv === 'production' ? [] : ['http://localhost:5173'];
  }
  const origins = val
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (nodeEnv !== 'production' && !origins.includes('http://localhost:5173')) {
    origins.push('http://localhost:5173');
  }

  return origins;
}

const nodeEnv = (process.env['NODE_ENV'] || 'development') as
  'development' | 'production' | 'test';

export const env: EnvironmentConfig = {
  PORT: parsePort(process.env['PORT'], 8000),
  NODE_ENV: nodeEnv,
  ALLOWED_ORIGINS: parseAllowedOrigins(process.env['ALLOWED_ORIGINS'], nodeEnv),
  HOST: process.env['HOST'] || '0.0.0.0',
};
