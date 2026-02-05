import { eq, and, isNull, ilike, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { groups, type Group, type NewGroup } from '../db/schema/index.js';
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
function toGroupResponse(group: Group): GroupResponse {
  return {
    id: group.id,
    hubId: group.hubId,
    name: group.name,
    serviceArea: group.serviceArea,
    aidCategories: group.aidCategories as AidCategory[],
    contactEmail: group.contactEmail,
    verificationStatus: group.verificationStatus as VerificationStatus,
    createdAt: group.createdAt.toISOString(),
    updatedAt: group.updatedAt.toISOString(),
  };
}

/**
 * Create a new group
 */
export async function createGroup(
  hubId: string,
  input: CreateGroupInput,
  userId: string,
  req: Request
): Promise<GroupResponse> {
  const result = await db
    .insert(groups)
    .values({
      hubId,
      name: input.name,
      serviceArea: input.serviceArea,
      aidCategories: input.aidCategories,
      contactEmail: input.contactEmail,
      verificationStatus: 'pending',
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
 * Get a group by ID
 */
export async function getGroupById(groupId: string): Promise<GroupResponse | null> {
  const result = await db
    .select()
    .from(groups)
    .where(and(eq(groups.id, groupId), isNull(groups.deletedAt)))
    .limit(1);

  const group = result[0];
  return group ? toGroupResponse(group) : null;
}

/**
 * List groups for a hub with optional filtering
 */
export async function listGroups(
  hubId: string,
  query: ListGroupsQuery
): Promise<{ groups: GroupResponse[]; total: number }> {
  const conditions = [eq(groups.hubId, hubId), isNull(groups.deletedAt)];

  if (query.verificationStatus) {
    conditions.push(eq(groups.verificationStatus, query.verificationStatus));
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
    .select()
    .from(groups)
    .where(and(...conditions))
    .orderBy(groups.name);

  return {
    groups: result.map(toGroupResponse),
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
export async function deleteGroup(
  groupId: string,
  userId: string,
  req: Request
): Promise<boolean> {
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
 * - Hub admins can access any group in their hub
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
    // Hub admin can access any group in their hub
    const group = await getGroupById(targetGroupId);
    return group !== null && group.hubId === userHubId;
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
