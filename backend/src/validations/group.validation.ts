import { z } from 'zod';

// Aid categories must match the database enum
export const aidCategories = ['rent', 'food', 'utilities', 'other'] as const;
export type AidCategory = (typeof aidCategories)[number];

// Verification statuses must match the database enum
export const verificationStatuses = ['pending', 'verified', 'revoked'] as const;
export type VerificationStatus = (typeof verificationStatuses)[number];

// Shared field schemas
const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(255, 'Name must be 255 characters or less')
  .trim();

const serviceAreaSchema = z
  .string()
  .min(1, 'Service area is required')
  .max(255, 'Service area must be 255 characters or less')
  .trim();

const aidCategoriesSchema = z
  .array(z.enum(aidCategories))
  .min(1, 'At least one aid category is required')
  .refine((arr) => new Set(arr).size === arr.length, {
    message: 'Aid categories must be unique',
  });

const contactEmailSchema = z
  .string()
  .email('Invalid email address')
  .max(255, 'Email must be 255 characters or less')
  .transform((email) => email.toLowerCase().trim());

// Create group request schema
export const createGroupSchema = z.object({
  name: nameSchema,
  serviceArea: serviceAreaSchema,
  aidCategories: aidCategoriesSchema,
  contactEmail: contactEmailSchema,
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;

// Update group request schema (all fields optional)
export const updateGroupSchema = z
  .object({
    name: nameSchema.optional(),
    serviceArea: serviceAreaSchema.optional(),
    aidCategories: aidCategoriesSchema.optional(),
    contactEmail: contactEmailSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

/**
 * A group's broadcast key material, as registered by a coordinator.
 *
 * Both values are public. The private key is never transmitted: the browser
 * stretches the coordinator's passphrase with the salt to derive the keypair,
 * uploads only the public half, and keeps the secret half in memory. The server
 * cannot decrypt broadcasts, which is the property the whole design exists to
 * preserve, so it must never be in a position to hold the passphrase either.
 *
 * Lengths are fixed by the primitives - NaCl box public keys are 32 bytes, and
 * the salt is 16 - so they are checked rather than left open. Base64 of 32 bytes
 * is 44 characters, of 16 bytes is 24.
 */
export const broadcastKeySchema = z.object({
  publicKey: z
    .string()
    .length(44, 'Public key must be a base64-encoded 32-byte value')
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Public key must be base64'),
  keySalt: z
    .string()
    .length(24, 'Key salt must be a base64-encoded 16-byte value')
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Key salt must be base64'),
});

export type BroadcastKeyInput = z.infer<typeof broadcastKeySchema>;

// Group ID param schema
export const groupIdParamSchema = z.object({
  id: z.string().uuid('Invalid group ID format'),
});

// List groups query schema
export const listGroupsQuerySchema = z.object({
  verificationStatus: z.enum(verificationStatuses).optional(),
  aidCategory: z.enum(aidCategories).optional(),
  search: z.string().max(100).optional(),
});

export type ListGroupsQuery = z.infer<typeof listGroupsQuerySchema>;

// Group response DTO
export const groupResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  serviceArea: z.string(),
  aidCategories: z.array(z.enum(aidCategories)),
  contactEmail: z.string().email(),
  verificationStatus: z.enum(verificationStatuses).optional(),
  // Present only on a coordinator's view of their own group. The salt is public
  // by design - it is what lets the same passphrase rederive the same keypair on
  // a second device - but there is no reason to publish it more widely.
  keySalt: z.string().nullable().optional(),
  // The group's registered broadcast public key, base64, or null if none is set.
  // Public by definition - it is what senders wrap content keys to - and the
  // browser needs it to tell a wrong passphrase from an undecryptable invite.
  broadcastPublicKey: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type GroupResponse = z.infer<typeof groupResponseSchema>;

// Groups list response DTO
export const groupsListResponseSchema = z.object({
  groups: z.array(groupResponseSchema),
  total: z.number().int().nonnegative(),
});

export type GroupsListResponse = z.infer<typeof groupsListResponseSchema>;
