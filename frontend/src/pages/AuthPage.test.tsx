import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthPage } from './AuthPage';
import * as AuthContextModule from '../context/AuthContext';

describe('AuthPage Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const createMockAuth = (overrides = {}) => ({
    user: null,
    session: null,
    merchant: null,
    destinations: [],
    referenceQr: null,
    isLoading: false,
    isMerchantLoading: false,
    isReferenceQrLoading: false,
    authError: null,
    signIn: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue({ needsEmailConfirmation: false }),
    signOut: vi.fn().mockResolvedValue(undefined),
    createMerchantProfile: vi.fn(),
    registerDestination: vi.fn(),
    updateDestination: vi.fn(),
    uploadReferenceQr: vi.fn(),
    deleteReferenceQr: vi.fn(),
    refreshMerchantData: vi.fn(),
    clearAuthError: vi.fn(),
    ...overrides,
  });

  it('1. signed-out state renders sign-in flow', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue(createMockAuth());

    const { container } = render(
      <MemoryRouter
        initialEntries={['/login']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/dashboard" element={<div>Dashboard Mock</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Sign in to QRShield')).toBeDefined();
    expect(screen.getByLabelText(/Email Address/i)).toBeDefined();
    expect(screen.getByLabelText(/^Password/i)).toBeDefined();
    expect(container.querySelector('button[type="submit"]')).toBeDefined();
  });

  it('2. successful sign-in transitions and invokes signIn with credentials', async () => {
    const mockAuth = createMockAuth();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue(mockAuth);

    const { container } = render(
      <MemoryRouter
        initialEntries={['/login']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/dashboard" element={<div>Dashboard Mock</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'merchant@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'CorrectPassword123!' },
    });

    const submitBtn = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockAuth.signIn).toHaveBeenCalledTimes(1);
    });
    expect(mockAuth.signIn).toHaveBeenCalledWith(
      'merchant@test.com',
      'CorrectPassword123!',
    );
  });

  it('3. authentication error renders correctly with alert', () => {
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue(
      createMockAuth({
        authError: 'Invalid login credentials provided.',
      }),
    );

    render(
      <MemoryRouter
        initialEntries={['/login']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/login" element={<AuthPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Authentication Error')).toBeDefined();
    expect(screen.getByText('Invalid login credentials provided.')).toBeDefined();
  });

  it('4. sign-up validates password mismatch on client side', async () => {
    const mockAuth = createMockAuth();
    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue(mockAuth);

    const { container } = render(
      <MemoryRouter
        initialEntries={['/login']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/login" element={<AuthPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Switch to Sign Up tab
    fireEvent.click(screen.getByRole('button', { name: /Sign Up/i }));

    expect(screen.getByText('Register Merchant Account')).toBeDefined();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeDefined();

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'newmerchant@test.com' },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'Password123!' },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'DifferentPassword123!' },
    });

    const submitBtn = container.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match.')).toBeDefined();
    });
    expect(mockAuth.signUp).not.toHaveBeenCalled();
  });
});
