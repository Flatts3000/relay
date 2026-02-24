import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { hubMembers, groupMembers, groupHubMemberships, hubs, groups } from '../db/schema/index.js';
import { logAuditEvent } from './audit.service.js';
import type { Request } from 'express';

export interface HubMembershipInfo {
  hubId: string;
  hubName: string;
  isOwner: boolean;
}

export interface GroupMembershipInfo {
  groupId: string;
  groupName: string;
  isOwner: boolean;
  serviceArea: string;
}

export interface GroupHubMembershipInfo {
  hubId: string;
  hubName: string;
  verificationStatus: string;
}

export async function getHubMembershipForUser(userId: string): Promise<HubMembershipInfo | null> {
  const result = await db
    .select({
      hubId: hubMembers.hubId,
      hubName: hubs.name,
      isOwner: hubMembers.isOwner,
    })
    .from(hubMembers)
    .innerJoin(hubs, eq(hubMembers.hubId, hubs.id))
    .where(eq(hubMembers.userId, userId))
    .limit(1);

  return result[0] ?? null;
}

export async function getGroupMembershipForUser(
  userId: string
): Promise<GroupMembershipInfo | null> {
  const result = await db
    .select({
      groupId: groupMembers.groupId,
      groupName: groups.name,
      isOwner: groupMembers.isOwner,
      serviceArea: groups.serviceArea,
    })
    .from(groupMembers)
    .innerJoin(groups, eq(groupMembers.groupId, groups.id))
    .where(eq(groupMembers.userId, userId))
    .limit(1);

  return result[0] ?? null;
}

export async function getGroupHubMemberships(groupId: string): Promise<GroupHubMembershipInfo[]> {
  const results = await db
    .select({
      hubId: groupHubMemberships.hubId,
      hubName: hubs.name,
      verificationStatus: groupHubMemberships.verificationStatus,
    })
    .from(groupHubMemberships)
    .innerJoin(hubs, eq(groupHubMemberships.hubId, hubs.id))
    .where(eq(groupHubMemberships.groupId, groupId));

  return results;
}

export async function isHubOwner(userId: string, hubId: string): Promise<boolean> {
  const result = await db
    .select({ isOwner: hubMembers.isOwner })
    .from(hubMembers)
    .where(and(eq(hubMembers.userId, userId), eq(hubMembers.hubId, hubId)))
    .limit(1);

  return result[0]?.isOwner ?? false;
}

export async function isGroupOwner(userId: string, groupId: string): Promise<boolean> {
  const result = await db
    .select({ isOwner: groupMembers.isOwner })
    .from(groupMembers)
    .where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId)))
    .limit(1);

  return result[0]?.isOwner ?? false;
}

export async function removeHubMember(
  userId: string,
  hubId: string,
  removedBy: string,
  req: Request
): Promise<boolean> {
  const result = await db
    .delete(hubMembers)
    .where(and(eq(hubMembers.userId, userId), eq(hubMembers.hubId, hubId)))
    .returning();

  if (result.length === 0) return false;

  await logAuditEvent({
    userId: removedBy,
    action: 'delete',
    entityType: 'hub_member',
    entityId: userId,
    metadata: { hubId, removedUserId: userId },
    req,
  });

  return true;
}

export async function removeGroupMember(
  userId: string,
  groupId: string,
  removedBy: string,
  req: Request
): Promise<boolean> {
  const result = await db
    .delete(groupMembers)
    .where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId)))
    .returning();

  if (result.length === 0) return false;

  await logAuditEvent({
    userId: removedBy,
    action: 'delete',
    entityType: 'group_member',
    entityId: userId,
    metadata: { groupId, removedUserId: userId },
    req,
  });

  return true;
}
