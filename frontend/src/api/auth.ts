import { get, post, setSessionToken, clearSession } from './client';
import type { User, LoginResponse, VerifyResponse } from './types';

export async function requestMagicLink(email: string): Promise<LoginResponse> {
  return post<LoginResponse>('/api/auth/login', { email });
}

export async function verifyToken(token: string): Promise<VerifyResponse> {
  const response = await post<VerifyResponse>('/api/auth/verify', { token });
  setSessionToken(response.sessionToken);
  return response;
}

export async function getCurrentUser(): Promise<{ user: User }> {
  return get<{ user: User }>('/api/auth/me');
}

export async function logout(): Promise<void> {
  try {
    await post('/api/auth/logout');
  } finally {
    clearSession();
  }
}
