import crypto from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { supabaseServer } from '../integrations/supabase/client.js';
import { resolveClientIp } from './security.js';

export interface AuthenticatedMerchantContext {
  userId: string;
  merchantId: string;
}

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Shared rate limit configuration for merchant routes:
 * 100 requests per minute per authenticated user or tenant.
 */
export const merchantRateLimitConfig = {
  config: {
    rateLimit: {
      max: (req: FastifyRequest) => req.server.rateLimitConfig?.merchantMax ?? 100,
      timeWindow: (req: FastifyRequest) =>
        req.server.rateLimitConfig?.timeWindowMs ?? 60000,
      keyGenerator: (req: FastifyRequest) => {
        const merchantId =
          (req.params as { merchantId?: string })?.merchantId || 'unknown';
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
            return `merchant:${merchantId}:${tokenHash}`;
          }
        }
        const clientIp = resolveClientIp(req, req.server.rateLimitConfig?.isRender);
        return `merchant:${merchantId}:${clientIp}`;
      },
    },
  },
};

/**
 * Authenticates the caller via Supabase Auth bearer token and authorizes
 * that the authenticated user owns the requested merchant profile.
 *
 * Safety Invariants:
 * - Must be called BEFORE any privileged database read/write or Storage operation.
 * - Rejects unauthenticated callers with 401 E_UNAUTHORIZED.
 * - Rejects non-owners with 403 E_FORBIDDEN without leaking merchant details.
 * - Rejects non-existent merchants with 404 E_MERCHANT_NOT_FOUND.
 */
export async function authenticateAndAuthorizeMerchant(
  request: FastifyRequest,
  reply: FastifyReply,
  merchantId: string,
): Promise<AuthenticatedMerchantContext | null> {
  const authHeader = request.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    reply.status(401).send({
      error: {
        code: 'E_UNAUTHORIZED',
        message: 'Missing Authorization header. Bearer token required.',
      },
    });
    return null;
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer' || !parts[1]) {
    reply.status(401).send({
      error: {
        code: 'E_UNAUTHORIZED',
        message: 'Malformed Authorization header. Format: Bearer <token>.',
      },
    });
    return null;
  }

  const token = parts[1];

  let authenticatedUserId: string;
  try {
    const { data: userData, error: authError } = await supabaseServer.auth.getUser(token);
    if (authError || !userData?.user?.id) {
      reply.status(401).send({
        error: {
          code: 'E_UNAUTHORIZED',
          message: 'Invalid or expired authentication token.',
        },
      });
      return null;
    }
    authenticatedUserId = userData.user.id;
  } catch {
    reply.status(401).send({
      error: {
        code: 'E_UNAUTHORIZED',
        message: 'Authentication failed.',
      },
    });
    return null;
  }

  const trimmedMerchantId = merchantId.trim();
  if (!UUID_REGEX.test(trimmedMerchantId)) {
    reply.status(404).send({
      error: {
        code: 'E_MERCHANT_NOT_FOUND',
        message: 'Merchant profile not found.',
      },
    });
    return null;
  }

  try {
    const { data: merchantData, error: merchantError } = await supabaseServer
      .from('merchants')
      .select('id, user_id')
      .eq('id', trimmedMerchantId)
      .maybeSingle();

    if (merchantError) {
      request.log.error(
        { err: merchantError },
        'Database error resolving merchant profile',
      );
      reply.status(500).send({
        error: {
          code: 'E_DATABASE_ERROR',
          message: 'Failed to verify merchant ownership.',
        },
      });
      return null;
    }

    if (!merchantData) {
      reply.status(404).send({
        error: {
          code: 'E_MERCHANT_NOT_FOUND',
          message: 'Merchant profile not found.',
        },
      });
      return null;
    }

    const row = merchantData as { id: string; user_id: string };
    if (row.user_id !== authenticatedUserId) {
      reply.status(403).send({
        error: {
          code: 'E_FORBIDDEN',
          message: 'Caller does not own this merchant profile.',
        },
      });
      return null;
    }

    return {
      userId: authenticatedUserId,
      merchantId: row.id,
    };
  } catch (err: unknown) {
    request.log.error({ err }, 'Unexpected error resolving merchant profile');
    reply.status(500).send({
      error: {
        code: 'E_INTERNAL_ERROR',
        message: 'Internal error resolving merchant ownership.',
      },
    });
    return null;
  }
}
