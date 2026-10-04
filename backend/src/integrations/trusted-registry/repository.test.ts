import { describe, it, expect, vi } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  findActiveTrustedDestinations,
  findActiveTrustedDestinationsForMerchant,
  checkRegistryConnection,
} from './repository.js';
import { RegistryQueryFailedError } from './errors.js';
import { verifyDestination } from '../../modules/verification-engine/engine.js';
import { ParsedUpiPayload } from '../../modules/payment-parser/types.js';

interface MockResponse {
  data: Array<{
    merchant_id: string;
    destination_type: string;
    destination_value: string;
    is_active: boolean;
  }> | null;
  error: { message: string; code?: string } | null;
}

function createMockClient(response: MockResponse | Error) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockImplementation(() => {
      if (response instanceof Error) {
        return Promise.reject(response);
      }
      return Promise.resolve(response);
    }),
    limit: vi.fn().mockImplementation(() => {
      if (response instanceof Error) {
        return Promise.reject(response);
      }
      return Promise.resolve(response);
    }),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    upsert: vi.fn(),
    then(
      onfulfilled?: (value: unknown) => unknown,
      onrejected?: (reason: unknown) => unknown,
    ) {
      if (response instanceof Error) {
        return Promise.reject(response).then(onfulfilled, onrejected);
      }
      return Promise.resolve(response).then(onfulfilled, onrejected);
    },
  };

  const client = {
    from: vi.fn().mockReturnValue(chain),
  };

  return { client: client as unknown as SupabaseClient, chain };
}

describe('Supabase Trusted Registry Adapter', () => {
  it('1. Maps active VPA destination correctly', async () => {
    const { client, chain } = createMockClient({
      data: [
        {
          merchant_id: 'merchant-101',
          destination_type: 'VPA',
          destination_value: 'store@icici',
          is_active: true,
        },
      ],
      error: null,
    });

    const results = await findActiveTrustedDestinations('store@icici', 'VPA', client);

    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      merchantId: 'merchant-101',
      destinationType: 'VPA',
      destinationValue: 'store@icici',
      isActive: true,
    });
    expect(chain.select).toHaveBeenCalledWith(
      'merchant_id, destination_type, destination_value, is_active',
    );
    expect(chain.eq).toHaveBeenCalledWith('is_active', true);
    expect(chain.eq).toHaveBeenCalledWith('destination_type', 'VPA');
  });

  it('2. Maps active URL destination correctly', async () => {
    const { client, chain } = createMockClient({
      data: [
        {
          merchant_id: 'merchant-202',
          destination_type: 'URL',
          destination_value: 'https://store.example/checkout',
          is_active: true,
        },
      ],
      error: null,
    });

    const results = await findActiveTrustedDestinations(
      'https://store.example/checkout',
      'URL',
      client,
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.destinationType).toBe('URL');
    expect(results[0]?.destinationValue).toBe('https://store.example/checkout');
    expect(chain.eq).toHaveBeenCalledWith('destination_type', 'URL');
  });

  it('3. Excludes inactive destinations returned by query', async () => {
    const { client } = createMockClient({
      data: [
        {
          merchant_id: 'merchant-303',
          destination_type: 'VPA',
          destination_value: 'inactive@icici',
          is_active: false,
        },
      ],
      error: null,
    });

    const results = await findActiveTrustedDestinations('inactive@icici', 'VPA', client);

    expect(results).toEqual([]);
  });

  it('4. Excludes destinations with mismatched destination type', async () => {
    const { client } = createMockClient({
      data: [
        {
          merchant_id: 'merchant-404',
          destination_type: 'ACCOUNT',
          destination_value: 'store@icici',
          is_active: true,
        },
      ],
      error: null,
    });

    const results = await findActiveTrustedDestinations('store@icici', 'VPA', client);

    expect(results).toEqual([]);
  });

  it('5. Returns empty array when no records match', async () => {
    const { client } = createMockClient({
      data: [],
      error: null,
    });

    const results = await findActiveTrustedDestinations(
      'nonexistent@bank',
      'VPA',
      client,
    );

    expect(results).toEqual([]);
  });

  it('6. Throws controlled RegistryQueryFailedError on Supabase query failure', async () => {
    const { client } = createMockClient({
      data: null,
      error: { message: 'relation "payment_destinations" does not exist' },
    });

    await expect(
      findActiveTrustedDestinations('store@icici', 'VPA', client),
    ).rejects.toThrow(RegistryQueryFailedError);

    await expect(
      findActiveTrustedDestinations('store@icici', 'VPA', client),
    ).rejects.toMatchObject({
      code: 'E_REGISTRY_QUERY_FAILED',
      statusCode: 500,
    });
  });

  it('7. Returns objects containing only the required fields', async () => {
    const { client } = createMockClient({
      data: [
        {
          merchant_id: 'merchant-505',
          destination_type: 'VPA',
          destination_value: 'clean@bank',
          is_active: true,
        },
      ],
      error: null,
    });

    const results = await findActiveTrustedDestinations('clean@bank', 'VPA', client);

    expect(results).toHaveLength(1);
    const keys = Object.keys(results[0]!);
    expect(keys.sort()).toEqual(
      ['destinationType', 'destinationValue', 'isActive', 'merchantId'].sort(),
    );
  });

  it('8. Performs no insert, update, delete, or upsert mutations', async () => {
    const { client, chain } = createMockClient({
      data: [],
      error: null,
    });

    await findActiveTrustedDestinations('store@icici', 'VPA', client);

    expect(chain.insert).not.toHaveBeenCalled();
    expect(chain.update).not.toHaveBeenCalled();
    expect(chain.delete).not.toHaveBeenCalled();
    expect(chain.upsert).not.toHaveBeenCalled();
  });

  it('9. Makes zero external network requests outside the Supabase client', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const { client } = createMockClient({ data: [], error: null });

    await findActiveTrustedDestinations('store@icici', 'VPA', client);

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('10. Never prints or reveals secrets in output or errors', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const { client } = createMockClient({
      data: null,
      error: { message: 'Database connection failed' },
    });

    try {
      await findActiveTrustedDestinations('store@icici', 'VPA', client);
    } catch (err) {
      expect(err).toBeInstanceOf(RegistryQueryFailedError);
      expect((err as Error).message).not.toContain('sb_secret');
      expect((err as Error).message).not.toContain('secret');
    }

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('11. Results are directly compatible with verification engine TrustedDestination model', async () => {
    const { client } = createMockClient({
      data: [
        {
          merchant_id: 'merchant-verified',
          destination_type: 'VPA',
          destination_value: 'store@icici',
          is_active: true,
        },
      ],
      error: null,
    });

    const registryDestinations = await findActiveTrustedDestinations(
      'store@icici',
      'VPA',
      client,
    );

    const upiPayload: ParsedUpiPayload = {
      format: 'UPI_URI',
      rawPayload: 'upi://pay?pa=store@icici',
      paymentAddress: 'store@icici',
      payeeName: null,
      amount: null,
      merchantCategoryCode: null,
      currency: 'INR',
      mode: null,
      url: null,
      refUrl: null,
    };

    // Feed registry output directly into verification engine
    const verification = verifyDestination(
      upiPayload,
      registryDestinations as Array<{
        merchantId: string;
        destinationType: 'VPA' | 'URL';
        destinationValue: string;
        isActive: boolean;
      }>,
    );

    expect(verification.status).toBe('VERIFIED');
    expect(verification.destinationMatch).toBe(true);
    expect(verification.matchedMerchantId).toBe('merchant-verified');
  });

  it('12. Repeated identical inputs produce deterministic output given same database response', async () => {
    const { client } = createMockClient({
      data: [
        {
          merchant_id: 'merchant-det',
          destination_type: 'VPA',
          destination_value: 'test@upi',
          is_active: true,
        },
      ],
      error: null,
    });

    const res1 = await findActiveTrustedDestinations('test@upi', 'VPA', client);
    const res2 = await findActiveTrustedDestinations('test@upi', 'VPA', client);

    expect(res1).toEqual(res2);
  });

  it('13. checkRegistryConnection returns true when query succeeds and false on error', async () => {
    const success = createMockClient({ data: [], error: null });
    expect(await checkRegistryConnection(success.client)).toBe(true);

    const failure = createMockClient({
      data: null,
      error: { message: 'network error' },
    });
    expect(await checkRegistryConnection(failure.client)).toBe(false);
  });

  describe('findActiveTrustedDestinationsForMerchant', () => {
    it('14. Retrieves active destinations for specified merchant and type', async () => {
      const { client, chain } = createMockClient({
        data: [
          {
            merchant_id: 'merchant-abc',
            destination_type: 'VPA',
            destination_value: 'store@icici',
            is_active: true,
          },
        ],
        error: null,
      });

      const results = await findActiveTrustedDestinationsForMerchant(
        'merchant-abc',
        'VPA',
        client,
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        merchantId: 'merchant-abc',
        destinationType: 'VPA',
        destinationValue: 'store@icici',
        isActive: true,
      });
      expect(chain.select).toHaveBeenCalledWith(
        'merchant_id, destination_type, destination_value, is_active',
      );
      expect(chain.eq).toHaveBeenCalledWith('merchant_id', 'merchant-abc');
      expect(chain.eq).toHaveBeenCalledWith('is_active', true);
      expect(chain.eq).toHaveBeenCalledWith('destination_type', 'VPA');
    });

    it('15. Excludes inactive destinations for merchant', async () => {
      const { client } = createMockClient({
        data: [
          {
            merchant_id: 'merchant-abc',
            destination_type: 'VPA',
            destination_value: 'inactive@icici',
            is_active: false,
          },
        ],
        error: null,
      });

      const results = await findActiveTrustedDestinationsForMerchant(
        'merchant-abc',
        'VPA',
        client,
      );

      expect(results).toEqual([]);
    });

    it('16. Returns empty array when merchant has no active destinations', async () => {
      const { client } = createMockClient({
        data: [],
        error: null,
      });

      const results = await findActiveTrustedDestinationsForMerchant(
        'merchant-none',
        'VPA',
        client,
      );

      expect(results).toEqual([]);
    });

    it('17. Returns empty array when merchantId is empty or whitespace', async () => {
      const { client, chain } = createMockClient({
        data: [],
        error: null,
      });

      const resEmpty = await findActiveTrustedDestinationsForMerchant('', 'VPA', client);
      const resWhitespace = await findActiveTrustedDestinationsForMerchant(
        '   ',
        'VPA',
        client,
      );

      expect(resEmpty).toEqual([]);
      expect(resWhitespace).toEqual([]);
      expect(chain.select).not.toHaveBeenCalled();
    });

    it('18. Throws RegistryQueryFailedError on database query failure', async () => {
      const { client } = createMockClient({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(
        findActiveTrustedDestinationsForMerchant('merchant-abc', 'VPA', client),
      ).rejects.toThrow(RegistryQueryFailedError);
    });

    it('19. Performs no mutations', async () => {
      const { client, chain } = createMockClient({
        data: [],
        error: null,
      });

      await findActiveTrustedDestinationsForMerchant('merchant-abc', 'VPA', client);

      expect(chain.insert).not.toHaveBeenCalled();
      expect(chain.update).not.toHaveBeenCalled();
      expect(chain.delete).not.toHaveBeenCalled();
      expect(chain.upsert).not.toHaveBeenCalled();
    });
  });
});
