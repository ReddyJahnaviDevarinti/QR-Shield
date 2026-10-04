import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import * as AuthContextModule from '../context/AuthContext';
import type { User, Session } from '@supabase/supabase-js';
import type { MerchantRecord, PaymentDestinationRecord } from '../types';

describe('DashboardPage & Protected Route Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockUser = {
    id: 'user-uuid-1111',
    email: 'merchant@store.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  };

  const mockMerchant: MerchantRecord = {
    id: 'merch-uuid-2222',
    user_id: 'user-uuid-1111',
    business_name: 'Apex Supermarket',
    registration_number: null,
    contact_email: 'contact@apex.com',
    created_at: '2026-10-04T10:00:00Z',
  };

  const mockDestination: PaymentDestinationRecord = {
    id: 'dest-uuid-3333',
    merchant_id: 'merch-uuid-2222',
    destination_type: 'VPA',
    destination_value: 'apex@icici',
    is_active: true,
    registered_at: '2026-10-04T10:05:00Z',
  };

  const createMockAuth = (overrides = {}) => ({
    user: mockUser as unknown as User,
    session: {} as unknown as Session,
    merchant: mockMerchant,
    destinations: [mockDestination],
    isLoading: false,
    isMerchantLoading: false,
    authError: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    createMerchantProfile: vi.fn().mockResolvedValue(mockMerchant),
    registerDestination: vi.fn().mockResolvedValue(mockDestination),
    updateDestination: vi.fn().mockResolvedValue(mockDestination),
    refreshMerchantData: vi.fn(),
    clearAuthError: vi.fn(),
    ...overrides,
  });

  it('5. protected dashboard redirects when signed out', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue(
      createMockAuth({
        user: null,
        session: null,
        merchant: null,
        destinations: [],
      }),
    );

    render(
      <MemoryRouter
        initialEntries={['/dashboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Redirected To Login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Redirected To Login')).toBeDefined();
  });

  it('6. authenticated dashboard renders when signed in', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue(createMockAuth());

    render(
      <MemoryRouter
        initialEntries={['/dashboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Merchant Registry Workspace')).toBeDefined();
    expect(screen.getByText('1. Merchant Identity')).toBeDefined();
    expect(screen.getByText('2. Trusted Payment Destinations')).toBeDefined();
  });

  it('7. existing merchant profile loads and displays business details', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue(createMockAuth());

    render(
      <MemoryRouter
        initialEntries={['/dashboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Apex Supermarket')).toBeDefined();
    expect(screen.getByText('merchant@store.com')).toBeDefined();
    expect(screen.getByText('merch-uuid-2222')).toBeDefined();
  });

  it('8. missing merchant profile shows onboarding prompt and creation form', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue(
      createMockAuth({
        merchant: null,
        destinations: [],
      }),
    );

    render(
      <MemoryRouter
        initialEntries={['/dashboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Merchant Profile Onboarding')).toBeDefined();
    expect(
      screen.getByText(
        /Your authenticated account .* does not have a registered merchant profile yet/i,
      ),
    ).toBeDefined();
    expect(screen.getByLabelText(/Legal \/ Business Name/i)).toBeDefined();
    expect(
      screen.getByRole('button', { name: /Create Merchant Profile/i }),
    ).toBeDefined();
  });

  it("9. merchant registration creates the authenticated user's profile", async () => {
    const mockAuth = createMockAuth({
      merchant: null,
      destinations: [],
    });
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue(mockAuth);

    render(
      <MemoryRouter
        initialEntries={['/dashboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Legal \/ Business Name/i), {
      target: { value: 'New Horizon Store' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create Merchant Profile/i }));

    await waitFor(() => {
      expect(mockAuth.createMerchantProfile).toHaveBeenCalledTimes(1);
    });
    expect(mockAuth.createMerchantProfile).toHaveBeenCalledWith(
      'New Horizon Store',
      'merchant@store.com',
    );
  });

  it('10. destination registration form opens and succeeds', async () => {
    const mockAuth = createMockAuth();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue(mockAuth);

    render(
      <MemoryRouter
        initialEntries={['/dashboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Add Destination/i }));

    expect(screen.getByText('Register New Trusted Destination')).toBeDefined();

    fireEvent.change(screen.getByLabelText(/Destination Value/i), {
      target: { value: 'newdestination@upi' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Save Destination/i }));

    await waitFor(() => {
      expect(mockAuth.registerDestination).toHaveBeenCalledTimes(1);
    });
    expect(mockAuth.registerDestination).toHaveBeenCalledWith(
      'VPA',
      'newdestination@upi',
      true,
    );
  });

  it('11. destination loading renders registered destination and ACTIVE state', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue(createMockAuth());

    render(
      <MemoryRouter
        initialEntries={['/dashboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('apex@icici')).toBeDefined();
    expect(screen.getByText('ACTIVE')).toBeDefined();
    expect(screen.getByText('VPA')).toBeDefined();
  });

  it('12. destination error renders correctly when registration fails', async () => {
    const mockAuth = createMockAuth({
      registerDestination: vi
        .fn()
        .mockRejectedValue(new Error('VPA violates database constraints')),
    });
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue(mockAuth);

    render(
      <MemoryRouter
        initialEntries={['/dashboard']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Add Destination/i }));
    fireEvent.change(screen.getByLabelText(/Destination Value/i), {
      target: { value: 'bad@domain' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Save Destination/i }));

    await waitFor(() => {
      expect(screen.getByText('Destination Error')).toBeDefined();
    });
    expect(screen.getByText('VPA violates database constraints')).toBeDefined();
  });
});
