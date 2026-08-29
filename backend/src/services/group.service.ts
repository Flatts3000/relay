import { eq, and, isNull, ilike, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  groups,
  groupHubMemberships,
  broadcastInvites,
  type Group,
  type NewGroup,
} from '../db/schema/index.js';
import { logAuditEvent } from './audit.service.js';
import type { Request } from 'express';
import type {
  CreateGroupInput,
  UpdateGroupInput,
  ListGroupsQuery,
  GroupResponse,
  AidCategory,
  VerificationStatus,
  BroadcastKeyInput,
} from '../validations/group.validation.js';

/**
 * Transform a database group record into an API response
 */
function toGroupResponse(
  group: Group,
  verificationStatus?: VerificationStatus,
  includeKeyMaterial = false
): GroupResponse {
  return {
    id: group.id,
    name: group.name,
    serviceArea: group.serviceArea,
    aidCategories: group.aidCategories as AidCategory[],
    contactEmail: group.contactEmail,
    ...(verificationStatus && { verificationStatus }),
    // Off by default. The salt is not a secret, but only a coordinator of this
    // group has any use for it, and the hub and staff views have no business
    // carrying it around.
    ...(includeKeyMaterial && {
      keySalt: group.keySalt ? group.keySalt.toString('base64') : null,
      broadcastPublicKey: group.publicKey ? group.publicKey.toString('base64') : null,
    }),
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

/**
 * Create a new group
 */
export async function createGroup(
  input: CreateGroupInput,
  userId: string,
  hubId: string,
  req: Request
): Promise<GroupResponse> {
  // The group and its hub membership are written together. Verification status
  // lives on the membership, not on the group, so a group without one is
  // invisible to its hub's listings and can never be verified. Neither row is
  // useful without the other, so neither is allowed to exist alone.
  const group = await db.transaction(async (tx) => {
    const result = await tx
      .insert(groups)
      .values({
        name: input.name,
        serviceArea: input.serviceArea,
        aidCategories: input.aidCategories,
        contactEmail: input.contactEmail,
      })
      .returning();

    const created = result[0]!;

    await tx.insert(groupHubMemberships).values({
      groupId: created.id,
      hubId,
      verificationStatus: 'pending',
    });

    // Audited inside the transaction as well. Writing it afterwards would let
    // the group and membership commit while the audit insert fails, leaving the
    // caller with an error for a group that actually exists - and a retry then
    // produces a duplicate.
    await logAuditEvent(
      {
        userId,
        action: 'create',
        entityType: 'group',
        entityId: created.id,
        metadata: {
          name: input.name,
          serviceArea: input.serviceArea,
          aidCategories: input.aidCategories,
          hubId,
        },
        req,
      },
      tx
    );

    return created;
  });

  return toGroupResponse(group, 'pending');
}

/**
 * Get a group by ID, optionally including verification status for a specific hub
 */
export async function getGroupById(
  groupId: string,
  hubId?: string,
  includeKeyMaterial = false
): Promise<GroupResponse | null> {
  const result = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)))
    .limit(1);

  const group = result[0];
  if (!group) return null;

  const verificationStatus = await resolveVerificationStatus(groupId, hubId);

  return toGroupResponse(group, verificationStatus, includeKeyMaterial);
}

/**
 * Resolve a group's verification status.
 *
 * With a hub in context, the answer is that hub's view of the group. Without
 * one, fall back to the group's own memberships.
 *
 * The fallback is what makes this correct for group coordinators. Verification
 * lives on group_hub_memberships, but a coordinator is group staff and never
 * hub staff, so hub_members holds no row for them and their session's hubId is
 * structurally always null. Callers therefore passed undefined, the status came
 * back undefined, and every "verified only" gate in the UI failed closed - most
 * visibly the new funding request form, which told verified groups they were
 * not verified while their own dashboard said otherwise.
 *
 * A group may in principle belong to more than one hub. Verified by any of them
 * is verified for the purposes of these gates, so the strongest status wins
 * rather than an arbitrary first row.
 */
async function resolveVerificationStatus(
  groupId: string,
  hubId?: string
): Promise<VerificationStatus | undefined> {
  const conditions = [eq(groupHubMemberships.groupId, groupId)];
  if (hubId) {
    conditions.push(eq(groupHubMemberships.hubId, hubId));
  }

  const memberships = await db
    .select({ verificationStatus: groupHubMemberships.verificationStatus })
    .from(groupHubMemberships)
    .where(and(...conditions));

  if (memberships.length === 0) return undefined;

  const statuses = memberships.map((m) => m.verificationStatus as VerificationStatus);
  return statuses.find((s) => s === 'verified') ?? statuses[0];
}

/**
 * List groups for a hub with optional filtering
 */
export async function listGroups(
  hubId: string,
  query: ListGroupsQuery
): Promise<{ groups: GroupResponse[]; total: number }> {
  const conditions = [eq(groupHubMemberships.hubId, hubId), isNull(groups.deletedAt)];

  if (query.verificationStatus) {
    conditions.push(eq(groupHubMemberships.verificationStatus, query.verificationStatus));
  }

  if (query.aidCategory) {
    // Check if the array contains the category
    conditions.push(sql`${query.aidCategory} = ANY(${groups.aidCategories})`);
  }

  if (query.search) {
    // Search in name or service area
    conditions.push(
      sql`(${ilike(groups.name, `%${query.search}%`)} OR ${ilike(groups.serviceArea, `%${query.search}%`)})`
    );
  }

  const result = await db
    .select({ group: groups, verificationStatus: groupHubMemberships.verificationStatus })
    .from(groups)
    .innerJoin(groupHubMemberships, eq(groups.id, groupHubMemberships.groupId))
    .where(and(...conditions))
    .orderBy(groups.name);

  return {
    groups: result.map((r) => toGroupResponse(r.group, r.verificationStatus as VerificationStatus)),
    total: result.length,
  };
}

/**
 * Update a group's profile
 */
export async function updateGroup(
  groupId: string,
  input: UpdateGroupInput,
  userId: string,
  req: Request
): Promise<GroupResponse | null> {
  // First check if group exists and is not deleted
  const existing = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)))
    .limit(1);

  if (!existing[0]) {
    return null;
  }

  const updateData: Partial<NewGroup> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    updateData.name = input.name;
  }
  if (input.serviceArea !== undefined) {
    updateData.serviceArea = input.serviceArea;
  }
  if (input.aidCategories !== undefined) {
    updateData.aidCategories = input.aidCategories;
  }
  if (input.contactEmail !== undefined) {
    updateData.contactEmail = input.contactEmail;
  }

  const updateResult = await db
    .update(groups)
    .set(updateData)
    .where(eq(groups.id, groupId))
    .returning();

  const updated = updateResult[0]!;

  await logAuditEvent({
    userId,
    action: 'update',
    entityType: 'group',
    entityId: groupId,
    metadata: {
      changes: input,
    },
    req,
  });

  return toGroupResponse(updated);
}

/**
 * Soft delete a group
 */
export async function deleteGroup(groupId: string, userId: string, req: Request): Promise<boolean> {
  const existing = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)))
    .limit(1);

  if (!existing[0]) {
    return false;
  }

  await db
    .update(groups)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(groups.id, groupId));

  await logAuditEvent({
    userId,
    action: 'delete',
    entityType: 'group',
    entityId: groupId,
    metadata: {
      name: existing[0].name,
    },
    req,
  });

  return true;
}

/**
 * Check if a user can access a specific group
 * - Hub admins can access any group in their hub (via group_hub_memberships)
 * - Group coordinators can only access their own group
 */
export async function canUserAccessGroup(
  _userId: string,
  userRole: string,
  userHubId: string | null,
  userGroupId: string | null,
  targetGroupId: string
): Promise<boolean> {
  if (userRole === 'hub_admin' && userHubId) {
    // Check if group belongs to user's hub via group_hub_memberships
    const [membership] = await db
      .select()
      .from(groupHubMemberships)
      .where(
        and(
          eq(groupHubMemberships.groupId, targetGroupId),
          eq(groupHubMemberships.hubId, userHubId)
        )
      )
      .limit(1);
    return !!membership;
  }

  if (userRole === 'group_coordinator' && userGroupId) {
    // Group coordinator can only access their own group
    return userGroupId === targetGroupId;
  }

  return false;
}

/**
 * Check if a user can modify a specific group
 * - Only group coordinators can modify their own group
 */
export function canUserModifyGroup(
  userRole: string,
  userGroupId: string | null,
  targetGroupId: string
): boolean {
  return userRole === 'group_coordinator' && userGroupId === targetGroupId;
}

/**
 * Register a group's broadcast key material.
 *
 * Both values arrive base64 from the browser, which derived the keypair from a
 * coordinator passphrase and the salt. Only the public half is sent; the private
 * half never leaves the device, so a Relay operator, a database dump and a
 * subpoena all yield the same thing - a public key.
 *
 * Setting a new passphrase replaces both halves atomically. That deliberately
 * makes every wrapped key already sitting in broadcast_invites for this group
 * undecryptable, because those keys were wrapped to the old public key, so they
 * are deleted in the same transaction rather than left to look pending until the
 * TTL sweep reaches them.
 */
export async function setGroupBroadcastKey(
  groupId: string,
  input: BroadcastKeyInput,
  userId: string,
  req: Request
): Promise<{ invitesDiscarded: number }> {
  return db.transaction(async (tx) => {
    const discarded = await tx
      .delete(broadcastInvites)
      .where(eq(broadcastInvites.groupId, groupId))
      .returning({ id: broadcastInvites.id });

    await tx
      .update(groups)
      .set({
        publicKey: Buffer.from(input.publicKey, 'base64'),
        keySalt: Buffer.from(input.keySalt, 'base64'),
        updatedAt: new Date(),
      })
      .where(eq(groups.id, groupId));

    await logAuditEvent(
      {
        userId,
        action: 'update',
        entityType: 'group',
        entityId: groupId,
        // No key material in the audit trail. That a key was set is the fact
        // worth keeping; which key it was is not.
        metadata: { field: 'broadcastKey', invitesDiscarded: discarded.length },
        req,
      },
      tx
    );

    return { invitesDiscarded: discarded.length };
  });
}
