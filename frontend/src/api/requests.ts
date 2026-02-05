import { get, post } from './client';
import type {
  FundingRequest,
  StatusHistoryEntry,
  CreateFundingRequestInput,
  DeclineFundingRequestInput,
  ClarifyFundingRequestInput,
  FundingRequestsListResponse,
  ListFundingRequestsQuery,
} from './types';

export async function createFundingRequest(
  input: CreateFundingRequestInput
): Promise<{ request: FundingRequest }> {
  return post<{ request: FundingRequest }>('/api/requests', input);
}

export async function getFundingRequests(
  query?: ListFundingRequestsQuery
): Promise<FundingRequestsListResponse> {
  const params = new URLSearchParams();

  if (query?.status) {
    params.set('status', query.status);
  }
  if (query?.category) {
    params.set('category', query.category);
  }
  if (query?.urgency) {
    params.set('urgency', query.urgency);
  }
  if (query?.sortBy) {
    params.set('sortBy', query.sortBy);
  }

  const queryString = params.toString();
  const endpoint = queryString ? `/api/requests?${queryString}` : '/api/requests';

  return get<FundingRequestsListResponse>(endpoint);
}

export async function getFundingRequestDetail(
  id: string
): Promise<{ request: FundingRequest; history: StatusHistoryEntry[] }> {
  return get<{ request: FundingRequest; history: StatusHistoryEntry[] }>(`/api/requests/${id}`);
}

export async function approveFundingRequest(id: string): Promise<{ request: FundingRequest }> {
  return post<{ request: FundingRequest }>(`/api/requests/${id}/approve`);
}

export async function declineFundingRequest(
  id: string,
  input: DeclineFundingRequestInput
): Promise<{ request: FundingRequest }> {
  return post<{ request: FundingRequest }>(`/api/requests/${id}/decline`, input);
}

export async function requestClarification(
  id: string,
  input: ClarifyFundingRequestInput
): Promise<{ request: FundingRequest }> {
  return post<{ request: FundingRequest }>(`/api/requests/${id}/clarify`, input);
}

export async function markFundsSent(id: string): Promise<{ request: FundingRequest }> {
  return post<{ request: FundingRequest }>(`/api/requests/${id}/mark-sent`);
}

export async function acknowledgeReceipt(id: string): Promise<{ request: FundingRequest }> {
  return post<{ request: FundingRequest }>(`/api/requests/${id}/acknowledge`);
}
