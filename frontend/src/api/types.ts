// Aid categories and verification statuses matching backend
export const AID_CATEGORIES = ['rent', 'food', 'utilities', 'other'] as const;
export type AidCategory = (typeof AID_CATEGORIES)[number];

export const VERIFICATION_STATUSES = ['pending', 'verified', 'revoked'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const USER_ROLES = ['hub_admin', 'group_coordinator', 'staff_admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// User types
export interface User {
  id: string;
  email: string;
  role: UserRole;
  hubId: string | null;
  groupId: string | null;
  hubName: string | null;
  groupName: string | null;
  isOwner: boolean;
  groupServiceArea: string | null;
}

// Group types
export interface Group {
  id: string;
  name: string;
  serviceArea: string;
  aidCategories: AidCategory[];
  contactEmail: string;
  verificationStatus?: VerificationStatus;
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

// Verification types
export const VERIFICATION_METHODS = [
  'hub_approval',
  'peer_attestation',
  'sponsor_reference',
] as const;
export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const VERIFICATION_REQUEST_STATUSES = ['pending', 'approved', 'denied'] as const;
export type VerificationRequestStatus = (typeof VERIFICATION_REQUEST_STATUSES)[number];

export interface VerificationRequest {
  id: string;
  groupId: string;
  groupName: string;
  groupServiceArea: string;
  method: VerificationMethod;
  status: VerificationRequestStatus;
  sponsorInfo: string | null;
  attestationCount: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
  denialReason: string | null;
  createdAt: string;
}

export interface PeerAttestation {
  id: string;
  attestingGroupId: string;
  attestingGroupName: string;
  attestedAt: string;
}

export interface CreateVerificationRequestInput {
  method: VerificationMethod;
  sponsorInfo?: string;
}

export interface DenyVerificationInput {
  reason: string;
}

export interface VerificationRequestsListResponse {
  requests: VerificationRequest[];
  total: number;
}

export interface ListVerificationRequestsQuery {
  status?: VerificationRequestStatus;
  method?: VerificationMethod;
}

// Funding request types
export const REQUEST_STATUSES = [
  'submitted',
  'approved',
  'declined',
  'funds_sent',
  'acknowledged',
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const URGENCIES = ['normal', 'urgent'] as const;
export type Urgency = (typeof URGENCIES)[number];

export interface FundingRequest {
  id: string;
  groupId: string;
  groupName: string;
  amount: string;
  category: AidCategory;
  urgency: Urgency;
  region: string;
  justification: string | null;
  status: RequestStatus;
  declineReason: string | null;
  clarificationRequest: string | null;
  approvedBy: string | null;
  submittedAt: string;
  approvedAt: string | null;
  declinedAt: string | null;
  fundsSentAt: string | null;
  acknowledgedAt: string | null;
}

export interface StatusHistoryEntry {
  id: string;
  status: RequestStatus;
  changedBy: string | null;
  changedAt: string;
  notes: string | null;
}

export interface CreateFundingRequestInput {
  amount: number;
  category: AidCategory;
  urgency: Urgency;
  region: string;
  justification?: string;
}

export interface DeclineFundingRequestInput {
  reason: string;
}

export interface ClarifyFundingRequestInput {
  message: string;
}

export interface FundingRequestsListResponse {
  requests: FundingRequest[];
  total: number;
}

export interface ListFundingRequestsQuery {
  status?: RequestStatus;
  category?: AidCategory;
  urgency?: Urgency;
  sortBy?: 'newest' | 'oldest' | 'amount_high' | 'amount_low' | 'urgent';
}

// Anonymous mailbox types
export const DELETION_TYPES = ['manual', 'auto_inactivity'] as const;
export type DeletionType = (typeof DELETION_TYPES)[number];

export interface Mailbox {
  id: string;
  helpCategory: AidCategory;
  region: string;
  createdAt: string;
  messages: MailboxMessage[];
}

export interface MailboxMessage {
  id: string;
  groupId: string;
  groupName: string;
  ciphertext: string; // base64-encoded
  createdAt: string;
}

export interface CreateMailboxInput {
  publicKey: string; // base64-encoded
  helpCategory: AidCategory;
  region: string;
}

export interface CreateMailboxResponse {
  id: string;
}

// Help requests (group coordinator view)
export interface HelpRequest {
  mailboxId: string;
  helpCategory: AidCategory;
  region: string;
  createdAt: string;
}

export interface HelpRequestsListResponse {
  requests: HelpRequest[];
  total: number;
}

export interface ListHelpRequestsQuery {
  category?: AidCategory;
}

export interface PublicKeyResponse {
  publicKey: string; // base64-encoded
}

export interface SendReplyInput {
  ciphertext: string; // base64-encoded
}

export interface SendReplyResponse {
  id: string;
}

export interface Tombstone {
  helpCategory: AidCategory;
  region: string;
  deletedAt: string;
  deletionType: DeletionType;
}

export interface TombstonesListResponse {
  tombstones: Tombstone[];
  total: number;
}

// Broadcast categories (separate from AidCategory — used for encrypted help broadcasts)
export const BROADCAST_CATEGORIES = [
  'food',
  'shelter_housing',
  'transportation',
  'medical',
  'safety_escort',
  'childcare',
  'legal',
  'supplies',
  'other',
] as const;
export type BroadcastCategory = (typeof BROADCAST_CATEGORIES)[number];

// Directory types (public, anonymous)
export interface DirectoryEntry {
  id: string;
  name: string;
  serviceArea: string;
  broadcastCategories: BroadcastCategory[] | null;
  publicKey: string; // base64-encoded
  broadcastServiceArea: string | null;
}

// Dashboard types (group coordinator)
export interface DashboardSummary {
  group: { id: string; name: string; verificationStatus: VerificationStatus };
  pendingInvites: number;
  fundingRequests: {
    submitted: number;
    approved: number;
    declined: number;
    fundsSent: number;
    acknowledged: number;
  };
}

// Public directory types (anonymous, no auth)
export interface PublicDirectoryEntry {
  id: string;
  name: string;
  serviceArea: string;
  aidCategories: AidCategory[];
  contactEmail: string;
}

// Broadcast submission types (anonymous)
export interface BroadcastSubmitInput {
  ciphertextPayload: string; // base64
  nonce: string; // base64
  region: string;
  categories: BroadcastCategory[];
  invites: Array<{ groupId: string; wrappedKey: string }>; // wrappedKey is base64
  honeypot: string;
  elapsed: number;
}

export interface BroadcastSubmitResponse {
  broadcastId: string;
}

// Invite types (authenticated, group coordinator)
export const INVITE_STATUSES = ['pending', 'decrypted', 'expired'] as const;
export type InviteStatus = (typeof INVITE_STATUSES)[number];

export interface Invite {
  inviteId: string;
  broadcastId: string;
  wrappedKey: string; // base64
  region: string;
  categories: BroadcastCategory[];
  createdAt: string;
  expiresAt: string;
}

export interface InviteListResponse {
  invites: Invite[];
}

export interface InviteCiphertextResponse {
  ciphertextPayload: string; // base64
  nonce: string; // base64
}

// Staff admin types
export interface AdminOverview {
  totalHubs: number;
  totalGroups: number;
  totalUsers: number;
  pendingVerifications: number;
  totalFundingRequests: number;
  totalFundsApproved: string;
}

export interface AdminHub {
  id: string;
  name: string;
  contactEmail: string;
  groupCount: number;
  createdAt: string;
}

export interface AdminHubDetail extends AdminHub {
  updatedAt: string;
  groups: Array<{
    id: string;
    name: string;
    serviceArea: string;
    verificationStatus: VerificationStatus;
    contactEmail: string;
    createdAt: string;
  }>;
  userCount: number;
}

export interface AdminGroup {
  id: string;
  hubId: string;
  hubName: string;
  name: string;
  serviceArea: string;
  aidCategories: AidCategory[];
  contactEmail: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
}

export interface AdminGroupDetail extends AdminGroup {
  updatedAt: string;
  coordinatorEmail: string | null;
  fundingRequestCount: number;
}

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  hubName: string | null;
  groupName: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AdminUserDetail extends AdminUser {
  hubId: string | null;
  groupId: string | null;
  updatedAt: string;
}

export interface AdminAuditEntry {
  id: string;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminVerificationRequest {
  id: string;
  groupId: string;
  groupName: string;
  groupServiceArea: string;
  method: VerificationMethod;
  status: VerificationRequestStatus;
  sponsorInfo: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  denialReason: string | null;
  createdAt: string;
}

export interface AdminFundingRequest {
  id: string;
  groupId: string;
  groupName: string;
  amount: string;
  category: AidCategory;
  urgency: Urgency;
  region: string;
  status: RequestStatus;
  submittedAt: string;
  createdAt: string;
}

export interface AdminFundingRequestDetail extends AdminFundingRequest {
  justification: string | null;
  declineReason: string | null;
  clarificationRequest: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  declinedAt: string | null;
  fundsSentAt: string | null;
  acknowledgedAt: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Report types
export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}

export interface CategorySummary {
  category: AidCategory;
  totalAmount: string;
  requestCount: number;
  approvedCount: number;
  declinedCount: number;
  pendingCount: number;
}

export interface SummaryReport {
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  totals: {
    totalAmount: string;
    totalRequests: number;
    approvedRequests: number;
    declinedRequests: number;
    pendingRequests: number;
    fundsSentRequests: number;
    acknowledgedRequests: number;
  };
  byCategory: CategorySummary[];
}

export interface GroupsReport {
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  totalGroups: number;
  groupsWithFunding: number;
  groupsWithApprovedRequests: number;
  verifiedGroups: number;
}

export interface TimingReport {
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  averageTimeToApproval: number | null;
  averageTimeToFundsSent: number | null;
  averageTimeToAcknowledged: number | null;
  medianTimeToApproval: number | null;
  requestsAnalyzed: number;
}

// Onboarding types
export type InviteFlow =
  | 'hub_owner_setup'
  | 'hub_staff'
  | 'group_owner_setup'
  | 'group_staff'
  | 'staff_admin'
  | 'hub_membership';

export interface InviteContext {
  id: string;
  email: string;
  role: UserRole;
  flow: InviteFlow;
  hubName?: string;
  groupName?: string;
  userExists: boolean;
}

export interface OnboardingInvite {
  id: string;
  email: string;
  role: UserRole;
  targetHubId: string | null;
  targetGroupId: string | null;
  invitedById: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface CreateInviteInput {
  email: string;
  role: UserRole;
  targetHubId?: string;
  targetGroupId?: string;
}

export interface SetupHubInput {
  token: string;
  name: string;
  contactEmail: string;
}

export interface SetupGroupInput {
  token: string;
  name: string;
  serviceArea: string;
  aidCategories: AidCategory[];
  contactEmail: string;
}

export interface AcceptInviteResponse {
  sessionToken: string;
  userId: string;
}

export interface TeamMember {
  id: string;
  email: string;
  role: UserRole;
  isOwner: boolean;
  joinedAt: string;
}

// Group hub association (for admin/settings views)
export interface GroupHubAssociation {
  hubId: string;
  hubName: string;
  verificationStatus: VerificationStatus;
}
