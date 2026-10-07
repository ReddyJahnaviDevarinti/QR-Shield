import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { AuthProvider, useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import type { MerchantRecord } from '../types';

// Mock Supabase
vi.mock('../lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
        onAuthStateChange: vi.fn(() => ({
          data: { subscription: { unsubscribe: vi.fn() } },
        })),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      },
      from: vi.fn(),
    },
  };
});

describe('AuthContext RLS & Session Ownership Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSession: Session = {
    access_token: 'mock-jwt-token-123',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'mock-refresh-token',
    user: {
      id: 'session-user-uuid-999',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'owner@merchant.com',
      phone: '',
      confirmed_at: new Date().toISOString(),
      last_sign_in_at: new Date().toISOString(),
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    },
  };

  it('1. authenticated user with active session creates merchant profile using session user_id', async () => {
    // Mock active session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'new-merchant-id-1',
            user_id: 'session-user-uuid-999',
            business_name: 'Owner Store',
            contact_email: 'owner@merchant.com',
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    });

    const mockSelect = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'merchants') {
        return {
          insert: mockInsert,
          select: mockSelect().select,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    let createdMerchant: MerchantRecord | undefined;
    await act(async () => {
      createdMerchant = await result.current.createMerchantProfile('Owner Store');
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const firstCall = mockInsert.mock.calls[0];
    expect(firstCall).toBeDefined();
    const passedPayload = firstCall![0];

    // CRITICAL SECURITY ASSERTION: inserted user_id MUST equal session user.id
    expect(passedPayload.user_id).toBe(mockSession.user.id);
    expect(passedPayload.user_id).toBe('session-user-uuid-999');
    expect(passedPayload.business_name).toBe('Owner Store');
    expect(passedPayload.contact_email).toBe('owner@merchant.com');
    expect(createdMerchant?.id).toBe('new-merchant-id-1');
  });

  it('2. signed-out user cannot create merchant profile (fails before insert)', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const mockInsert = vi.fn();
    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    } as unknown as ReturnType<typeof supabase.from>);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.createMerchantProfile('Attacker Store');
      }),
    ).rejects.toThrow(/No active authenticated Supabase session/i);

    // Ensure no unauthenticated insert was ever attempted against Supabase
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('3. signUp with required email confirmation does not set pseudo-authenticated user', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const mockUser: User = {
      id: 'unconfirmed-user-123',
      email: 'pending@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      phone: '',
      confirmed_at: undefined,
      last_sign_in_at: undefined,
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    vi.mocked(supabase.auth.signUp).mockResolvedValue({
      data: {
        user: mockUser,
        session: null, // email confirmation needed!
      },
      error: null,
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    let signUpRes: { needsEmailConfirmation: boolean } | undefined;
    await act(async () => {
      signUpRes = await result.current.signUp('pending@example.com', 'Password123!');
    });

    expect(signUpRes?.needsEmailConfirmation).toBe(true);
    // User must NOT be set to non-null when session is null
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });
});
