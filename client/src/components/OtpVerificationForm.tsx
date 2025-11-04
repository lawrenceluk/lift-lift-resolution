import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface OtpVerificationFormProps {
  email: string;
  onSuccess?: () => void;
  onBackToEmail?: () => void;
}

/**
 * OTP verification form
 * User enters the 6-digit code they received in their email
 */
export const OtpVerificationForm: React.FC<OtpVerificationFormProps> = ({
  email,
  onSuccess,
  onBackToEmail,
}) => {
  const { verifyOtp, isLoading, error } = useAuth();
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus on input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validation: code should be 6 digits
    if (!code.trim()) {
      setLocalError('Please enter the 6-digit code');
      return;
    }

    if (code.replace(/\s/g, '').length !== 6) {
      setLocalError('Code must be 6 digits');
      return;
    }

    // Remove spaces and verify
    const cleanCode = code.replace(/\s/g, '');
    const { error: verifyError } = await verifyOtp(email, cleanCode);

    if (verifyError) {
      setLocalError(verifyError);
      return;
    }

    // Parent component will handle toast and redirect
    onSuccess?.();
  };

  // Format code input with spaces (123456 -> 123 456)
  // Auto-submit when 6 digits are entered
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ''); // Only allow digits
    value = value.slice(0, 6); // Limit to 6 digits

    // Add space after 3rd digit
    if (value.length > 3) {
      value = value.slice(0, 3) + ' ' + value.slice(3);
    }

    setCode(value);

    // Auto-submit when 6 digits are entered
    if (value.replace(/\s/g, '').length === 6 && !isLoading) {
      // Use setTimeout to allow state to update first
      setTimeout(() => {
        // Trigger form submission
        inputRef.current?.form?.dispatchEvent(
          new Event('submit', { bubbles: true, cancelable: true })
        );
      }, 0);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <p className="text-sm text-gray-600 mb-2">
          Enter the 6-digit code we sent to:
        </p>
        <p className="font-medium text-gray-900">{email}</p>
      </div>

      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
          Verification Code
        </label>
        <Input
          ref={inputRef}
          id="code"
          type="text"
          value={code}
          onChange={handleCodeChange}
          placeholder="123 456"
          disabled={isLoading}
          autoComplete="one-time-code"
          maxLength={7} // 6 digits + 1 space
          className="text-center text-lg tracking-widest"
          inputMode="numeric"
        />
        <p className="text-xs text-gray-500 text-center mt-2">
          Check your spam folder if you don't see the email
        </p>
      </div>

      {(error || localError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          {error || localError}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading || code.replace(/\s/g, '').length !== 6}>
        {isLoading ? 'Verifying...' : 'Verify Code'}
      </Button>

      <button
        type="button"
        onClick={onBackToEmail}
        className="w-full text-sm text-blue-600 hover:underline font-medium py-2"
      >
        Use a different email
      </button>
    </form>
  );
};
