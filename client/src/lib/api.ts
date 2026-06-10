/**
 * Base API client for making requests to the backend git seam.
 *
 * Every /api/* call routes through `apiRequest`, which attaches the stored
 * access code as the `x-app-secret` header. The code is set by the shell-level
 * SecretGate (see components/SecretGate.tsx) and lives in localStorage.
 */

import type { ProgramEnvelope, PerformedSession } from '@/types/workout';

const SECRET_KEY = 'app_secret';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiRequestOptions extends RequestInit {
  // Add any custom options here if needed
}

/** Read the stored access code (set by the SecretGate). */
export function getAppSecret(): string | null {
  try {
    return localStorage.getItem(SECRET_KEY);
  } catch {
    return null;
  }
}

/** Store the access code (called by the SecretGate on submit). */
export function setAppSecret(secret: string): void {
  localStorage.setItem(SECRET_KEY, secret);
}

/** Forget the access code (the "sign out" affordance). */
export function clearAppSecret(): void {
  localStorage.removeItem(SECRET_KEY);
}

/**
 * Make a request to the API.
 * @param endpoint - API endpoint (without /api prefix, e.g. '/health' or '/program')
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
export async function apiRequest<T>(
  endpoint: string,
  options?: ApiRequestOptions
): Promise<T> {
  const url = `/api${endpoint}`;

  const secret = getAppSecret();
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-app-secret': secret } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new ApiError(
      response.status,
      errorText || `Request failed with status ${response.status}`
    );
  }

  return response.json();
}

/**
 * Health check - verify server is running.
 */
export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  return apiRequest('/health');
}

/**
 * Read path: GET the current program envelope (schema 2) the brain wrote.
 */
export async function fetchProgram(): Promise<ProgramEnvelope> {
  return apiRequest<ProgramEnvelope>('/program');
}

/** Backend response shape for a committed session. */
export interface PostSessionResult {
  ok: boolean;
  path: string;
  committed: boolean;
}

/**
 * Write path: POST one performed session record (device-truth actuals). The
 * backend files it by `performedDate` (D8) and commits that one file — never
 * the program. Same-day re-delivery overwrites the same file (D9).
 */
export async function postSession(session: PerformedSession): Promise<PostSessionResult> {
  return apiRequest<PostSessionResult>('/session', {
    method: 'POST',
    body: JSON.stringify(session),
  });
}
