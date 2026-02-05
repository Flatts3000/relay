import type { ApiError } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Session token storage
let sessionToken: string | null = null;

export function setSessionToken(token: string | null): void {
  sessionToken = token;
  if (token) {
    localStorage.setItem('sessionToken', token);
  } else {
    localStorage.removeItem('sessionToken');
  }
}

export function getSessionToken(): string | null {
  if (!sessionToken) {
    sessionToken = localStorage.getItem('sessionToken');
  }
  return sessionToken;
}

export function clearSession(): void {
  sessionToken = null;
  localStorage.removeItem('sessionToken');
}

// Custom error class for API errors
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: ApiError['details']
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

// Base fetch function with auth handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getSessionToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Session expired or invalid - clear and let caller handle
    clearSession();
    throw new ApiRequestError('Session expired', 401);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new ApiRequestError(
      data.error || 'Request failed',
      response.status,
      data.details
    );
  }

  return data as T;
}

// HTTP method helpers
export async function get<T>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: 'GET' });
}

export async function post<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function patch<T>(endpoint: string, body: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function del<T>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, { method: 'DELETE' });
}
