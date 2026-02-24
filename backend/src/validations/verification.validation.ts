import { z } from 'zod';

// Verification methods must match the database enum
export const verificationMethods = [
  'hub_approval',
  'peer_attestation',
  'sponsor_reference',
] as const;
export type VerificationMethod = (typeof verificationMethods)[number];

// Verification request statuses must match the database enum
export const verificationRequestStatuses = ['pending', 'approved', 'denied'] as const;
export type VerificationRequestStatus = (typeof verificationRequestStatuses)[number];

// Create verification request schema
export const createVerificationRequestSchema = z
  .object({
    method: z.enum(verificationMethods),
    hubId: z.string().uuid('Invalid hub ID format'),
    sponsorInfo: z
      .string()
      .max(1000, 'Sponsor information must be 1000 characters or less')
      .optional(),
  })
  .refine(
    (data) => {
      // sponsorInfo is required for sponsor_reference method
      if (data.method === 'sponsor_reference' && !data.sponsorInfo?.trim()) {
        return false;
      }
      return true;
    },
    {
      message: 'Sponsor information is required for sponsor reference verification',
      path: ['sponsorInfo'],
    }
  );

export type CreateVerificationRequestInput = z.infer<typeof createVerificationRequestSchema>;

// Deny verification request schema
export const denyVerificationRequestSchema = z.object({
  reason: z
    .string()
    .min(1, 'Denial reason is required')
    .max(500, 'Denial reason must be 500 characters or less'),
});

export type DenyVerificationRequestInput = z.infer<typeof denyVerificationRequestSchema>;

// Verification request ID param schema
export const verificationRequestIdParamSchema = z.object({
  id: z.string().uuid('Invalid verification request ID format'),
});

// Group ID param schema for requesting verification
export const verificationGroupIdParamSchema = z.object({
  groupId: z.string().uuid('Invalid group ID format'),
});

// List verification requests query schema
export const listVerificationRequestsQuerySchema = z.object({
  status: z.enum(verificationRequestStatuses).optional(),
  method: z.enum(verificationMethods).optional(),
});

export type ListVerificationRequestsQuery = z.infer<typeof listVerificationRequestsQuerySchema>;

// Verification request response DTO
export const verificationRequestResponseSchema = z.object({
  id: z.string().uuid(),
  groupId: z.string().uuid(),
  groupName: z.string(),
  groupServiceArea: z.string(),
  method: z.enum(verificationMethods),
  status: z.enum(verificationRequestStatuses),
  sponsorInfo: z.string().nullable(),
  attestationCount: z.number().int().nonnegative().default(0),
  reviewedBy: z.string().uuid().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  denialReason: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type VerificationRequestResponse = z.infer<typeof verificationRequestResponseSchema>;

// Peer attestation response DTO
export const peerAttestationResponseSchema = z.object({
  id: z.string().uuid(),
  attestingGroupId: z.string().uuid(),
  attestingGroupName: z.string(),
  attestedAt: z.string().datetime(),
});

export type PeerAttestationResponse = z.infer<typeof peerAttestationResponseSchema>;
