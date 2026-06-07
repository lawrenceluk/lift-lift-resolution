import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getAppSecret, setAppSecret, clearAppSecret } from '@/lib/api';

/**
 * Shell-level access-code gate. Wraps the whole app OUTSIDE the workout module
 * providers. On mount it reads localStorage["app_secret"]; if absent it renders
 * a single centered access-code prompt instead of the app. Once a code is set,
 * every /api/* call sends it as `x-app-secret` (centralized in lib/api.ts).
 *
 * This is intentionally NOT real auth — it is a single shared code for a
 * single-user personal tool. The backend only enforces it when APP_SECRET is set.
 */

interface SecretGateContextValue {
  /** Clear the stored code and return to the gate (the "sign out" affordance). */
  forgetCode: () => void;
}

const SecretGateContext = createContext<SecretGateContextValue | undefined>(undefined);

/** Access the gate controls (e.g. a "forget access code" menu item). */
export function useSecretGate(): SecretGateContextValue {
  const ctx = useContext(SecretGateContext);
  if (!ctx) {
    throw new Error('useSecretGate must be used within a SecretGate');
  }
  return ctx;
}

export function SecretGate({ children }: { children: ReactNode }) {
  const [hasSecret, setHasSecret] = useState<boolean>(() => !!getAppSecret());
  const [input, setInput] = useState('');

  // Keep state in sync if the code is cleared/set in another tab.
  useEffect(() => {
    const onStorage = () => setHasSecret(!!getAppSecret());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = input.trim();
    if (!code) return;
    setAppSecret(code);
    setInput('');
    setHasSecret(true);
  };

  const forgetCode = () => {
    clearAppSecret();
    setHasSecret(false);
  };

  if (!hasSecret) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-4">
        <form
          onSubmit={submit}
          className="flex w-full max-w-xs flex-col items-stretch gap-4 text-center"
        >
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-gray-900">Lift Lift Resolution</h1>
            <p className="text-sm text-gray-500">Enter access code</p>
          </div>
          <Input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Access code"
            autoFocus
            aria-label="Access code"
          />
          <Button type="submit" disabled={!input.trim()}>
            Continue
          </Button>
        </form>
      </div>
    );
  }

  return (
    <SecretGateContext.Provider value={{ forgetCode }}>
      {children}
    </SecretGateContext.Provider>
  );
}
