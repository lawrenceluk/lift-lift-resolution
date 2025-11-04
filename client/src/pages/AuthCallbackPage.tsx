import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

/**
 * AuthCallbackPage handles the magic link redirect from Supabase
 * When user clicks the magic link in their email, they're redirected here
 * Supabase automatically processes the link and sets the session
 * We just need to redirect to home once auth is complete
 */
export const AuthCallbackPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if there's an error in the URL (from Supabase)
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get('error');
    const errorDescription = params.get('error_description');

    if (errorParam) {
      setError(errorDescription || 'Authentication failed. Please try again.');
      return;
    }

    // Wait for auth state to be loaded
    if (!isLoading && user) {
      // User is authenticated, redirect to home
      setLocation('/');
    } else if (!isLoading && !user && !errorParam) {
      // Auth state loaded but no user and no error
      // This shouldn't happen, but give user a chance to retry
      setError('Authentication link expired or invalid. Please request a new link.');
    }
  }, [user, isLoading, setLocation]);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Failed</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <a
              href="/login"
              className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
              <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Signing you in...</h1>
            <p className="text-gray-600">Just a moment, we're verifying your email.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
