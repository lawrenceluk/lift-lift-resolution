import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { OtpVerificationForm } from './OtpVerificationForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LoginFormProps {
  onSuccess?: () => void;
}

/**
 * Unified login form for OTP-based authentication
 * Two-step process:
 * 1. User enters email
 * 2. User enters 6-digit code from email
 * Works for both new users (signup) and existing users (signin)
 */
export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { sendOtp, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [step, setStep] = useState<'email' | 'otp'>('email');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validation
    if (!email.trim()) {
      setLocalError('Email is required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setLocalError('Please enter a valid email address');
      return;
    }

    // Send OTP code
    const { error: sendError } = await sendOtp(email);

    if (sendError) {
      setLocalError(sendError);
      return;
    }

    // Move to OTP verification step
    setStep('otp');
  };

  if (step === 'otp') {
    return (
      <OtpVerificationForm
        email={email}
        onSuccess={onSuccess}
        onBackToEmail={() => {
          setStep('email');
          setLocalError(null);
        }}
      />
    );
  }

  return (
    <form onSubmit={handleEmailSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isLoading}
          autoComplete="email"
        />
      </div>

      {(error || localError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          {error || localError}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Sending code...' : 'Send Code'}
      </Button>

      <p className="text-center text-xs text-gray-600">
        New here? No problem. We'll create your account when you verify your email.
      </p>
    </form>
  );
};
