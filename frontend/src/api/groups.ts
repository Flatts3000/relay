import { get, post, patch } from './client';
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

export async function updateGroup(
  id: string,
  input: UpdateGroupInput
): Promise<{ group: Group }> {
  return patch<{ group: Group }>(`/api/groups/${id}`, input);
}
