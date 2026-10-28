import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyRequest } from 'fastify';
import { buildApp } from '../app.js';
import { supabaseServer } from '../integrations/supabase/client.js';
import { resolveClientIp } from '../plugins/security.js';

describe('Production API Rate Limiting & Proxy Security (Task 1 & 1.1)', () => {
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
    expect(body.details).toBeUndefined();
  });

  it('2. Client-controlled X-Forwarded-For headers cannot be used to bypass rate limits', async () => {
    // When isRender is false, changing X-Forwarded-For should NOT reset client identity
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

  describe('Render-Aware Rate-Limit Client IP Resolution (Step 1.1)', () => {
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
        expect(res.statusCode).toBe(400); // Bad content-type, not 429 or 503
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
      const ipv6Cf = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const resCf = await renderApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: {
          'content-type': 'application/json',
          'cf-connecting-ip': ipv6Cf,
        },
        body: JSON.stringify({}),
      });
      expect(resCf.statusCode).toBe(400); // Validly resolved without 503 error
    });

    it('9. In Render-configured mode, missing CF-Connecting-IP triggers safe degraded behavior (HTTP 503 E_INGRESS_UNAVAILABLE)', async () => {
      // Create a fresh app to avoid bucket contamination from other tests
      const freshRenderApp = buildApp({
        rateLimit: {
          enabled: true,
          verifyMax: 10,
          merchantMax: 10,
          timeWindowMs: windowMs,
          isRender: true,
        },
      });

      const res = await freshRenderApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: {
          'content-type': 'application/json',
          // cf-connecting-ip intentionally omitted
        },
        body: JSON.stringify({}),
      });

      expect(res.statusCode).toBe(503);
      const body = res.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('E_INGRESS_UNAVAILABLE');
      expect(body.error.message).toContain('Service ingress configuration unavailable');
      expect(body.error.details).toContain(
        'Client identity could not be securely established',
      );
      // Ensure no sensitive internal stack or paths leaked
      expect(body.stack).toBeUndefined();
    });

    it('10. In Render-configured mode, malformed CF-Connecting-IP triggers safe degraded behavior (HTTP 503)', async () => {
      const freshRenderApp = buildApp({
        rateLimit: {
          enabled: true,
          verifyMax: 10,
          merchantMax: 10,
          timeWindowMs: windowMs,
          isRender: true,
        },
      });

      const malformedHeaders: string[] = [
        'not-an-ip',
        '198.51.100.1, 198.51.100.2', // Comma-separated not permitted for CF-Connecting-IP
        '198.51.100.1, 198.51.100.1', // Duplicate comma-separated values rejected
        '999.999.999.999',
        '   ',
        '',
      ];

      for (const badValue of malformedHeaders) {
        const res = await freshRenderApp.inject({
          method: 'POST',
          url: '/api/v1/verify',
          headers: {
            'content-type': 'application/json',
            'cf-connecting-ip': badValue,
          },
          body: JSON.stringify({}),
        });

        expect(res.statusCode).toBe(503);
        expect(res.json().error.code).toBe('E_INGRESS_UNAVAILABLE');
      }
    });

    it('10b. In Render-configured mode, array-form CF-Connecting-IP is rejected as ambiguous (HTTP 503)', async () => {
      const arrayHeaderApp = buildApp({
        rateLimit: {
          enabled: true,
          verifyMax: 10,
          merchantMax: 10,
          timeWindowMs: windowMs,
          isRender: true,
        },
      });

      // Hook simulating internal/proxy multi-value header assignment
      arrayHeaderApp.addHook('onRequest', async (req) => {
        if (req.headers['x-test-mode'] === 'array-single') {
          // Array-form with single valid IP
          req.headers['cf-connecting-ip'] = ['198.51.100.10'] as unknown as string;
        } else if (req.headers['x-test-mode'] === 'array-multi') {
          // Array-form with multiple valid IPs
          req.headers['cf-connecting-ip'] = [
            '198.51.100.10',
            '198.51.100.20',
          ] as unknown as string;
        }
      });

      // 1. Array-form with a valid first value -> must be rejected as ambiguous (503)
      const resSingle = await arrayHeaderApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: {
          'content-type': 'application/json',
          'x-test-mode': 'array-single',
        },
        body: JSON.stringify({}),
      });
      expect(resSingle.statusCode).toBe(503);
      expect(resSingle.json().error.code).toBe('E_INGRESS_UNAVAILABLE');

      // 2. Array-form with multiple valid values -> must be rejected as ambiguous (503)
      const resMulti = await arrayHeaderApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: {
          'content-type': 'application/json',
          'x-test-mode': 'array-multi',
        },
        body: JSON.stringify({}),
      });
      expect(resMulti.statusCode).toBe(503);
      expect(resMulti.json().error.code).toBe('E_INGRESS_UNAVAILABLE');
    });

    it('11. X-Forwarded-For is NEVER used to invent a trusted client identity on Render', async () => {
      const freshRenderApp = buildApp({
        rateLimit: {
          enabled: true,
          verifyMax: 10,
          merchantMax: 10,
          timeWindowMs: windowMs,
          isRender: true,
        },
      });

      // An attacker or intermediate proxy sending X-Forwarded-For without CF-Connecting-IP
      // must NOT be trusted to establish client identity and must receive HTTP 503
      const res = await freshRenderApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.195, 172.71.195.123, 10.226.90.65',
        },
        body: JSON.stringify({}),
      });

      expect(res.statusCode).toBe(503);
      expect(res.json().error.code).toBe('E_INGRESS_UNAVAILABLE');
    });

    it('12. Caller-supplied headers cannot rotate rate-limit identity under Cloudflare edge', async () => {
      const clientIp = '198.51.100.77';

      // Exhaust quota for clientIp via CF-Connecting-IP (2 requests)
      for (let i = 0; i < maxRequests; i++) {
        const res = await renderApp.inject({
          method: 'POST',
          url: '/api/v1/verify',
          headers: {
            'content-type': 'application/json',
            'cf-connecting-ip': clientIp,
          },
          body: JSON.stringify({}),
        });
        expect(res.statusCode).toBe(400);
      }

      // Attacker tries to rotate identity by injecting spoofed X-Forwarded-For headers
      const spoofAttempt1 = await renderApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: {
          'content-type': 'application/json',
          'cf-connecting-ip': clientIp,
          'x-forwarded-for': '203.0.113.1', // Attacker trying to spoof fresh IP
        },
        body: JSON.stringify({}),
      });
      expect(spoofAttempt1.statusCode).toBe(429);
      expect(spoofAttempt1.json().error.code).toBe('E_RATE_LIMIT_EXCEEDED');

      const spoofAttempt2 = await renderApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: {
          'content-type': 'application/json',
          'cf-connecting-ip': clientIp,
          'x-forwarded-for': '203.0.113.2', // Another rotation attempt
        },
        body: JSON.stringify({}),
      });
      expect(spoofAttempt2.statusCode).toBe(429);
      expect(spoofAttempt2.json().error.code).toBe('E_RATE_LIMIT_EXCEEDED');
    });

    it('13. Missing CF-Connecting-IP requests cannot bypass rate limiter controls (shared unresolved bucket reaches 429)', async () => {
      const isolatedRenderApp = buildApp({
        rateLimit: {
          enabled: true,
          verifyMax: 2,
          merchantMax: 10,
          timeWindowMs: windowMs,
          isRender: true,
        },
      });

      // 1st request missing CF header: within quota -> rejected by preHandler with 503
      const res1 = await isolatedRenderApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res1.statusCode).toBe(503);
      expect(res1.json().error.code).toBe('E_INGRESS_UNAVAILABLE');

      // 2nd request missing CF header: within quota (max: 2) -> rejected with 503
      const res2 = await isolatedRenderApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res2.statusCode).toBe(503);
      expect(res2.json().error.code).toBe('E_INGRESS_UNAVAILABLE');

      // 3rd request missing CF header: EXCEEDS quota on verify:unresolved -> rate limiter returns 429!
      const res3 = await isolatedRenderApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res3.statusCode).toBe(429);
      expect(res3.json().error.code).toBe('E_RATE_LIMIT_EXCEEDED');
    });

    it('14. Outside Render-configured mode, client-supplied proxy headers do not change the resolved IP or bypass limits', async () => {
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
        expect(res.statusCode).toBe(400); // Normal validation error, NOT 503
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
      const spoofCfRes = await localApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: {
          'content-type': 'application/json',
          'cf-connecting-ip': '203.0.113.88',
        },
        body: JSON.stringify({}),
      });
      expect(spoofCfRes.statusCode).toBe(429);
      expect(spoofCfRes.json().error.code).toBe('E_RATE_LIMIT_EXCEEDED');

      // Supplying X-Forwarded-For on non-Render app should be IGNORED and remain rate-limited
      const spoofXffRes = await localApp.inject({
        method: 'POST',
        url: '/api/v1/verify',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.88',
        },
        body: JSON.stringify({}),
      });
      expect(spoofXffRes.statusCode).toBe(429);
      expect(spoofXffRes.json().error.code).toBe('E_RATE_LIMIT_EXCEEDED');
    });

    it('15. resolveClientIp unit tests verify strict header validation, non-Render socket fallback, and null on unverified ingress', () => {
      const createMockReq = (
        headers: Record<string, string | string[] | undefined>,
        ip = '127.0.0.1',
      ) => ({ headers, ip }) as unknown as FastifyRequest;

      // Render mode (isRender: true):
      // Valid IPv4
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': '1.2.3.4' }), true),
      ).toBe('1.2.3.4');

      // Whitespace trimmed
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': '  1.2.3.4  ' }), true),
      ).toBe('1.2.3.4');

      // Valid IPv6
      expect(resolveClientIp(createMockReq({ 'cf-connecting-ip': '::1' }), true)).toBe(
        '::1',
      );
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': '2001:db8::1' }), true),
      ).toBe('2001:db8::1');

      // Array-form header rejected as ambiguous (both single and multiple valid entries)
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': ['1.2.3.4'] }), true),
      ).toBeNull();
      expect(
        resolveClientIp(
          createMockReq({ 'cf-connecting-ip': ['1.2.3.4', '5.6.7.8'] }),
          true,
        ),
      ).toBeNull();

      // Comma-separated duplicate or multiple values rejected
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': '1.2.3.4, 1.2.3.4' }), true),
      ).toBeNull();

      // Render mode: Missing or empty header -> returns null
      expect(resolveClientIp(createMockReq({}), true)).toBeNull();
      expect(resolveClientIp(createMockReq({ 'cf-connecting-ip': '' }), true)).toBeNull();
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': '   ' }), true),
      ).toBeNull();

      // Render mode: Malformed / non-IP header -> returns null
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': 'not-an-ip' }), true),
      ).toBeNull();
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': '1.2.3.4, 5.6.7.8' }), true),
      ).toBeNull();
      expect(
        resolveClientIp(createMockReq({ 'cf-connecting-ip': '999.999.999.999' }), true),
      ).toBeNull();

      // Render mode: X-Forwarded-For without CF-Connecting-IP -> returns null (NEVER parsed to invent an IP)
      expect(
        resolveClientIp(
          createMockReq({
            'x-forwarded-for': '203.0.113.195, 172.71.195.123, 10.226.90.65',
          }),
          true,
        ),
      ).toBeNull();

      // Render mode: Both CF-Connecting-IP and X-Forwarded-For present -> returns CF-Connecting-IP, XFF ignored
      expect(
        resolveClientIp(
          createMockReq({
            'cf-connecting-ip': '198.51.100.5',
            'x-forwarded-for': '203.0.113.195',
          }),
          true,
        ),
      ).toBe('198.51.100.5');

      // Outside Render mode (isRender: false):
      // All proxy headers completely ignored -> always returns socket req.ip
      expect(
        resolveClientIp(
          createMockReq({ 'cf-connecting-ip': '1.2.3.4' }, '10.0.0.9'),
          false,
        ),
      ).toBe('10.0.0.9');
      expect(
        resolveClientIp(
          createMockReq({ 'x-forwarded-for': '1.2.3.4' }, '10.0.0.9'),
          false,
        ),
      ).toBe('10.0.0.9');
      expect(
        resolveClientIp(
          createMockReq(
            { 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8' },
            '10.0.0.9',
          ),
          false,
        ),
      ).toBe('10.0.0.9');
    });

    /**
     * Trust Boundary Documentation & Architectural Invariant:
     *
     * In-memory Fastify injection tests (app.inject) simulate how the application layer
     * enforces policy based on received headers. However, injection tests cannot test or verify
     * the external physical network topology or proxy behavior.
     *
     * Architectural Assumption for Render:
     * 1. Render routes all public inbound traffic through its Cloudflare edge network.
     * 2. Cloudflare's edge proxy strips or overwrites any incoming CF-Connecting-IP header
     *    supplied by the public visitor, replacing it with the authentic TCP connection IP.
     * 3. The backend container receives this authoritative header and validates its IP syntax.
     * 4. If the header is missing, Render ingress routing is misconfigured or internal, and the
     *    verification route safely halts with HTTP 503 rather than guessing from unverified XFF.
     *
     * What Remains Unverified at the Unit Test Layer:
     * - Whether Render's internal reverse proxy ever strips CF-Connecting-IP under custom domain routing.
     * - Whether direct IP access to the container (bypassing Cloudflare) is blocked at Render's VPC firewall.
     */
    it('16. Trust boundary verification: documents and validates architectural invariants', () => {
      // Confirms the trust boundary contract:
      // When on Render, CF-Connecting-IP is required for client identity.
      const mockReqMissing = {
        headers: { 'x-forwarded-for': '203.0.113.1' },
        ip: '10.226.90.65',
      } as unknown as FastifyRequest;
      expect(resolveClientIp(mockReqMissing, true)).toBeNull();

      // When on Render, valid CF-Connecting-IP provides authoritative identity.
      const mockReqValid = {
        headers: { 'cf-connecting-ip': '203.0.113.1' },
        ip: '10.226.90.65',
      } as unknown as FastifyRequest;
      expect(resolveClientIp(mockReqValid, true)).toBe('203.0.113.1');

      // Outside Render, headers are ignored to prevent spoofing against bare sockets.
      expect(resolveClientIp(mockReqValid, false)).toBe('10.226.90.65');
    });
  });
});
