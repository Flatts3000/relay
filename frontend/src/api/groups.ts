import { get, post, patch, put, del } from './client';
import type {
  Group,
  CreateGroupInput,
  UpdateGroupInput,
  GroupsListResponse,
  ListGroupsQuery,
} from './types';

export async function createGroup(input: CreateGroupInput): Promise<{ group: Group }> {
  return post<{ group: Group }>('/api/groups', input);
}

export async function getGroups(query?: ListGroupsQuery): Promise<GroupsListResponse> {
  const params = new URLSearchParams();

  if (query?.verificationStatus) {
    params.set('verificationStatus', query.verificationStatus);
  }
  if (query?.aidCategory) {
    params.set('aidCategory', query.aidCategory);
  }
  if (query?.search) {
    params.set('search', query.search);
  }

  const queryString = params.toString();
  const endpoint = queryString ? `/api/groups?${queryString}` : '/api/groups';

  return get<GroupsListResponse>(endpoint);
}

export async function getGroup(id: string): Promise<{ group: Group }> {
  return get<{ group: Group }>(`/api/groups/${id}`);
}

export async function updateGroup(id: string, input: UpdateGroupInput): Promise<{ group: Group }> {
  return patch<{ group: Group }>(`/api/groups/${id}`, input);
}

export async function deleteGroup(id: string): Promise<void> {
  return del<void>(`/api/groups/${id}`);
}

/**
 * The signed-in coordinator's own group, including its broadcast key salt.
 *
 * Distinct from getGroup(id): only this view carries key material, and a
 * coordinator should not need to know their group's uuid to read it.
 */
export async function getMyGroup(): Promise<{ group: Group }> {
  return get<{ group: Group }>('/api/groups/me');
}

/**
 * Register the group's broadcast key.
 *
 * Only the public half and the salt are sent. The passphrase and the private key
 * stay in the browser, which is what keeps Relay unable to read help requests.
 */
export async function setBroadcastKey(input: {
  publicKey: string;
  keySalt: string;
}): Promise<{ invitesDiscarded: number }> {
  return put<{ invitesDiscarded: number }>('/api/groups/me/broadcast-key', input);
}
