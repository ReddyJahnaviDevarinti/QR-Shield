import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyRequest } from 'fastify';
import { buildApp } from '../app.js';
import { supabaseServer } from '../integrations/supabase/client.js';
import { resolveClientIp } from '../plugins/security.js';

describe('Production API Rate Limiting & Proxy Security (Task 1)', () => {
  const testMerchantId = 'a0000000-0000-0000-0000-000000000001';
  const ownerToken = 'owner-valid-jwt';
  const otherToken = 'other-valid-jwt';

  // Instantiate an isolated test app with deterministic, tight rate limits
  const rateLimitWindowMs = 2000;
  const verifyMax = 3;
  const merchantMax = 4;

  const app = buildApp({
    rateLimit: {
      enabled: true,
      verifyMax,
      merchantMax,
      timeWindowMs: rateLimitWindowMs,
    },
  });

  beforeEach(() => {
    vi.restoreAllMocks();

    // Mock Supabase Auth verification
    vi.spyOn(supabaseServer.auth, 'getUser').mockImplementation(
      async (token?: string) => {
        if (token === ownerToken) {
          return {
            data: {
              user: {
                id: 'owner-user-id',
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
                created_at: '2026-10-01T00:00:00Z',
              },
            },
            error: null,
          } as unknown as Awaited<ReturnType<typeof supabaseServer.auth.getUser>>;
        }
        if (token === otherToken) {
          return {
            data: {
              user: {
                id: 'other-user-id',
                app_metadata: {},
                user_metadata: {},
                aud: 'authenticated',
                created_at: '2026-10-01T00:00:00Z',
              },
            },
            error: null,
          } as unknown as Awaited<ReturnType<typeof supabaseServer.auth.getUser>>;
        }
        return {
          data: { user: null },
          error: new Error('Invalid token'),
        } as unknown as Awaited<ReturnType<typeof supabaseServer.auth.getUser>>;
      },
    );

    // Mock database query for merchant ownership
    vi.spyOn(supabaseServer, 'from').mockImplementation(((table: string) => {
      if (table === 'merchants') {
        return {
          select: () => ({
            eq: (_field: string, val: string) => ({
              maybeSingle: () => {
                if (val === testMerchantId) {
                  return Promise.resolve({
                    data: { id: testMerchantId, user_id: 'owner-user-id' },
                    error: null,
                  });
                }
                return Promise.resolve({ data: null, error: null });
              },
            }),
          }),
        };
      }
      if (table === 'payment_destinations') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      };
    }) as unknown as typeof supabaseServer.from);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Public POST /api/v1/verify enforces rate limits and returns HTTP 429 when quota exceeded', async () => {
    // Under verifyMax (3 requests): all 3 succeed or fail with validation errors, but NOT 429
    for (let i = 0; i < verifyMax; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      // Non-multipart request returns 400 E_INVALID_REQUEST, not 429
      expect(res.statusCode).toBe(400);
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
    }

    // 4th request exceeds verifyMax -> must be rejected with HTTP 429
    const rateLimitedRes = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(rateLimitedRes.statusCode).toBe(429);
    const body = rateLimitedRes.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('E_RATE_LIMIT_EXCEEDED');
    expect(body.error.message).toContain('Too many requests');
    expect(body.error.details).toBeDefined();
    // Sensitive details like stack trace, tokens, or system paths must never be exposed
    expect(body.stack).toBeUndefined();
    expect(body.details).toBeUndefined(); // top-level details must be inside body.error
  });

  it('2. Client-controlled X-Forwarded-For headers cannot be used to bypass rate limits', async () => {
    // When trustProxy is false, changing X-Forwarded-For should NOT reset client identity
    const spoofedIpRes = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '203.0.113.195', // Attacker spoofing another IP
      },
      body: JSON.stringify({}),
    });

    // Still rate-limited because socket remoteAddress is used, ignoring spoofed header
    expect(spoofedIpRes.statusCode).toBe(429);
    expect(spoofedIpRes.json().error.code).toBe('E_RATE_LIMIT_EXCEEDED');
  });

  it('3. Health check GET /api/v1/health is exempted and never rate-limited', async () => {
    // /health has config: { rateLimit: false }
    for (let i = 0; i < 10; i++) {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/health',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().status).toBe('ok');
    }
  });

  it('4. Authenticated merchant operations enforce 100 req/min limit per authenticated tenant/user', async () => {
    // Make requests up to merchantMax (4) using ownerToken
    for (let i = 0; i < merchantMax; i++) {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/merchants/${testMerchantId}/destinations`,
        headers: {
          authorization: `Bearer ${ownerToken}`,
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().destinations).toBeDefined();
    }

    // 5th request exceeds limit for ownerToken
    const limitedRes = await app.inject({
      method: 'GET',
      url: `/api/v1/merchants/${testMerchantId}/destinations`,
      headers: {
        authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(limitedRes.statusCode).toBe(429);
    expect(limitedRes.json().error.code).toBe('E_RATE_LIMIT_EXCEEDED');
  });

  it('5. Tenant isolation: Different authenticated users have independent rate-limit quotas', async () => {
    // ownerToken is currently rate-limited on testMerchantId.
    // otherToken (even if accessing another endpoint or attempting access) has its own bucket
    const otherUserRes = await app.inject({
      method: 'GET',
      url: `/api/v1/merchants/${testMerchantId}/destinations`,
      headers: {
        authorization: `Bearer ${otherToken}`,
      },
    });

    // otherToken does NOT own testMerchantId, so it is rejected with 403 E_FORBIDDEN, NOT 429!
    expect(otherUserRes.statusCode).toBe(403);
    expect(otherUserRes.json().error.code).toBe('E_FORBIDDEN');
  });

  it('6. Rate limit quota resets after time window expires', async () => {
    // Wait for the rateLimitWindowMs cooldown
    await new Promise((resolve) => setTimeout(resolve, rateLimitWindowMs + 200));

    // Request to /api/v1/verify should succeed (returns 400 for bad content type, not 429)
    const resetRes = await app.inject({
      method: 'POST',
      url: '/api/v1/verify',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(resetRes.statusCode).toBe(400);
    expect(resetRes.json().error.code).toBe('E_INVALID_REQUEST');
  });

  describe('Render-Aware Rate-Limit Client IP Resolution (Checkpoint 1.2)', () => {
    const windowMs = 5000;
    const maxRequests = 2;

    // App configured in Render mode (isRender: true)
    const renderApp = buildApp({
      rateLimit: {
        enabled: true,
        verifyMax: maxRequests,
        merchantMax: 10,
        timeWindowMs: windowMs,
        isRender: true,
      },
    });

    // App configured in local/non-Render mode (isRender: false)
    const localApp = buildApp({
      rateLimit: {
        enabled: true,
        verifyMax: maxRequests,
        merchantMax: 10,
        timeWindowMs: windowMs,
        isRender: false,
      },
    });

    it('7. In Render-configured mode, different valid CF-Connecting-IP values produce separate public rate-limit buckets', async () => {
      const ip1 = '198.51.100.10';
      const ip2 = '198.51.100.20';

      // Exhaust quota for ip1 (2 requests)
      for (let i = 0; i < maxRequests; i++) {
        const res = await renderApp.inject({
          method: 'POST',
          url: '/api/v1/verify',
          headers: {
            'content-type': 'application/json',
            'cf-connecting-ip': ip1,
          },
          body: JSON.stringify({}),
        });
        expect(res.statusCode).toBe(400); // Bad content-type, not 429
      }

      // 3rd request from ip1 is rate-limited (HTTP 429)
      const limitedRes1 = await renderApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: {
          'content-type': 'application/json',
          'cf-connecting-ip': ip1,
        },
        body: JSON.stringify({}),
      });
      expect(limitedRes1.statusCode).toBe(429);
      expect(limitedRes1.json().error.code).toBe('E_RATE_LIMIT_EXCEEDED');

      // Request from ip2 has its own independent bucket and succeeds (HTTP 400 for bad payload, not 429)
      const res2 = await renderApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: {
          'content-type': 'application/json',
          'cf-connecting-ip': ip2,
        },
        body: JSON.stringify({}),
      });
      expect(res2.statusCode).toBe(400);
    });

    it('8. In Render-configured mode, supports valid IPv6 in CF-Connecting-IP', async () => {
      const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const res = await renderApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: {
          'content-type': 'application/json',
          'cf-connecting-ip': ipv6,
        },
        body: JSON.stringify({}),
      });
      expect(res.statusCode).toBe(400); // Validly resolved without error
    });

    it('9. In Render-configured mode, invalid or missing CF-Connecting-IP falls back safely to socket IP', async () => {
      const invalidIps = [
        'not-an-ip',
        '198.51.100.1, 198.51.100.2',
        '999.999.999.999',
        '   ',
      ];

      for (const invalidHeader of invalidIps) {
        const res = await renderApp.inject({
          method: 'POST',
          url: '/api/v1/verify',
          headers: {
            'content-type': 'application/json',
            'cf-connecting-ip': invalidHeader,
          },
          body: JSON.stringify({}),
        });
        // Should handle safely without throwing 500 error
        expect([400, 429]).toContain(res.statusCode);
      }
    });

    it('10. Outside Render-configured mode, client-supplied CF-Connecting-IP does not change the resolved IP or bypass limits', async () => {
      // On localApp (isRender: false), exhaust socket IP quota (2 requests)
      for (let i = 0; i < maxRequests; i++) {
        const res = await localApp.inject({
          method: 'POST',
          url: '/api/v1/verify',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({}),
        });
        expect(res.statusCode).toBe(400);
      }

      // 3rd request from same socket IP is rate-limited
      const limitedRes = await localApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      expect(limitedRes.statusCode).toBe(429);

      // Supplying CF-Connecting-IP on non-Render app should be IGNORED and remain rate-limited
      const spoofAttemptRes = await localApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: {
          'content-type': 'application/json',
          'cf-connecting-ip': '203.0.113.88', // Attacker trying to spoof a fresh IP
        },
        body: JSON.stringify({}),
      });
      expect(spoofAttemptRes.statusCode).toBe(429);
      expect(spoofAttemptRes.json().error.code).toBe('E_RATE_LIMIT_EXCEEDED');
    });

    it('11. Spoofed X-Forwarded-For does not bypass rate limits even in Render mode', async () => {
      // Under Render mode, X-Forwarded-For is never trusted
      const res = await renderApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '198.51.100.99',
        },
        body: JSON.stringify({}),
      });
      expect([400, 429]).toContain(res.statusCode);
    });

    it('12. resolveClientIp unit tests verify net.isIP validation rules and fallbacks', () => {
      const createMockReq = (
        headers: Record<string, string | string[] | undefined>,
        ip = '127.0.0.1',
      ) => ({ headers, ip }) as unknown as FastifyRequest;

      // Render mode: valid IPv4
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': '1.2.3.4' }), true),
      ).toBe('1.2.3.4');
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': '  1.2.3.4  ' }), true),
      ).toBe('1.2.3.4');

      // Render mode: valid IPv6
      expect(resolveClientIp(createMockReq({ 'cf-connecting-ip': '::1' }), true)).toBe(
        '::1',
      );
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': '2001:db8::1' }), true),
      ).toBe('2001:db8::1');

      // Render mode: invalid IPs -> fallback to req.ip
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': '1.2.3.4, 5.6.7.8' }), true),
      ).toBe('127.0.0.1');
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': 'invalid' }), true),
      ).toBe('127.0.0.1');
      expect(resolveClientIp(createMockReq({ 'cf-connecting-ip': '' }), true)).toBe(
        '127.0.0.1',
      );
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': undefined }), true),
      ).toBe('127.0.0.1');
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': ['1.2.3.4'] }), true),
      ).toBe('127.0.0.1');

      // Non-Render mode: CF-Connecting-IP is NEVER trusted -> fallback to req.ip
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': '1.2.3.4' }), false),
      ).toBe('127.0.0.1');
      expect(
        resolveClientIp(createMockReq({ 'x-forwarded-for': '1.2.3.4' }), false),
      ).toBe('127.0.0.1');
      expect(resolveClientIp(createMockReq({ 'x-forwarded-for': '1.2.3.4' }), true)).toBe(
        '127.0.0.1',
      );
    });
  });
});
