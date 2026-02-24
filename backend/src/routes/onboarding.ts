import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import {
  createOnboardingInvite,
  getInviteContext,
  getInviteByToken,
  revokeInvite,
  listPendingInvitesByInviter,
  listInvitesForHub,
  listInvitesForGroup,
  acceptHubOwnerInvite,
  acceptHubStaffInvite,
  acceptGroupOwnerInvite,
  acceptGroupStaffInvite,
  acceptStaffAdminInvite,
  acceptHubMembershipInvite,
} from '../services/onboarding.service.js';
import {
  removeHubMember,
  removeGroupMember,
  isHubOwner,
  isGroupOwner,
} from '../services/membership.service.js';
import {
  createInviteSchema,
  acceptHubOwnerSchema,
  acceptHubStaffSchema,
  acceptGroupOwnerSchema,
  acceptGroupStaffSchema,
  acceptStaffAdminSchema,
  acceptHubMembershipSchema,
  tokenQuerySchema,
} from '../validations/onboarding.validation.js';
import { db } from '../db/index.js';
import { hubMembers, groupMembers, users } from '../db/schema/index.js';
import { eq, and, isNull } from 'drizzle-orm';

export const onboardingRouter = Router();

// ---------- Invite management (authenticated) ----------

// Create invite
onboardingRouter.post('/invites', authenticate, async (req, res) => {
  try {
    const input = createInviteSchema.parse(req.body);
    const user = req.user!;

    // Authorization: staff_admin can invite anyone; hub owner can invite hub staff + groups; group owner can invite group staff
    if (user.role === 'staff_admin') {
      // Can create any invite
    } else if (user.role === 'hub_admin' && user.hubId) {
      const owner = await isHubOwner(user.id, user.hubId);
      if (!owner) {
        res.status(403).json({ error: 'Only hub owners can create invites' });
        return;
      }
      // Hub owners can invite hub_admin staff (to their hub) or group_coordinator (to their hub)
      if (input.role === 'hub_admin') {
        input.targetHubId = user.hubId;
      } else if (input.role === 'group_coordinator') {
        input.targetHubId = user.hubId;
      } else {
        res
          .status(403)
          .json({ error: 'Hub owners can only invite hub staff or group coordinators' });
        return;
      }
    } else if (user.role === 'group_coordinator' && user.groupId) {
      const owner = await isGroupOwner(user.id, user.groupId);
      if (!owner) {
        res.status(403).json({ error: 'Only group owners can create invites' });
        return;
      }
      if (input.role !== 'group_coordinator') {
        res.status(403).json({ error: 'Group owners can only invite group staff' });
        return;
      }
      input.targetGroupId = user.groupId;
    } else {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const invite = await createOnboardingInvite(input, user.id, req);
    res.status(201).json(invite);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// List pending invites
onboardingRouter.get('/invites', authenticate, async (req, res) => {
  const user = req.user!;

  if (user.role === 'staff_admin') {
    const invites = await listPendingInvitesByInviter(user.id);
    res.json({ invites });
    return;
  }

  if (user.role === 'hub_admin' && user.hubId) {
    const invites = await listInvitesForHub(user.hubId);
    res.json({ invites });
    return;
  }

  if (user.role === 'group_coordinator' && user.groupId) {
    const invites = await listInvitesForGroup(user.groupId);
    res.json({ invites });
    return;
  }

  res.json({ invites: [] });
});

// Revoke invite
onboardingRouter.delete('/invites/:id', authenticate, async (req, res) => {
  const user = req.user!;
  const inviteId = req.params['id']!;

  const revoked = await revokeInvite(inviteId, user.id, req);
  if (!revoked) {
    res.status(404).json({ error: 'Invite not found or already expired' });
    return;
  }

  res.json({ message: 'Invite revoked' });
});

// ---------- Invite acceptance (unauthenticated) ----------

// Get invite context
onboardingRouter.get('/accept', async (req, res) => {
  try {
    const { token } = tokenQuerySchema.parse(req.query);
    const context = await getInviteContext(token);

    if (!context) {
      res.status(404).json({ error: 'Invalid or expired invite' });
      return;
    }

    res.json(context);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid token' });
      return;
    }
    throw err;
  }
});

// Accept hub owner invite
onboardingRouter.post('/accept/hub-owner', async (req, res) => {
  try {
    const input = acceptHubOwnerSchema.parse(req.body);
    const invite = await getInviteByToken(input.token);

    if (!invite) {
      res.status(404).json({ error: 'Invalid or expired invite' });
      return;
    }

    if (invite.role !== 'hub_admin' || invite.targetHubId) {
      res.status(400).json({ error: 'Invalid invite type for this endpoint' });
      return;
    }

    const result = await acceptHubOwnerInvite(invite, {
      name: input.name,
      contactEmail: input.contactEmail,
    });

    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// Accept hub staff invite
onboardingRouter.post('/accept/hub-staff', async (req, res) => {
  try {
    const input = acceptHubStaffSchema.parse(req.body);
    const invite = await getInviteByToken(input.token);

    if (!invite) {
      res.status(404).json({ error: 'Invalid or expired invite' });
      return;
    }

    if (invite.role !== 'hub_admin' || !invite.targetHubId) {
      res.status(400).json({ error: 'Invalid invite type for this endpoint' });
      return;
    }

    const result = await acceptHubStaffInvite(invite);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// Accept group owner invite
onboardingRouter.post('/accept/group-owner', async (req, res) => {
  try {
    const input = acceptGroupOwnerSchema.parse(req.body);
    const invite = await getInviteByToken(input.token);

    if (!invite) {
      res.status(404).json({ error: 'Invalid or expired invite' });
      return;
    }

    if (invite.role !== 'group_coordinator' || invite.targetGroupId) {
      res.status(400).json({ error: 'Invalid invite type for this endpoint' });
      return;
    }

    const result = await acceptGroupOwnerInvite(invite, {
      name: input.name,
      serviceArea: input.serviceArea,
      aidCategories: input.aidCategories,
      contactEmail: input.contactEmail,
    });

    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// Accept group staff invite
onboardingRouter.post('/accept/group-staff', async (req, res) => {
  try {
    const input = acceptGroupStaffSchema.parse(req.body);
    const invite = await getInviteByToken(input.token);

    if (!invite) {
      res.status(404).json({ error: 'Invalid or expired invite' });
      return;
    }

    if (invite.role !== 'group_coordinator' || !invite.targetGroupId) {
      res.status(400).json({ error: 'Invalid invite type for this endpoint' });
      return;
    }

    const result = await acceptGroupStaffInvite(invite);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// Accept staff admin invite
onboardingRouter.post('/accept/staff-admin', async (req, res) => {
  try {
    const input = acceptStaffAdminSchema.parse(req.body);
    const invite = await getInviteByToken(input.token);

    if (!invite) {
      res.status(404).json({ error: 'Invalid or expired invite' });
      return;
    }

    if (invite.role !== 'staff_admin') {
      res.status(400).json({ error: 'Invalid invite type for this endpoint' });
      return;
    }

    const result = await acceptStaffAdminInvite(invite);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// Accept hub membership invite (authenticated — existing group joining new hub)
onboardingRouter.post('/accept/hub-membership', authenticate, async (req, res) => {
  try {
    const input = acceptHubMembershipSchema.parse(req.body);
    const invite = await getInviteByToken(input.token);

    if (!invite) {
      res.status(404).json({ error: 'Invalid or expired invite' });
      return;
    }

    if (invite.email !== req.user!.email) {
      res.status(403).json({ error: 'This invite is not for your account' });
      return;
    }

    const result = await acceptHubMembershipInvite(invite, req.user!.id);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
});

// ---------- Staff management ----------

// List hub members
onboardingRouter.get('/hub/:hubId/members', authenticate, async (req, res) => {
  const user = req.user!;
  const hubId = req.params['hubId']!;

  // Only hub members or staff admins
  if (user.role === 'staff_admin' || user.hubId === hubId) {
    const members = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isOwner: hubMembers.isOwner,
        joinedAt: hubMembers.createdAt,
      })
      .from(hubMembers)
      .innerJoin(users, eq(hubMembers.userId, users.id))
      .where(and(eq(hubMembers.hubId, hubId), isNull(users.deletedAt)));

    res.json({ members });
    return;
  }

  res.status(403).json({ error: 'Insufficient permissions' });
});

// Remove hub member
onboardingRouter.delete('/hub/:hubId/members/:userId', authenticate, async (req, res) => {
  const user = req.user!;
  const hubId = req.params['hubId']!;
  const targetUserId = req.params['userId']!;

  // Only hub owner or staff admin
  if (user.role !== 'staff_admin') {
    const owner = await isHubOwner(user.id, hubId);
    if (!owner) {
      res.status(403).json({ error: 'Only hub owners can remove members' });
      return;
    }
  }

  // Cannot remove yourself
  if (targetUserId === user.id) {
    res.status(400).json({ error: 'Cannot remove yourself' });
    return;
  }

  const removed = await removeHubMember(targetUserId, hubId, user.id, req);
  if (!removed) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  res.json({ message: 'Member removed' });
});

// List group members
onboardingRouter.get('/group/:groupId/members', authenticate, async (req, res) => {
  const user = req.user!;
  const groupId = req.params['groupId']!;

  // Only group members, hub admins (for groups in their hub), or staff admins
  if (user.role === 'staff_admin' || user.groupId === groupId || user.role === 'hub_admin') {
    const members = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isOwner: groupMembers.isOwner,
        joinedAt: groupMembers.createdAt,
      })
      .from(groupMembers)
      .innerJoin(users, eq(groupMembers.userId, users.id))
      .where(and(eq(groupMembers.groupId, groupId), isNull(users.deletedAt)));

    res.json({ members });
    return;
  }

  res.status(403).json({ error: 'Insufficient permissions' });
});

// Remove group member
onboardingRouter.delete('/group/:groupId/members/:userId', authenticate, async (req, res) => {
  const user = req.user!;
  const groupId = req.params['groupId']!;
  const targetUserId = req.params['userId']!;

  // Only group owner or staff admin
  if (user.role !== 'staff_admin') {
    const owner = await isGroupOwner(user.id, groupId);
    if (!owner) {
      res.status(403).json({ error: 'Only group owners can remove members' });
      return;
    }
  }

  // Cannot remove yourself
  if (targetUserId === user.id) {
    res.status(400).json({ error: 'Cannot remove yourself' });
    return;
  }

  const removed = await removeGroupMember(targetUserId, groupId, user.id, req);
  if (!removed) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  res.json({ message: 'Member removed' });
});
