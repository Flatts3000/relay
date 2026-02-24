import { get, patch, del } from './client';
import type {
  AdminOverview,
  AdminHub,
  AdminHubDetail,
  AdminGroup,
  AdminGroupDetail,
  AdminUser,
  AdminUserDetail,
  AdminAuditEntry,
  AdminVerificationRequest,
  AdminFundingRequest,
  AdminFundingRequestDetail,
  PaginatedResponse,
  UserRole,
  VerificationStatus,
  VerificationRequestStatus,
  RequestStatus,
} from './types';

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// Overview
export function getAdminOverview(): Promise<AdminOverview> {
  return get('/api/admin/overview');
}

// Hubs
export function getAdminHubs(
  search?: string,
  page = 1,
  limit = 25
): Promise<PaginatedResponse<AdminHub>> {
  return get(`/api/admin/hubs${qs({ search, page, limit })}`);
}

export function getAdminHub(id: string): Promise<AdminHubDetail> {
  return get(`/api/admin/hubs/${id}`);
}

// Groups
export function getAdminGroups(
  search?: string,
  status?: VerificationStatus,
  hubId?: string,
  page = 1,
  limit = 25
): Promise<PaginatedResponse<AdminGroup>> {
  return get(`/api/admin/groups${qs({ search, status, hubId, page, limit })}`);
}

export function getAdminGroup(id: string): Promise<AdminGroupDetail> {
  return get(`/api/admin/groups/${id}`);
}

// Users
export function getAdminUsers(
  search?: string,
  role?: UserRole,
  page = 1,
  limit = 25
): Promise<PaginatedResponse<AdminUser>> {
  return get(`/api/admin/users${qs({ search, role, page, limit })}`);
}

export function getAdminUser(id: string): Promise<AdminUserDetail> {
  return get(`/api/admin/users/${id}`);
}

export function updateUserRole(
  id: string,
  role: UserRole
): Promise<{ id: string; email: string; role: UserRole }> {
  return patch(`/api/admin/users/${id}/role`, { role });
}

export function deleteUser(id: string): Promise<{ message: string }> {
  return del(`/api/admin/users/${id}`);
}

// Verification
export function getAdminVerification(
  status?: VerificationRequestStatus,
  page = 1,
  limit = 25
): Promise<PaginatedResponse<AdminVerificationRequest>> {
  return get(`/api/admin/verification${qs({ status, page, limit })}`);
}

export function getAdminVerificationRequest(id: string): Promise<AdminVerificationRequest> {
  return get(`/api/admin/verification/${id}`);
}

export function approveVerification(id: string): Promise<{ message: string }> {
  return patch(`/api/admin/verification/${id}/approve`, {});
}

export function denyVerification(id: string, reason: string): Promise<{ message: string }> {
  return patch(`/api/admin/verification/${id}/deny`, { reason });
}

// Funding Requests
export function getAdminFundingRequests(
  status?: RequestStatus,
  groupId?: string,
  page = 1,
  limit = 25
): Promise<PaginatedResponse<AdminFundingRequest>> {
  return get(`/api/admin/funding-requests${qs({ status, groupId, page, limit })}`);
}

export function getAdminFundingRequest(id: string): Promise<AdminFundingRequestDetail> {
  return get(`/api/admin/funding-requests/${id}`);
}

export function approveFundingRequest(id: string): Promise<{ message: string }> {
  return patch(`/api/admin/funding-requests/${id}/approve`, {});
}

export function declineFundingRequest(id: string, reason: string): Promise<{ message: string }> {
  return patch(`/api/admin/funding-requests/${id}/decline`, { reason });
}

export function markFundsSent(id: string): Promise<{ message: string }> {
  return patch(`/api/admin/funding-requests/${id}/send-funds`, {});
}

export function acknowledgeFunding(id: string): Promise<{ message: string }> {
  return patch(`/api/admin/funding-requests/${id}/acknowledge`, {});
}

// Audit Log
export function getAdminAuditLog(
  page = 1,
  limit = 25,
  filters?: { userId?: string; action?: string; entityType?: string }
): Promise<PaginatedResponse<AdminAuditEntry>> {
  return get(`/api/admin/audit-log${qs({ page, limit, ...filters })}`);
}
