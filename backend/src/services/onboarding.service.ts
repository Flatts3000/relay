import { eq, and, gt, isNull, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  onboardingInvites,
  users,
  hubs,
  groups,
  hubMembers,
  groupMembers,
  groupHubMemberships,
} from '../db/schema/index.js';
import { generateExpiresAt, generateToken, hashToken } from '../utils/crypto.js';
import { createSessionForUser } from './auth.service.js';
import { sendOnboardingInviteEmail } from './email.service.js';
import { logAuditEvent } from './audit.service.js';
import type { OnboardingInvite } from '../db/schema/index.js';

const INVITE_EXPIRY_HOURS = 72;

// Role display names for emails
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  hub_admin: 'Hub Administrator',
  group_coordinator: 'Group Coordinator',
  staff_admin: 'Staff Administrator',
};

export interface InviteContext {
  id: string;
  email: string;
  role: string;
  flow:
    | 'hub_owner_setup'
    | 'hub_staff'
    | 'group_owner_setup'
    | 'group_staff'
    | 'staff_admin'
    | 'hub_membership';
  hubName?: string;
  groupName?: string;
  userExists: boolean;
}

export interface CreateInviteInput {
  email: string;
  role: 'hub_admin' | 'group_coordinator' | 'staff_admin';
  targetHubId?: string;
  targetGroupId?: string;
}

// ---------- Create invite ----------

/**
 * An invite as it is safe to hand back to a caller: everything but the token.
 *
 * The stored token is a hash that the accept route rejects, so publishing it
 * would be handing out a string that looks like a credential and is not one.
 */
export type SafeOnboardingInvite = Omit<OnboardingInvite, 'token'>;

export async function createOnboardingInvite(
  input: CreateInviteInput,
  inviterId: string
): Promise<SafeOnboardingInvite> {
  // Check for existing active invite with same email+role+target
  const existing = await db
    .select()
    .from(onboardingInvites)
    .where(
      and(
        eq(onboardingInvites.email, input.email.toLowerCase()),
        eq(onboardingInvites.role, input.role),
        gt(onboardingInvites.expiresAt, new Date()),
        isNull(onboardingInvites.acceptedAt)
      )
    )
    .limit(1);

  if (existing[0]) {
    throw new Error('An active invite already exists for this email and role');
  }

  // Check if user already exists with this email
  const existingUser = await db
    .select()
    .from(users)
    .where(and(eq(users.email, input.email.toLowerCase()), isNull(users.deletedAt)))
    .limit(1);

  // For hub_membership invites (existing group joining new hub), user must exist
  // For all others, user must NOT exist
  if (
    input.role === 'group_coordinator' &&
    input.targetHubId &&
    !input.targetGroupId &&
    existingUser[0]
  ) {
    // This could be a hub_membership invite — allowed
  } else if (existingUser[0]) {
    throw new Error('A user with this email already exists');
  }

  const token = generateToken();
  const expiresAt = generateExpiresAt(INVITE_EXPIRY_HOURS * 60);

  const [invite] = await db
    .insert(onboardingInvites)
    .values({
      email: input.email.toLowerCase(),
      role: input.role,
      targetHubId: input.targetHubId ?? null,
      targetGroupId: input.targetGroupId ?? null,
      invitedById: inviterId,
      // Stored as a SHA-256 of the value that goes in the email, the same shape
      // sessions and magic links use. An invite is a bearer credential and this
      // is the one with the largest blast radius: an unaccepted staff-admin
      // invite read out of a backup creates a staff_admin account and returns a
      // live session for it. Hashing means a dump yields nothing replayable.
      token: hashToken(token),
      expiresAt,
    })
    .returning();

  // Get inviter email for notification
  const [inviter] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, inviterId))
    .limit(1);

  // Get context name for email
  let contextName: string | undefined;
  if (input.targetHubId) {
    const [hub] = await db
      .select({ name: hubs.name })
      .from(hubs)
      .where(eq(hubs.id, input.targetHubId))
      .limit(1);
    contextName = hub?.name;
  }
  if (input.targetGroupId) {
    const [group] = await db
      .select({ name: groups.name })
      .from(groups)
      .where(eq(groups.id, input.targetGroupId))
      .limit(1);
    contextName = group?.name;
  }

  // Send invite email
  try {
    await sendOnboardingInviteEmail(
      input.email,
      token,
      ROLE_DISPLAY_NAMES[input.role] ?? input.role,
      inviter?.email ?? 'Relay',
      contextName
    );
  } catch (emailError) {
    // Discard the invite rather than swallowing the failure.
    //
    // Returning 201 here was survivable while the raw token was stored and
    // echoed back, because an admin could recover the link from the row. Now the
    // token exists only in the message that failed to send, so a swallowed
    // failure strands a credential nobody holds: the invitee gets nothing, and
    // the duplicate guard rejects every retry for the full 72 hours because the
    // dead invite is still unexpired and unaccepted.
    console.error('Failed to send onboarding invite email:', emailError);
    await db.delete(onboardingInvites).where(eq(onboardingInvites.id, invite!.id));
    throw new Error(
      'Could not send the invitation email. No invite was created; please try again.'
    );
  }

  await logAuditEvent({
    userId: inviterId,
    action: 'create',
    entityType: 'onboarding_invite',
    entityId: invite!.id,
    metadata: {
      email: input.email,
      role: input.role,
      targetHubId: input.targetHubId,
      targetGroupId: input.targetGroupId,
    },
  });

  // Deliberately without the token. The stored value is a hash the accept route
  // rejects, so returning it publishes a string that looks like a credential and
  // is not one - and would put undefined-shaped bugs into any client that tried
  // to build an invitation link from it.
  const safeInvite: SafeOnboardingInvite = {
    id: invite!.id,
    email: invite!.email,
    role: invite!.role,
    targetHubId: invite!.targetHubId,
    targetGroupId: invite!.targetGroupId,
    invitedById: invite!.invitedById,
    expiresAt: invite!.expiresAt,
    acceptedAt: invite!.acceptedAt,
    createdAt: invite!.createdAt,
  };
  return safeInvite;
}

// ---------- Get invite by token ----------

/**
 * Look up an invite by the raw token from the invitation link.
 *
 * The caller passes the value the recipient was emailed; the stored column holds
 * its hash, so it is hashed here rather than compared directly.
 */
export async function getInviteByToken(token: string): Promise<OnboardingInvite | null> {
  const now = new Date();
  const result = await db
    .select()
    .from(onboardingInvites)
    .where(
      and(
        eq(onboardingInvites.token, hashToken(token)),
        gt(onboardingInvites.expiresAt, now),
        isNull(onboardingInvites.acceptedAt)
      )
    )
    .limit(1);

  return result[0] ?? null;
}

// ---------- Get invite context (for frontend) ----------

export async function getInviteContext(token: string): Promise<InviteContext | null> {
  const invite = await getInviteByToken(token);
  if (!invite) return null;

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(and(eq(users.email, invite.email), isNull(users.deletedAt)))
    .limit(1);

  // Determine flow
  let flow: InviteContext['flow'];
  let hubName: string | undefined;
  let groupName: string | undefined;

  if (invite.role === 'staff_admin') {
    flow = 'staff_admin';
  } else if (invite.role === 'hub_admin') {
    if (invite.targetHubId) {
      flow = 'hub_staff';
      const [hub] = await db
        .select({ name: hubs.name })
        .from(hubs)
        .where(eq(hubs.id, invite.targetHubId))
        .limit(1);
      hubName = hub?.name;
    } else {
      flow = 'hub_owner_setup';
    }
  } else if (invite.role === 'group_coordinator') {
    if (invite.targetGroupId) {
      flow = 'group_staff';
      const [group] = await db
        .select({ name: groups.name })
        .from(groups)
        .where(eq(groups.id, invite.targetGroupId))
        .limit(1);
      groupName = group?.name;
    } else if (existingUser[0] && invite.targetHubId) {
      flow = 'hub_membership';
      const [hub] = await db
        .select({ name: hubs.name })
        .from(hubs)
        .where(eq(hubs.id, invite.targetHubId))
        .limit(1);
      hubName = hub?.name;
    } else {
      flow = 'group_owner_setup';
      if (invite.targetHubId) {
        const [hub] = await db
          .select({ name: hubs.name })
          .from(hubs)
          .where(eq(hubs.id, invite.targetHubId))
          .limit(1);
        hubName = hub?.name;
      }
    }
  } else {
    return null;
  }

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    flow,
    hubName,
    groupName,
    userExists: !!existingUser[0],
  };
}

// ---------- Revoke invite ----------

export async function revokeInvite(inviteId: string, userId: string): Promise<boolean> {
  const now = new Date();
  const result = await db
    .update(onboardingInvites)
    .set({ expiresAt: now })
    .where(
      and(
        eq(onboardingInvites.id, inviteId),
        gt(onboardingInvites.expiresAt, now),
        isNull(onboardingInvites.acceptedAt)
      )
    )
    .returning();

  if (result.length === 0) return false;

  await logAuditEvent({
    userId,
    action: 'delete',
    entityType: 'onboarding_invite',
    entityId: inviteId,
    metadata: { email: result[0]!.email },
  });

  return true;
}

// ---------- List invites ----------

/**
 * Every column except the token.
 *
 * These rows are serialised straight to the API, and `select()` returned the
 * token with them - so listing invites handed the caller a live invitation link
 * for every pending invite they could see, letting a coordinator accept one
 * addressed to somebody else. Hashing the column makes that harmless, but there
 * is no reason to publish it at all.
 */
const inviteListColumns = {
  id: onboardingInvites.id,
  email: onboardingInvites.email,
  role: onboardingInvites.role,
  targetHubId: onboardingInvites.targetHubId,
  targetGroupId: onboardingInvites.targetGroupId,
  invitedById: onboardingInvites.invitedById,
  expiresAt: onboardingInvites.expiresAt,
  acceptedAt: onboardingInvites.acceptedAt,
  createdAt: onboardingInvites.createdAt,
};

export async function listInvitesForHub(hubId: string) {
  return db
    .select(inviteListColumns)
    .from(onboardingInvites)
    .where(eq(onboardingInvites.targetHubId, hubId))
    .orderBy(desc(onboardingInvites.createdAt));
}

export async function listInvitesForGroup(groupId: string) {
  return db
    .select(inviteListColumns)
    .from(onboardingInvites)
    .where(eq(onboardingInvites.targetGroupId, groupId))
    .orderBy(desc(onboardingInvites.createdAt));
}

export async function listPendingInvitesByInviter(inviterId: string) {
  const now = new Date();
  return db
    .select(inviteListColumns)
    .from(onboardingInvites)
    .where(
      and(
        eq(onboardingInvites.invitedById, inviterId),
        gt(onboardingInvites.expiresAt, now),
        isNull(onboardingInvites.acceptedAt)
      )
    )
    .orderBy(desc(onboardingInvites.createdAt));
}

// ---------- Acceptance handlers ----------

interface AcceptHubOwnerInput {
  name: string;
  contactEmail: string;
}

export async function acceptHubOwnerInvite(
  invite: OnboardingInvite,
  input: AcceptHubOwnerInput
): Promise<{ sessionToken: string; userId: string }> {
  return await db.transaction(async (tx) => {
    const now = new Date();

    // Create hub
    const [hub] = await tx
      .insert(hubs)
      .values({ name: input.name, contactEmail: input.contactEmail })
      .returning();

    // Create user
    const [user] = await tx
      .insert(users)
      .values({ email: invite.email, role: 'hub_admin' })
      .returning();

    // Create hub membership (owner)
    await tx.insert(hubMembers).values({
      userId: user!.id,
      hubId: hub!.id,
      isOwner: true,
    });

    // Mark invite accepted
    await tx
      .update(onboardingInvites)
      .set({ acceptedAt: now })
      .where(eq(onboardingInvites.id, invite.id));

    // Create session
    const sessionToken = await createSessionForUser(user!.id, tx);

    return { sessionToken, userId: user!.id };
  });
}

export async function acceptHubStaffInvite(
  invite: OnboardingInvite
): Promise<{ sessionToken: string; userId: string }> {
  return await db.transaction(async (tx) => {
    const now = new Date();

    // Create user
    const [user] = await tx
      .insert(users)
      .values({ email: invite.email, role: 'hub_admin' })
      .returning();

    // Create hub membership (not owner)
    await tx.insert(hubMembers).values({
      userId: user!.id,
      hubId: invite.targetHubId!,
      isOwner: false,
    });

    // Mark invite accepted
    await tx
      .update(onboardingInvites)
      .set({ acceptedAt: now })
      .where(eq(onboardingInvites.id, invite.id));

    const sessionToken = await createSessionForUser(user!.id, tx);
    return { sessionToken, userId: user!.id };
  });
}

interface AcceptGroupOwnerInput {
  name: string;
  serviceArea: string;
  aidCategories: string[];
  contactEmail: string;
}

export async function acceptGroupOwnerInvite(
  invite: OnboardingInvite,
  input: AcceptGroupOwnerInput
): Promise<{ sessionToken: string; userId: string }> {
  return await db.transaction(async (tx) => {
    const now = new Date();

    // Create group
    const [group] = await tx
      .insert(groups)
      .values({
        name: input.name,
        serviceArea: input.serviceArea,
        aidCategories: input.aidCategories as ('rent' | 'food' | 'utilities' | 'other')[],
        contactEmail: input.contactEmail,
      })
      .returning();

    // Create user
    const [user] = await tx
      .insert(users)
      .values({ email: invite.email, role: 'group_coordinator' })
      .returning();

    // Create group membership (owner)
    await tx.insert(groupMembers).values({
      userId: user!.id,
      groupId: group!.id,
      isOwner: true,
    });

    // If invited to a hub, create group_hub_membership (pending verification)
    if (invite.targetHubId) {
      await tx.insert(groupHubMemberships).values({
        groupId: group!.id,
        hubId: invite.targetHubId,
        verificationStatus: 'pending',
      });
    }

    // Mark invite accepted
    await tx
      .update(onboardingInvites)
      .set({ acceptedAt: now })
      .where(eq(onboardingInvites.id, invite.id));

    const sessionToken = await createSessionForUser(user!.id, tx);
    return { sessionToken, userId: user!.id };
  });
}

export async function acceptGroupStaffInvite(
  invite: OnboardingInvite
): Promise<{ sessionToken: string; userId: string }> {
  return await db.transaction(async (tx) => {
    const now = new Date();

    // Create user
    const [user] = await tx
      .insert(users)
      .values({ email: invite.email, role: 'group_coordinator' })
      .returning();

    // Create group membership (not owner)
    await tx.insert(groupMembers).values({
      userId: user!.id,
      groupId: invite.targetGroupId!,
      isOwner: false,
    });

    // Mark invite accepted
    await tx
      .update(onboardingInvites)
      .set({ acceptedAt: now })
      .where(eq(onboardingInvites.id, invite.id));

    const sessionToken = await createSessionForUser(user!.id, tx);
    return { sessionToken, userId: user!.id };
  });
}

export async function acceptStaffAdminInvite(
  invite: OnboardingInvite
): Promise<{ sessionToken: string; userId: string }> {
  return await db.transaction(async (tx) => {
    const now = new Date();

    // Create user
    const [user] = await tx
      .insert(users)
      .values({ email: invite.email, role: 'staff_admin' })
      .returning();

    // Mark invite accepted
    await tx
      .update(onboardingInvites)
      .set({ acceptedAt: now })
      .where(eq(onboardingInvites.id, invite.id));

    const sessionToken = await createSessionForUser(user!.id, tx);
    return { sessionToken, userId: user!.id };
  });
}

export async function acceptHubMembershipInvite(
  invite: OnboardingInvite,
  existingUserId: string
): Promise<{ sessionToken: string }> {
  return await db.transaction(async (tx) => {
    const now = new Date();

    // Get user's group
    const [membership] = await tx
      .select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, existingUserId))
      .limit(1);

    if (!membership || !invite.targetHubId) {
      throw new Error('Invalid hub membership invite');
    }

    // Create group_hub_membership
    await tx.insert(groupHubMemberships).values({
      groupId: membership.groupId,
      hubId: invite.targetHubId,
      verificationStatus: 'pending',
    });

    // Mark invite accepted
    await tx
      .update(onboardingInvites)
      .set({ acceptedAt: now })
      .where(eq(onboardingInvites.id, invite.id));

    const sessionToken = await createSessionForUser(existingUserId, tx);
    return { sessionToken };
  });
}
