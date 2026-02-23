/**
 * Invites API client for group coordinators.
 * These endpoints require authentication (group_coordinator role).
 */

import type { Invite, InviteCiphertextResponse } from './types';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('sessionToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Fetch pending invites for the authenticated user's group.
 */
export async function fetchInvites(): Promise<Invite[]> {
  const response = await fetch(`${API_BASE}/api/invites`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch invites');
  }

  const data = await response.json();
  return data.invites;
}

/**
 * Fetch the ciphertext and nonce for a specific invite's broadcast.
 */
export async function fetchCiphertext(inviteId: string): Promise<InviteCiphertextResponse> {
  const response = await fetch(`${API_BASE}/api/invites/${inviteId}/ciphertext`, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch ciphertext');
  }

  return response.json();
}

/**
 * Mark an invite as decrypted. Starts 10-minute auto-delete countdown.
 */
export async function markDecrypted(inviteId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/invites/${inviteId}/decrypt`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to mark invite as decrypted');
  }
}

/**
 * Hard delete an invite.
 */
export async function deleteInvite(inviteId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/invites/${inviteId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to delete invite');
  }
}
