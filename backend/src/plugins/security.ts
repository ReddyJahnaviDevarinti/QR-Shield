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
 * Resolves the trusted client IP address for rate limiting and request tracking.
 *
 * Security & Environment Model:
 * 1. Outside Render (isRender=false, e.g. local dev, CI/CD, self-hosted):
 *    All proxy headers (CF-Connecting-IP, X-Forwarded-For) are untrusted and ignored.
 *    Returns req.ip directly from the TCP socket to prevent client header spoofing.
 *
 * 2. On Render (isRender=true / RENDER=true):
 *    Under Render's production architecture, all public HTTP traffic terminates at Render's
 *    Cloudflare edge reverse proxies. Cloudflare sanitizes and overwrites the authoritative
 *    'CF-Connecting-IP' header with the real visitor IP.
 *
 *    - CF-Connecting-IP: If present, must be a single syntactically valid IPv4 or IPv6 address (net.isIP).
 *      Returns the validated IP string.
 *    - X-Forwarded-For: NEVER parsed or trusted to invent a client identity. Private/public IP
 *      classification alone cannot establish which proxy added each entry in an unverified chain,
 *      and Cloudflare's public proxy IPs in XFF prevent reliable traversal.
 *    - Fallback: If CF-Connecting-IP is absent or malformed on Render, returns null to signal
 *      an unverified ingress state. Callers (such as public verification endpoints) must implement
 *      an explicit, safe degraded response (e.g. HTTP 503) rather than guessing or silently
 *      collapsing all clients into an unverified socket IP.
 */
export function resolveClientIp(
  req: FastifyRequest,
  isRender: boolean = env.IS_RENDER,
): string | null {
  if (!isRender) {
    return req.ip;
  }

  const rawCf = req.headers['cf-connecting-ip'];
  // Reject array-form headers (duplicate/multiple CF-Connecting-IP headers) as ambiguous
  if (typeof rawCf !== 'string') {
    return null;
  }

  const trimmed = rawCf.trim();
  // Reject comma-separated duplicate/multiple values and validate strict IP syntax
  if (trimmed.length > 0 && !trimmed.includes(',') && net.isIP(trimmed) !== 0) {
    return trimmed;
  }

  return null;
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
        const clientIp =
          resolveClientIp(req, req.server.rateLimitConfig?.isRender) ?? 'unresolved';
        return merchantId ? `merchant:${merchantId}:${clientIp}` : clientIp;
      },
    });
  }
}

export const securityPlugin = fp(securityPluginImpl, {
  name: 'securityPlugin',
});
