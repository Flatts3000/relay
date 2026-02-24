import { z } from 'zod';

export const createInviteSchema = z.object({
  email: z.string().email().max(255),
  role: z.enum(['hub_admin', 'group_coordinator', 'staff_admin']),
  targetHubId: z.string().uuid().optional(),
  targetGroupId: z.string().uuid().optional(),
});

export const acceptHubOwnerSchema = z.object({
  token: z.string().length(64),
  name: z.string().min(1).max(255),
  contactEmail: z.string().email().max(255),
});

export const acceptHubStaffSchema = z.object({
  token: z.string().length(64),
});

export const acceptGroupOwnerSchema = z.object({
  token: z.string().length(64),
  name: z.string().min(1).max(255),
  serviceArea: z.string().min(1).max(255),
  aidCategories: z.array(z.enum(['rent', 'food', 'utilities', 'other'])).min(1),
  contactEmail: z.string().email().max(255),
});

export const acceptGroupStaffSchema = z.object({
  token: z.string().length(64),
});

export const acceptStaffAdminSchema = z.object({
  token: z.string().length(64),
});

export const acceptHubMembershipSchema = z.object({
  token: z.string().length(64),
  confirm: z.literal(true),
});

export const tokenQuerySchema = z.object({
  token: z.string().length(64),
});
