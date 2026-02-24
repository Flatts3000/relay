# Onboarding

How hubs, hub admins, groups, and group coordinators are onboarded to Relay. Individuals never create accounts — they submit anonymous encrypted broadcasts without registration.

---

## Actor Model

```
staff_admin → invites hub owner by email
hub owner   → logs in → sets up hub → becomes hub's owner
hub owner   → invites hub staff
hub admin   → invites group owner to their hub
staff_admin → can also invite group owner to a specific hub
group owner → logs in → sets up group → becomes group's owner
group owner → invites group staff
group owner → requests verification (per hub)
hub admin / staff_admin → approves verification
group is live in that hub
```

**Roles**: `staff_admin`, `hub_admin`, `group_coordinator`. One user, one email, one role. A person cannot hold multiple roles.

**Ownership**: Each hub and group has exactly one owner — the user who completed initial setup. Owners can invite and remove staff. Staff have the same role but cannot manage team membership. Ownership transfers are handled manually by a staff admin.

### Multi-hub membership

A group can be a member of multiple hubs. Each membership is independent — a group may be verified in one hub and pending in another. The relationship is many-to-many via `group_hub_memberships`.

Group invites can come from:

- **Any hub admin (owner or staff)** — invites a group owner into their hub
- **Staff admin** — invites a group owner into any hub (must select the target hub)

If the group already exists, the invite creates a new hub membership rather than a new group.

---

## Staff Admin Bootstrap

One default `staff_admin` account is seeded at deploy time. This account can invite additional staff admins. Staff admins have no hub or group association — they operate at the platform level.

---

## Invites

All onboarding starts with an invite. There are no self-service signups.

### `invites` record

| Field           | Type               | Notes                                    |
| --------------- | ------------------ | ---------------------------------------- |
| `id`            | uuid               | Primary key                              |
| `email`         | varchar(255)       | Required; the invitee's email            |
| `role`          | enum               | The role being granted                   |
| `targetHubId`   | uuid (FK → hubs)   | Nullable; which hub this invite is for   |
| `targetGroupId` | uuid (FK → groups) | Nullable; which group this invite is for |
| `invitedById`   | uuid (FK → users)  | Required; who sent the invite            |
| `token`         | varchar            | Required, unique; used in the magic link |
| `expiresAt`     | timestamp          | Required; invite expiry                  |
| `acceptedAt`    | timestamp          | Nullable; set when invite is accepted    |
| `createdAt`     | timestamp          | When the invite was created              |

### Invite scenarios

| Scenario                        | `role`              | `targetHubId` | `targetGroupId` |
| ------------------------------- | ------------------- | ------------- | --------------- |
| Staff admin → hub owner         | `hub_admin`         | null          | null            |
| Staff admin → staff admin       | `staff_admin`       | null          | null            |
| Hub admin → group owner (new)   | `group_coordinator` | inviter's hub | null            |
| Staff admin → group owner (new) | `group_coordinator` | selected hub  | null            |
| Hub admin → existing group      | `group_coordinator` | inviter's hub | null            |
| Hub owner → hub staff           | `hub_admin`         | owner's hub   | null            |
| Group owner → group staff       | `group_coordinator` | null          | owner's group   |

Invite links use magic link tokens. The token encodes enough context for the system to route the user to the correct flow (setup for owners, dashboard for staff, confirmation for existing groups joining a new hub).

---

## Hub Onboarding

### Owner invite

1. Staff admin sends an invite to an email address (role-based email encouraged, e.g. `admin@yourhub.org`).
2. System creates an invite record: `role: hub_admin`, no `targetHubId` (hub doesn't exist yet).
3. Invitee receives a magic link email.
4. On first login, the hub owner is prompted to set up their hub:
   - `name` — hub name (required)
   - `contactEmail` — hub contact email (required; pre-filled with invite email)
5. On submit: system creates the hub, creates the user account, and creates a `hub_members` record with `isOwner: true`.
6. Hub owner lands on their dashboard: empty group list, verification queue, funding request queue.

### Adding hub staff

1. Hub owner invites a new user by email from hub settings.
2. System creates an invite record: `role: hub_admin`, `targetHubId` set.
3. Invitee receives a magic link email.
4. On first login: system creates the user account and a `hub_members` record with `isOwner: false`. No setup flow — they land directly on the hub dashboard.

Any hub admin (owner or staff) can perform hub operations: review groups, approve verifications, manage funding requests. Only the hub owner (and staff admins) can invite or remove hub staff.

### Removing hub staff

Hub owner removes a staff member from hub settings. The `hub_members` record is deleted. The user account remains but the user can no longer log in to the hub. If re-invited later, a new `hub_members` record is created.

### Current state

Hubs and hub admin users are created via seed script or direct DB insert. No invite UI or staff management exists yet.

---

## Group Onboarding

### Owner invite (new group)

1. Hub admin or staff admin sends an invite to an email address (role-based email encouraged, e.g. `treasurer@yourgroup.org`).
   - **Hub admin**: `targetHubId` is the inviter's hub.
   - **Staff admin**: must select the target hub.
2. System creates an invite record: `role: group_coordinator`, `targetHubId` set.
3. Invitee receives a magic link email.
4. On first login, the group owner is prompted to set up their group:
   - `name` — group name (required; may be pseudonymous)
   - `serviceArea` — city or region (required)
   - `aidCategories` — multi-select from: `rent`, `food`, `utilities`, `other` (required)
   - `contactEmail` — group contact email (required; pre-filled with invite email)
5. On submit, the system:
   - Creates the group record.
   - Creates the user account and a `group_members` record with `isOwner: true`.
   - Creates a `group_hub_memberships` row: group + target hub, `verificationStatus: pending`.
6. Group owner lands on their dashboard: group status (pending), broadcast invites, funding request counts.

### Subsequent hub invite (existing group)

1. A hub admin (or staff admin) invites the existing group owner's email to their hub.
2. System recognizes the user and group already exist.
3. Owner receives an email with a magic link.
4. Link opens a **confirmation screen**: "Hub X wants to add your group as a member."
5. On confirmation: system creates a new `group_hub_memberships` row (pending).
6. The group now appears in both hubs — verified independently by each.

### Adding group staff

1. Group owner invites a new user by email from group settings.
2. System creates an invite record: `role: group_coordinator`, `targetGroupId` set.
3. Invitee receives a magic link email.
4. On first login: system creates the user account and a `group_members` record with `isOwner: false`. No setup flow — they land directly on the group dashboard.

Group staff can perform all group operations: view broadcasts, manage funding requests, initiate verification. Only the group owner (and staff admins) can invite or remove group staff.

### Removing group staff

Group owner removes a staff member from group settings. The `group_members` record is deleted. The user account remains. If re-invited later, a new `group_members` record is created.

### Additional notes

Groups also have optional broadcast fields (`publicKey`, `broadcastCategories`, `broadcastServiceArea`) that are configured during broadcast enrollment, not during initial setup.

### Current state

Hub admin creates groups directly via the `/groups/new` form (CreateGroupPage). No invite flow, multi-hub membership, or staff management exists yet.

---

## Schema Changes

### `users` (updated)

Auth identity only. No hub/group association on this table.

| Field         | Type         | Notes                                           |
| ------------- | ------------ | ----------------------------------------------- |
| `id`          | uuid         | Primary key                                     |
| `email`       | varchar(255) | Required, unique                                |
| `role`        | enum         | `staff_admin`, `hub_admin`, `group_coordinator` |
| `createdAt`   | timestamp    |                                                 |
| `updatedAt`   | timestamp    |                                                 |
| `lastLoginAt` | timestamp    | Nullable                                        |
| `deletedAt`   | timestamp    | Nullable; soft delete                           |

`hubId` and `groupId` are **removed** from the users table.

### `hub_members` (new)

| Field       | Type              | Notes                               |
| ----------- | ----------------- | ----------------------------------- |
| `id`        | uuid              | Primary key                         |
| `userId`    | uuid (FK → users) | Required; unique (one hub per user) |
| `hubId`     | uuid (FK → hubs)  | Required                            |
| `isOwner`   | boolean           | Default `false`                     |
| `createdAt` | timestamp         |                                     |

Unique constraint on `userId` — a hub admin belongs to exactly one hub.

### `group_members` (new)

| Field       | Type               | Notes                                 |
| ----------- | ------------------ | ------------------------------------- |
| `id`        | uuid               | Primary key                           |
| `userId`    | uuid (FK → users)  | Required; unique (one group per user) |
| `groupId`   | uuid (FK → groups) | Required                              |
| `isOwner`   | boolean            | Default `false`                       |
| `createdAt` | timestamp          |                                       |

Unique constraint on `userId` — a group coordinator belongs to exactly one group.

### `group_hub_memberships` (new)

| Field                | Type               | Notes                                               |
| -------------------- | ------------------ | --------------------------------------------------- |
| `id`                 | uuid               | Primary key                                         |
| `groupId`            | uuid (FK → groups) | Required                                            |
| `hubId`              | uuid (FK → hubs)   | Required                                            |
| `verificationStatus` | enum               | `pending`, `verified`, `revoked`; default `pending` |
| `createdAt`          | timestamp          |                                                     |

Unique constraint on (`groupId`, `hubId`).

### Migration from current schema

1. Create `hub_members`, `group_members`, `group_hub_memberships`, and `invites` tables.
2. Migrate existing `users.hubId` → `hub_members` rows.
3. Migrate existing `users.groupId` → `group_members` rows.
4. Migrate existing `groups.hubId` + `groups.verificationStatus` → `group_hub_memberships` rows.
5. Drop `users.hubId`, `users.groupId`, `groups.hubId`, `groups.verificationStatus`.

---

## Group–Hub Membership

The relationship between groups and hubs is many-to-many via `group_hub_memberships`. Verification is **per membership** — a group verified in Hub A is not automatically verified in Hub B.

### Public directory

A group that is verified in at least one hub appears in the public directory. The group's public page shows which hub(s) it belongs to.

---

## Group Verification

### Verification methods

| Method             | Requirement                                                    |
| ------------------ | -------------------------------------------------------------- |
| Hub admin approval | Hub admin directly approves the group within their hub         |
| Peer attestation   | At least 2 verified groups in the same hub vouch for the group |
| Sponsor reference  | A known organization (church, nonprofit) provides a reference  |

### Verification constraints

- No government IDs required
- No membership rosters required
- No sensitive documents required
- Attestation is a single-screen, single-action flow
- Attestor identity is not publicly attached to the group
- Creates no ongoing monitoring or reporting obligation

### Verification flow

1. Group coordinator (owner or staff) initiates a verification request for a specific hub membership.
2. That hub's admin (or a staff admin) reviews and approves or denies.
3. On approval: membership `verificationStatus` → `verified`.
4. Group appears in the public directory and can receive encrypted broadcasts routed through that hub.
5. On revocation: membership `verificationStatus` → `revoked`; removed from that hub's directory.

---

## Authentication

All operator roles use magic link authentication. No passwords.

| Parameter                  | Value                           |
| -------------------------- | ------------------------------- |
| Magic link expiry          | 15 minutes                      |
| Session inactivity timeout | 30 minutes                      |
| Persistent login           | Not supported; no "remember me" |
| Shared device support      | Yes; explicit logout available  |

Invite emails and login emails both use magic links. The invite token encodes whether it's a first-time setup (owner), a staff addition (direct to dashboard), or a hub membership confirmation (confirmation screen).

---

## Summary Flowchart

```
┌──────────────────────────────────────────────────────────────┐
│ BOOTSTRAP                                                     │
│ One staff_admin account seeded at deploy time.                │
│ Staff admin can invite additional staff admins.               │
└──────────────────────────────────────────────────────────────┘

┌──────────────┐
│ Staff Admin   │
└──────┬───────┘
       │ invites hub owner by email
       ▼
┌──────────────┐
│  Hub Owner    │──── receives magic link ──── logs in
└──────┬───────┘
       │ first login: sets up hub (name, contactEmail)
       │ system creates hub + hub_members (isOwner: true)
       │
       ├── invites hub staff by email
       │   staff → magic link → hub dashboard (no setup)
       │   system creates hub_members (isOwner: false)
       │
       │ any hub admin invites group     ◄── staff admin can also do this
       │ owner by email (to this hub)         (selects target hub)
       ▼
┌───────────────┐
│  Group Owner   │──── receives magic link ──── logs in
└──────┬────────┘
       │
       ├── NEW (no group yet):
       │   sets up group (name, serviceArea, aidCategories, contactEmail)
       │   system creates group + group_members (isOwner: true)
       │   + group_hub_membership (pending)
       │
       ├── EXISTING (group already exists):
       │   confirmation screen: "Hub X wants to add your group"
       │   on confirm → new group_hub_membership (pending)
       │
       ├── invites group staff by email
       │   staff → magic link → group dashboard (no setup)
       │   system creates group_members (isOwner: false)
       │
       │ requests verification (per hub)
       ▼
┌──────────────────────────────────────────────┐
│ Hub Admin / Staff Admin reviews verification │
│ (scoped to their hub's membership)           │
└──────┬───────────────────────────────────────┘
       │ approves
       ▼
┌───────────────────────────────────────────────┐
│ Group is live in that hub                      │
│  • Listed in public directory (shows hub(s))   │
│  • Can receive encrypted broadcasts            │
│  • Can submit funding requests to that hub     │
└───────────────────────────────────────────────┘
```
