import React, { createContext, useEffect, useState, useCallback } from 'react';
import { AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AuthContextType, AuthState } from '@/types/auth';

/**
 * Auth context for managing authentication state and operations
 */
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider component - wraps app to provide auth context
 * Handles auth state, persistence, and operations (sign up, sign in, sign out)
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    error: null,
  });

  /**
   * Initialize auth state from Supabase session
   */
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get current session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          setState({
            user: session?.user ?? null,
            session: session ?? null,
            isLoading: false,
            error: null,
          });
        }
      } catch (error) {
        if (mounted) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to initialize auth',
          }));
        }
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session) => {
      if (mounted) {
        setState({
          user: session?.user ?? null,
          session: session ?? null,
          isLoading: false,
          error: null,
        });
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Get the correct redirect URL based on environment
   */
  const getRedirectUrl = (): string => {
    // In production, use the current origin
    // In development (Replit), use the Replit dev server URL if available
    const origin = window.location.origin;
    return `${origin}/login/callback`;
  };

  /**
   * Send OTP code to email
   * Works for both new users (signup) and existing users (signin)
   */
  const sendOtp = useCallback(
    async (email: string) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const { error } = await supabase.auth.signInWithOtp({
          email,
        });

        if (error) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: error.message,
          }));
          return { error: error.message };
        }

        setState((prev) => ({ ...prev, isLoading: false }));
        return { error: null };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send OTP code';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        return { error: message };
      }
    },
    []
  );

  /**
   * Verify OTP code
   * User enters the 6-digit code they received in email
   */
  const verifyOtp = useCallback(
    async (email: string, token: string) => {
      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const { data, error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: 'email',
        });

        if (error) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: error.message,
          }));
          return { error: error.message };
        }

        // Session is set automatically by Supabase
        setState((prev) => ({
          ...prev,
          user: data.user ?? null,
          session: data.session ?? null,
          isLoading: false,
        }));
        return { error: null };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to verify OTP code';
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: message,
        }));
        return { error: message };
      }
    },
    []
  );

  /**
   * Sign up with OTP (kept for backward compatibility)
   * @deprecated Use sendOtp and verifyOtp instead
   */
  const signUpWithMagicLink = useCallback(
    async (email: string) => {
      return sendOtp(email);
    },
    [sendOtp]
  );

  /**
   * Sign in with OTP (kept for backward compatibility)
   * @deprecated Use sendOtp and verifyOtp instead
   */
  const signInWithMagicLink = useCallback(
    async (email: string) => {
      return sendOtp(email);
    },
    [sendOtp]
  );

  /**
   * Sign out current user
   */
  const signOut = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const { error } = await supabase.auth.signOut();

      if (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error.message,
        }));
        return;
      }

      setState({
        user: null,
        session: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign out failed',
      }));
    }
  }, []);

  const value: AuthContextType = {
    ...state,
    sendOtp,
    verifyOtp,
    signUpWithMagicLink,
    signInWithMagicLink,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
