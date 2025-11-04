import { User, Session } from '@supabase/supabase-js';

/**
 * Represents the current authentication state
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * User profile data stored in database
 */
export interface UserProfile {
  id: string;
  user_id: string;
  name?: string;
  height?: string;
  weight?: string;
  notes?: string;
  coach_notes?: string;
  updated_at?: string;
}

/**
 * Auth context type
 */
export interface AuthContextType extends AuthState {
  /**
   * Send OTP code to email
   * User will receive email with 6-digit code
   */
  sendOtp: (email: string) => Promise<{ error: string | null }>;

  /**
   * Verify OTP code entered by user
   * Completes authentication if code is valid
   */
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;

  /**
   * Send magic link to email for signup (deprecated)
   * Use sendOtp instead
   */
  signUpWithMagicLink: (email: string) => Promise<{ error: string | null }>;

  /**
   * Send magic link to email for signin (deprecated)
   * Use sendOtp instead
   */
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;

  /**
   * Sign out current user
   */
  signOut: () => Promise<void>;
}
