import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  MerchantRecord,
  PaymentDestinationRecord,
  ReferenceQrRecord,
} from '../types';
import {
  fetchReferenceQr,
  uploadReferenceQr as apiUploadReferenceQr,
  deleteReferenceQr as apiDeleteReferenceQr,
} from '../lib/api';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  merchant: MerchantRecord | null;
  destinations: PaymentDestinationRecord[];
  referenceQr: ReferenceQrRecord | null;
  isLoading: boolean;
  isMerchantLoading: boolean;
  isReferenceQrLoading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  createMerchantProfile: (
    businessName: string,
    contactEmail?: string,
  ) => Promise<MerchantRecord>;
  registerDestination: (
    destinationType: 'VPA' | 'URL' | 'ACCOUNT',
    destinationValue: string,
    isActive?: boolean,
  ) => Promise<PaymentDestinationRecord>;
  updateDestination: (
    destinationId: string,
    updates: { destination_value?: string; is_active?: boolean },
  ) => Promise<PaymentDestinationRecord>;
  uploadReferenceQr: (file: File) => Promise<ReferenceQrRecord>;
  deleteReferenceQr: () => Promise<void>;
  refreshMerchantData: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [merchant, setMerchant] = useState<MerchantRecord | null>(null);
  const [destinations, setDestinations] = useState<PaymentDestinationRecord[]>([]);
  const [referenceQr, setReferenceQr] = useState<ReferenceQrRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMerchantLoading, setIsMerchantLoading] = useState<boolean>(false);
  const [isReferenceQrLoading, setIsReferenceQrLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Fetch merchant profile and payment destinations for a user
  const loadMerchantAndDestinations = useCallback(
    async (userId: string, accessToken?: string) => {
      setIsMerchantLoading(true);
      try {
        // 1. Query merchant for authenticated user
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchants')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (merchantError) {
          throw new Error(`Failed to load merchant profile: ${merchantError.message}`);
        }

        setMerchant((merchantData as MerchantRecord) || null);

        // 2. Query destinations and reference QR if merchant exists
        if (merchantData?.id) {
          const { data: destData, error: destError } = await supabase
            .from('payment_destinations')
            .select('*')
            .eq('merchant_id', merchantData.id)
            .order('registered_at', { ascending: false });

          if (destError) {
            throw new Error(`Failed to load payment destinations: ${destError.message}`);
          }

          setDestinations((destData as PaymentDestinationRecord[]) || []);

          try {
            const ref = await fetchReferenceQr(merchantData.id, accessToken);
            setReferenceQr(ref);
          } catch {
            setReferenceQr(null);
          }
        } else {
          setDestinations([]);
          setReferenceQr(null);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown database error';
        setAuthError(msg);
      } finally {
        setIsMerchantLoading(false);
      }
    },
    [],
  );

  // Initialize session and listen to auth changes
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }

        if (isMounted) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          if (data.session?.user?.id) {
            await loadMerchantAndDestinations(
              data.session.user.id,
              data.session?.access_token,
            );
          } else {
            setMerchant(null);
            setDestinations([]);
          }
        }
      } catch (err) {
        if (isMounted) {
          const msg =
            err instanceof Error ? err.message : 'Failed to retrieve auth session.';
          setAuthError(msg);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;

      setSession(newSession);
      const newUser = newSession?.user ?? null;
      setUser(newUser);

      if (newUser?.id) {
        await loadMerchantAndDestinations(newUser.id, newSession?.access_token);
      } else {
        setMerchant(null);
        setDestinations([]);
        setReferenceQr(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadMerchantAndDestinations]);

  // Sign In with email and password
  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      const err = error as AuthError;
      setAuthError(err.message);
      throw err;
    }

    setSession(data.session);
    setUser(data.user);
  }, []);

  // Sign Up with email and password
  const signUp = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      const err = error as AuthError;
      setAuthError(err.message);
      throw err;
    }

    const needsEmailConfirmation = !data.session && !!data.user;
    setSession(data.session);
    setUser(data.user);

    return { needsEmailConfirmation };
  }, []);

  // Sign Out
  const signOut = useCallback(async () => {
    setAuthError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthError(error.message);
      throw error;
    }

    setSession(null);
    setUser(null);
    setMerchant(null);
    setDestinations([]);
    setReferenceQr(null);
  }, []);

  // Create Merchant Profile
  const createMerchantProfile = useCallback(
    async (businessName: string, contactEmail?: string): Promise<MerchantRecord> => {
      if (!user) {
        throw new Error('Cannot create merchant profile: No active user session.');
      }

      setAuthError(null);
      setIsMerchantLoading(true);
      try {
        const trimmedName = businessName.trim();
        if (!trimmedName) {
          throw new Error('Business name is required.');
        }

        const { data, error } = await supabase
          .from('merchants')
          .insert({
            user_id: user.id,
            business_name: trimmedName,
            contact_email: contactEmail?.trim() || user.email || null,
          })
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        const newMerchant = data as MerchantRecord;
        setMerchant(newMerchant);
        return newMerchant;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to create merchant profile.';
        setAuthError(msg);
        throw err;
      } finally {
        setIsMerchantLoading(false);
      }
    },
    [user],
  );

  // Register Trusted Payment Destination
  const registerDestination = useCallback(
    async (
      destinationType: 'VPA' | 'URL' | 'ACCOUNT',
      destinationValue: string,
      isActive: boolean = true,
    ): Promise<PaymentDestinationRecord> => {
      if (!merchant) {
        throw new Error('Cannot register destination: No merchant profile exists.');
      }

      setAuthError(null);
      setIsMerchantLoading(true);
      try {
        const trimmedValue = destinationValue.trim();
        if (!trimmedValue) {
          throw new Error('Destination value is required.');
        }

        const normalizedValue =
          destinationType === 'VPA' ? trimmedValue.toLowerCase() : trimmedValue;

        const { data, error } = await supabase
          .from('payment_destinations')
          .insert({
            merchant_id: merchant.id,
            destination_type: destinationType,
            destination_value: normalizedValue,
            is_active: isActive,
          })
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        const newDestination = data as PaymentDestinationRecord;
        setDestinations((prev) => [newDestination, ...prev]);
        return newDestination;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to register payment destination.';
        setAuthError(msg);
        throw err;
      } finally {
        setIsMerchantLoading(false);
      }
    },
    [merchant],
  );

  // Update existing destination
  const updateDestination = useCallback(
    async (
      destinationId: string,
      updates: { destination_value?: string; is_active?: boolean },
    ): Promise<PaymentDestinationRecord> => {
      if (!merchant) {
        throw new Error('Cannot update destination: No merchant profile exists.');
      }

      setAuthError(null);
      setIsMerchantLoading(true);
      try {
        const payload: { destination_value?: string; is_active?: boolean } = {};
        if (updates.destination_value !== undefined) {
          payload.destination_value = updates.destination_value.trim();
        }
        if (updates.is_active !== undefined) {
          payload.is_active = updates.is_active;
        }

        const { data, error } = await supabase
          .from('payment_destinations')
          .update(payload)
          .eq('id', destinationId)
          .eq('merchant_id', merchant.id)
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        const updatedDestination = data as PaymentDestinationRecord;
        setDestinations((prev) =>
          prev.map((d) => (d.id === destinationId ? updatedDestination : d)),
        );
        return updatedDestination;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Failed to update payment destination.';
        setAuthError(msg);
        throw err;
      } finally {
        setIsMerchantLoading(false);
      }
    },
    [merchant],
  );

  // Upload Reference QR Image
  const uploadReferenceQr = useCallback(
    async (file: File): Promise<ReferenceQrRecord> => {
      if (!merchant) {
        throw new Error('Cannot upload reference QR: No merchant profile exists.');
      }
      if (!session?.access_token) {
        throw new Error(
          'Cannot upload reference QR: Active authentication session required.',
        );
      }

      setAuthError(null);
      setIsReferenceQrLoading(true);
      try {
        const record = await apiUploadReferenceQr(
          merchant.id,
          file,
          session.access_token,
        );
        setReferenceQr(record);
        return record;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to upload reference QR.';
        setAuthError(msg);
        throw err;
      } finally {
        setIsReferenceQrLoading(false);
      }
    },
    [merchant, session],
  );

  // Delete Reference QR
  const deleteReferenceQr = useCallback(async (): Promise<void> => {
    if (!merchant) {
      throw new Error('Cannot delete reference QR: No merchant profile exists.');
    }
    if (!session?.access_token) {
      throw new Error(
        'Cannot delete reference QR: Active authentication session required.',
      );
    }

    setAuthError(null);
    setIsReferenceQrLoading(true);
    try {
      await apiDeleteReferenceQr(merchant.id, session.access_token);
      setReferenceQr(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete reference QR.';
      setAuthError(msg);
      throw err;
    } finally {
      setIsReferenceQrLoading(false);
    }
  }, [merchant, session]);

  // Manual refresh of merchant data
  const refreshMerchantData = useCallback(async () => {
    if (user?.id) {
      await loadMerchantAndDestinations(user.id, session?.access_token);
    }
  }, [user, session, loadMerchantAndDestinations]);

  const value = useMemo(
    () => ({
      user,
      session,
      merchant,
      destinations,
      referenceQr,
      isLoading,
      isMerchantLoading,
      isReferenceQrLoading,
      authError,
      signIn,
      signUp,
      signOut,
      createMerchantProfile,
      registerDestination,
      updateDestination,
      uploadReferenceQr,
      deleteReferenceQr,
      refreshMerchantData,
      clearAuthError,
    }),
    [
      user,
      session,
      merchant,
      destinations,
      referenceQr,
      isLoading,
      isMerchantLoading,
      isReferenceQrLoading,
      authError,
      signIn,
      signUp,
      signOut,
      createMerchantProfile,
      registerDestination,
      updateDestination,
      uploadReferenceQr,
      deleteReferenceQr,
      refreshMerchantData,
      clearAuthError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const defaultGuestAuth: AuthContextType = {
  user: null,
  session: null,
  merchant: null,
  destinations: [],
  referenceQr: null,
  isLoading: false,
  isMerchantLoading: false,
  isReferenceQrLoading: false,
  authError: null,
  signIn: async () => {},
  signUp: async () => ({ needsEmailConfirmation: false }),
  signOut: async () => {},
  createMerchantProfile: async () => ({
    id: '',
    user_id: '',
    business_name: '',
    registration_number: null,
    contact_email: null,
    created_at: '',
  }),
  registerDestination: async () => ({
    id: '',
    merchant_id: '',
    destination_type: 'VPA',
    destination_value: '',
    is_active: true,
    registered_at: '',
  }),
  updateDestination: async () => ({
    id: '',
    merchant_id: '',
    destination_type: 'VPA',
    destination_value: '',
    is_active: true,
    registered_at: '',
  }),
  uploadReferenceQr: async () => ({
    id: '',
    merchant_id: '',
    storage_path: '',
    payload_hash: '',
    raw_payload: '',
    uploaded_at: '',
    preview_url: null,
  }),
  deleteReferenceQr: async () => {},
  refreshMerchantData: async () => {},
  clearAuthError: () => {},
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  return context ?? defaultGuestAuth;
}
