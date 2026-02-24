import { eq, and, isNull, ilike, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { groups, groupHubMemberships, type Group, type NewGroup } from '../db/schema/index.js';
import { logAuditEvent } from './audit.service.js';
import type { Request } from 'express';
import type {
  CreateGroupInput,
  UpdateGroupInput,
  ListGroupsQuery,
  GroupResponse,
  AidCategory,
  VerificationStatus,
} from '../validations/group.validation.js';

/**
 * Transform a database group record into an API response
 */
function toGroupResponse(group: Group, verificationStatus?: VerificationStatus): GroupResponse {
  return {
    id: group.id,
    name: group.name,
    serviceArea: group.serviceArea,
    aidCategories: group.aidCategories as AidCategory[],
    contactEmail: group.contactEmail,
    ...(verificationStatus && { verificationStatus }),
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
  req: Request
): Promise<GroupResponse> {
  const result = await db
    .insert(groups)
    .values({
      name: input.name,
      serviceArea: input.serviceArea,
      aidCategories: input.aidCategories,
      contactEmail: input.contactEmail,
    })
    .returning();

  const group = result[0]!;

  await logAuditEvent({
    userId,
    action: 'create',
    entityType: 'group',
    entityId: group.id,
    metadata: {
      name: input.name,
      serviceArea: input.serviceArea,
      aidCategories: input.aidCategories,
    },
    req,
  });

  return toGroupResponse(group);
}

/**
 * Get a group by ID, optionally including verification status for a specific hub
 */
export async function getGroupById(groupId: string, hubId?: string): Promise<GroupResponse | null> {
  const result = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)))
    .limit(1);

  const group = result[0];
  if (!group) return null;

  let verificationStatus: VerificationStatus | undefined;
  if (hubId) {
    const [membership] = await db
      .select({ verificationStatus: groupHubMemberships.verificationStatus })
      .from(groupHubMemberships)
      .where(and(eq(groupHubMemberships.groupId, groupId), eq(groupHubMemberships.hubId, hubId)))
      .limit(1);
    verificationStatus = membership?.verificationStatus as VerificationStatus | undefined;
  }

  return toGroupResponse(group, verificationStatus);
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
