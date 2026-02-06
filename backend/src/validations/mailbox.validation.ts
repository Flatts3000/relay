import { z } from 'zod';

export const aidCategories = ['rent', 'food', 'utilities', 'other'] as const;
export type AidCategory = (typeof aidCategories)[number];

export const deletionTypes = ['manual', 'auto_inactivity'] as const;
export type DeletionType = (typeof deletionTypes)[number];

// Create mailbox schema
export const createMailboxSchema = z.object({
  publicKey: z
    .string()
    .min(1, 'Public key is required')
    .refine(
      (val) => {
        // Validate base64 encoding
        try {
          const decoded = Buffer.from(val, 'base64');
          // NaCl box public keys are 32 bytes
          return decoded.length === 32;
        } catch {
          return false;
        }
      },
      { message: 'Invalid public key format (must be 32-byte base64-encoded)' }
    ),
  helpCategory: z.enum(aidCategories),
  region: z.string().min(1, 'Region is required').max(255),
});

export type CreateMailboxInput = z.infer<typeof createMailboxSchema>;

// Mailbox ID param schema
export const mailboxIdParamSchema = z.object({
  id: z.string().uuid('Invalid mailbox ID format'),
});

// Lookup by public key schema (query parameter validation)
export const lookupByPublicKeySchema = z.object({
  publicKey: z
    .string()
    .min(1, 'Public key is required')
    .refine(
      (val) => {
        try {
          return Buffer.from(val, 'base64').length === 32;
        } catch {
          return false;
        }
      },
      { message: 'Invalid public key format (must be 32-byte base64-encoded)' }
    ),
});

export type LookupByPublicKeyQuery = z.infer<typeof lookupByPublicKeySchema>;

// Send reply schema
export const sendReplySchema = z.object({
  ciphertext: z
    .string()
    .min(1, 'Ciphertext is required')
    .refine(
      (val) => {
        // Validate base64 encoding and minimum size for NaCl box
        try {
          const decoded = Buffer.from(val, 'base64');
          // Minimum: 24-byte nonce + 16-byte auth tag = 40 bytes
          return decoded.length >= 40;
        } catch {
          return false;
        }
      },
      { message: 'Invalid ciphertext format' }
    ),
});

export type SendReplyInput = z.infer<typeof sendReplySchema>;

// List help requests query schema
export const listHelpRequestsQuerySchema = z.object({
  category: z.enum(aidCategories).optional(),
});

export type ListHelpRequestsQuery = z.infer<typeof listHelpRequestsQuerySchema>;

// Mailbox response DTO (for anonymous users)
export interface MailboxResponse {
  id: string;
  helpCategory: AidCategory;
  region: string;
  createdAt: string;
  messages: MailboxMessageResponse[];
}

// Mailbox message response DTO
export interface MailboxMessageResponse {
  id: string;
  groupId: string;
  groupName: string;
  ciphertext: string; // base64-encoded
  createdAt: string;
}

// Help request response DTO (for group coordinators)
export interface HelpRequestResponse {
  mailboxId: string;
  helpCategory: AidCategory;
  region: string;
  createdAt: string;
}

// Public key response DTO
export interface PublicKeyResponse {
  publicKey: string; // base64-encoded
}

// Tombstone response DTO
export interface TombstoneResponse {
  helpCategory: AidCategory;
  region: string;
  deletedAt: string;
  deletionType: DeletionType;
}
