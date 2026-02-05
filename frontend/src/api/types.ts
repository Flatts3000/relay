// Aid categories and verification statuses matching backend
export const AID_CATEGORIES = ['rent', 'food', 'utilities', 'other'] as const;
export type AidCategory = (typeof AID_CATEGORIES)[number];

export const VERIFICATION_STATUSES = ['pending', 'verified', 'revoked'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const USER_ROLES = ['hub_admin', 'group_coordinator'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// User types
export interface User {
  id: string;
  email: string;
  role: UserRole;
  hubId: string | null;
  groupId: string | null;
}

// Group types
export interface Group {
  id: string;
  hubId: string;
  name: string;
  serviceArea: string;
  aidCategories: AidCategory[];
  contactEmail: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupInput {
  name: string;
  serviceArea: string;
  aidCategories: AidCategory[];
  contactEmail: string;
}

export interface UpdateGroupInput {
  name?: string;
  serviceArea?: string;
  aidCategories?: AidCategory[];
  contactEmail?: string;
}

export interface GroupsListResponse {
  groups: Group[];
  total: number;
}

export interface ListGroupsQuery {
  verificationStatus?: VerificationStatus;
  aidCategory?: AidCategory;
  search?: string;
}

// Auth types
export interface LoginResponse {
  message: string;
}

export interface VerifyResponse {
  user: User;
  sessionToken: string;
}

// API error type
export interface ApiError {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}
