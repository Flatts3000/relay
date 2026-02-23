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
