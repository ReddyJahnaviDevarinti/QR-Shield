import crypto from 'node:crypto';
import net from 'node:net';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import { env } from '../config/env.js';

export interface RateLimitPluginOptions {
  enabled?: boolean;
  verifyMax?: number;
  merchantMax?: number;
  defaultMax?: number;
  timeWindowMs?: number;
  isRender?: boolean;
}

export interface SecurityPluginOptions {
  rateLimit?: RateLimitPluginOptions;
}

declare module 'fastify' {
  interface FastifyInstance {
    rateLimitConfig: Required<RateLimitPluginOptions>;
  }
}

/**
 * Resolves the effective client IP address for rate limiting.
 *
 * Security & Environment Policy:
 * - On Render (RENDER=true or isRender=true), services run behind Cloudflare/Render proxy infrastructure.
 *   The CF-Connecting-IP header is trusted ONLY under explicit Render environment configuration AND
 *   when it contains a single syntactically valid IPv4 or IPv6 address verified via Node's net.isIP().
 * - Outside the Render environment (e.g. local dev, testing, on-prem), CF-Connecting-IP is NOT trusted,
 *   preventing client header spoofing.
 * - X-Forwarded-For is NEVER trusted.
 * - Fastify trustProxy remains false (no numeric hop or arbitrary proxy trust).
 * - Safe Fallback: When CF-Connecting-IP is absent or invalid on Render, falls back to req.ip.
 *   Limitation: Under fallback on Render, requests map to the upstream proxy socket IP.
 */
export function resolveClientIp(
  req: FastifyRequest,
  isRender: boolean = env.IS_RENDER,
): string {
  if (isRender) {
    const cfConnectingIp = req.headers['cf-connecting-ip'];
    if (typeof cfConnectingIp === 'string') {
      const trimmed = cfConnectingIp.trim();
      if (trimmed.length > 0 && net.isIP(trimmed) !== 0) {
        return trimmed;
      }
    }
  }
  return req.ip;
}

async function securityPluginImpl(
  app: FastifyInstance,
  opts?: SecurityPluginOptions,
): Promise<void> {
  // Security headers via Helmet
  await app.register(helmet, {
    contentSecurityPolicy: env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: false,
  });

  // Strict CORS policy
  await app.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, health checks)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (env.ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }

      const corsError = new Error('Not allowed by CORS');
      (corsError as unknown as { statusCode: number }).statusCode = 403;
      (corsError as unknown as { name: string }).name = 'Forbidden';
      callback(corsError, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Rate Limiting Configuration
  const rateLimitOpts = opts?.rateLimit ?? {};
  const rateLimitEnabled = rateLimitOpts.enabled ?? env.RATE_LIMIT_ENABLED;

  const resolvedRateLimitConfig: Required<RateLimitPluginOptions> = {
    enabled: rateLimitEnabled,
    verifyMax: rateLimitOpts.verifyMax ?? env.RATE_LIMIT_VERIFY_MAX,
    merchantMax: rateLimitOpts.merchantMax ?? env.RATE_LIMIT_MERCHANT_MAX,
    defaultMax: rateLimitOpts.defaultMax ?? 100,
    timeWindowMs: rateLimitOpts.timeWindowMs ?? env.RATE_LIMIT_WINDOW_MS,
    isRender: rateLimitOpts.isRender ?? env.IS_RENDER,
  };

  if (!app.hasDecorator('rateLimitConfig')) {
    app.decorate('rateLimitConfig', resolvedRateLimitConfig);
  }

  if (rateLimitEnabled) {
    await app.register(rateLimit, {
      global: true,
      max: (req) => {
        return req.server.rateLimitConfig?.defaultMax ?? 100;
      },
      timeWindow: (req) => {
        return req.server.rateLimitConfig?.timeWindowMs ?? 60000;
      },
      errorResponseBuilder: (_req, context) => {
        const retryAfterSec = Math.ceil(context.ttl / 1000);
        return {
          statusCode: 429,
          error: {
            code: 'E_RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please slow down and try again shortly.',
            details: `Quota of ${context.max} requests exceeded. Please retry after ${retryAfterSec} seconds.`,
          },
        };
      },
      keyGenerator: (req) => {
        const merchantId = (req.params as { merchantId?: string })?.merchantId;
        const authHeader = req.headers.authorization;
        if (
          authHeader &&
          typeof authHeader === 'string' &&
          authHeader.startsWith('Bearer ')
        ) {
          const token = authHeader.slice(7).trim();
          if (token) {
            const tokenHash = crypto
              .createHash('sha256')
              .update(token)
              .digest('hex')
              .slice(0, 16);
            return merchantId
              ? `merchant:${merchantId}:${tokenHash}`
              : `auth:${tokenHash}`;
          }
        }
        const clientIp = resolveClientIp(req, req.server.rateLimitConfig?.isRender);
        return merchantId ? `merchant:${merchantId}:${clientIp}` : clientIp;
      },
    });
  }
}

export const securityPlugin = fp(securityPluginImpl, {
  name: 'securityPlugin',
});
