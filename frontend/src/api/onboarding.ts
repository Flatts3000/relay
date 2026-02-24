import { get, post, del } from './client';
import type {
  InviteContext,
  OnboardingInvite,
  CreateInviteInput,
  AcceptInviteResponse,
  SetupHubInput,
  SetupGroupInput,
  TeamMember,
} from './types';

// Invite management (authenticated)
export async function createInvite(input: CreateInviteInput): Promise<OnboardingInvite> {
  return post('/api/onboarding/invites', input);
}

export async function listInvites(): Promise<{ invites: OnboardingInvite[] }> {
  return get('/api/onboarding/invites');
}

export async function revokeInvite(inviteId: string): Promise<void> {
  await del(`/api/onboarding/invites/${inviteId}`);
}

// Invite acceptance (unauthenticated)
export async function getInviteContext(token: string): Promise<InviteContext> {
  return get(`/api/onboarding/accept?token=${encodeURIComponent(token)}`);
}

export async function acceptHubOwner(input: SetupHubInput): Promise<AcceptInviteResponse> {
  return post('/api/onboarding/accept/hub-owner', input);
}

export async function acceptHubStaff(token: string): Promise<AcceptInviteResponse> {
  return post('/api/onboarding/accept/hub-staff', { token });
}

export async function acceptGroupOwner(input: SetupGroupInput): Promise<AcceptInviteResponse> {
  return post('/api/onboarding/accept/group-owner', input);
}

export async function acceptGroupStaff(token: string): Promise<AcceptInviteResponse> {
  return post('/api/onboarding/accept/group-staff', { token });
}

export async function acceptStaffAdmin(token: string): Promise<AcceptInviteResponse> {
  return post('/api/onboarding/accept/staff-admin', { token });
}

export async function acceptHubMembership(token: string): Promise<{ sessionToken: string }> {
  return post('/api/onboarding/accept/hub-membership', { token, confirm: true });
}

// Staff management (authenticated)
export async function listHubMembers(hubId: string): Promise<{ members: TeamMember[] }> {
  return get(`/api/onboarding/hub/${hubId}/members`);
}

export async function removeHubMember(hubId: string, userId: string): Promise<void> {
  await del(`/api/onboarding/hub/${hubId}/members/${userId}`);
}

export async function listGroupMembers(groupId: string): Promise<{ members: TeamMember[] }> {
  return get(`/api/onboarding/group/${groupId}/members`);
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  await del(`/api/onboarding/group/${groupId}/members/${userId}`);
}
