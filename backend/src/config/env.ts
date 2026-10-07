import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Safely load .env from current directory or backend/.env
const candidatePaths = ['.env', 'backend/.env', '../backend/.env'];
for (const envPath of candidatePaths) {
  try {
    if (existsSync(envPath)) {
      process.loadEnvFile?.(resolve(envPath));
      break;
    }
  } catch {
    // Runtime environment variables take precedence
  }
}

export interface EnvironmentConfig {
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  ALLOWED_ORIGINS: string[];
  HOST: string;
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  GEMINI_API_KEY?: string;
  GEMINI_TIMEOUT_MS: number;
}

function parsePort(val: string | undefined, defaultPort: number): number {
  if (!val) return defaultPort;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed) || parsed <= 0 || parsed > 65535) {
    return defaultPort;
  }
  return parsed;
}

function parseTimeout(val: string | undefined, defaultMs: number): number {
  if (!val) return defaultMs;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed) || parsed <= 0) {
    return defaultMs;
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

const supabaseUrl =
  process.env['SUPABASE_URL']?.trim() ||
  (nodeEnv === 'test' ? 'https://test-placeholder.supabase.co' : '');

if (!supabaseUrl) {
  throw new Error('Missing required environment variable: SUPABASE_URL.');
}

const supabaseSecretKey =
  process.env['SUPABASE_SECRET_KEY']?.trim() ||
  (nodeEnv === 'test' ? 'sb_secret_test_placeholder' : '');

if (!supabaseSecretKey) {
  throw new Error('Missing required environment variable: SUPABASE_SECRET_KEY.');
}

const geminiApiKey =
  nodeEnv === 'test'
    ? process.env['TEST_GEMINI_API_KEY']?.trim() || undefined
    : process.env['GEMINI_API_KEY']?.trim() || undefined;

export const env: EnvironmentConfig = {
  PORT: parsePort(process.env['PORT'], 8000),
  NODE_ENV: nodeEnv,
  ALLOWED_ORIGINS: parseAllowedOrigins(process.env['ALLOWED_ORIGINS'], nodeEnv),
  HOST: process.env['HOST'] || '0.0.0.0',
  SUPABASE_URL: supabaseUrl,
  SUPABASE_SECRET_KEY: supabaseSecretKey,
  GEMINI_API_KEY: geminiApiKey,
  GEMINI_TIMEOUT_MS: parseTimeout(process.env['GEMINI_TIMEOUT_MS'], 2000),
};
