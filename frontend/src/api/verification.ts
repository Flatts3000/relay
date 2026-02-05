import { get, post } from './client';
import type {
  VerificationRequest,
  PeerAttestation,
  CreateVerificationRequestInput,
  DenyVerificationInput,
  VerificationRequestsListResponse,
  ListVerificationRequestsQuery,
} from './types';

// Group coordinator endpoints

export async function requestVerification(
  groupId: string,
  input: CreateVerificationRequestInput
): Promise<{ request: VerificationRequest }> {
  return post<{ request: VerificationRequest }>(
    `/api/verification/groups/${groupId}/request`,
    input
  );
}

export async function getVerificationStatus(
  groupId: string
): Promise<{ request: VerificationRequest | null }> {
  return get<{ request: VerificationRequest | null }>(`/api/verification/groups/${groupId}/status`);
}

export async function getAttestationRequests(): Promise<{ requests: VerificationRequest[] }> {
  return get<{ requests: VerificationRequest[] }>('/api/verification/attestation-requests');
}

export async function submitAttestation(
  requestId: string
): Promise<{ attestation: PeerAttestation }> {
  return post<{ attestation: PeerAttestation }>(`/api/verification/requests/${requestId}/attest`);
}

// Hub admin endpoints

export async function getVerificationRequests(
  query?: ListVerificationRequestsQuery
): Promise<VerificationRequestsListResponse> {
  const params = new URLSearchParams();

  if (query?.status) {
    params.set('status', query.status);
  }
  if (query?.method) {
    params.set('method', query.method);
  }

  const queryString = params.toString();
  const endpoint = queryString
    ? `/api/verification/requests?${queryString}`
    : '/api/verification/requests';

  return get<VerificationRequestsListResponse>(endpoint);
}

export async function getVerificationRequestDetail(
  requestId: string
): Promise<{ request: VerificationRequest; attestations: PeerAttestation[] }> {
  return get<{ request: VerificationRequest; attestations: PeerAttestation[] }>(
    `/api/verification/requests/${requestId}`
  );
}

export async function approveVerification(
  requestId: string
): Promise<{ request: VerificationRequest }> {
  return post<{ request: VerificationRequest }>(`/api/verification/requests/${requestId}/approve`);
}

export async function denyVerification(
  requestId: string,
  input: DenyVerificationInput
): Promise<{ request: VerificationRequest }> {
  return post<{ request: VerificationRequest }>(
    `/api/verification/requests/${requestId}/deny`,
    input
  );
}

export async function revokeVerification(groupId: string): Promise<void> {
  return post<void>(`/api/verification/groups/${groupId}/revoke`);
}
