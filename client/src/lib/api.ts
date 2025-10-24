/**
 * Base API client for making requests to the backend
 */

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

/**
 * Make a request to the API
 * @param endpoint - API endpoint (without /api prefix, e.g., '/health' or '/chat')
 * @param options - Fetch options
 * @returns Parsed JSON response
 */
export async function apiRequest<T>(
  endpoint: string,
  options?: ApiRequestOptions
): Promise<T> {
  const url = `/api${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
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
 * Health check - verify server is running
 */
export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  return apiRequest('/health');
}
