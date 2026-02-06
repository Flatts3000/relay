# Encrypted Public Help Broadcast (Relay-Blind)

Relay MVP spec for anonymous, encrypted help broadcasts from individuals to mutual aid groups.

## Decisions

Resolved questions about scope, architecture, and migration.

| #   | Question                                                                                                            | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Does this replace the current mailbox system or run alongside it?                                                   | **Replaces it.** The broadcast model is the target architecture. The current mailbox system (passphrase-derived individual keypair, on-platform group replies) is superseded by this spec.                                                                                                                                                                                                                                                   |
| 2   | Is it acceptable for the individual to provide contact info to groups?                                              | **Yes.** Stakeholders need a way for people in crisis to tell groups they need help and how to reach them. Encryption ensures only reviewed groups can read the contact info. This is an accepted tradeoff.                                                                                                                                                                                                                                  |
| 3   | When do we build group key management?                                                                              | **Deferred.** Group encryption keypair generation, storage, and multi-operator access will be designed later. MVP assumes this infrastructure exists.                                                                                                                                                                                                                                                                                        |
| 4   | Is lightweight verification sufficient given that unreviewed groups could decrypt broadcasts?                       | **Yes, with manual vetting.** Every group will be vetted before being granted access. No group receives broadcast decryption capability without prior vetting.                                                                                                                                                                                                                                                                               |
| 5   | What happens to the existing mailbox code?                                                                          | **No teardown.** We are in discovery and planning. Existing mailbox code remains in the codebase until the broadcast system is ready to replace it.                                                                                                                                                                                                                                                                                          |
| 6   | Is the safe-word verification code required for MVP?                                                                | **Yes, required.** Both the individual and the group receive a shared password. When the group contacts the individual outside Relay, they exchange this password to verify that the contact originated from Relay.                                                                                                                                                                                                                          |
| 7   | Can individuals return to the site to view past broadcasts?                                                         | **Post-MVP.** Pending stakeholder confirmation. MVP broadcasts are fire-and-forget from the individual's perspective — no account or persistent identity to return to.                                                                                                                                                                                                                                                                       |
| 8   | How do we prevent Relay (or an attacker with admin access) from adding a rogue group that decrypts past broadcasts? | **Per-group encrypted invites with TTL and confirmation-based deletion.** Each group receives an individually encrypted invite that is deleted from Relay once the group confirms receipt. Groups added after a broadcast was sent never receive an invite for it. Combined with multi-party vetting, this narrows the rogue-group attack window to only broadcasts sent while the rogue group exists, and minimizes encrypted data at rest. |
| 9   | Should invite confirmation be explicit or automatic?                                                                | **Auto-delete after 10 minutes.** When a group decrypts an invite, a 10-minute countdown starts. The group can re-read and copy out what they need during this window. After 10 minutes the invite is automatically deleted from the server. The group can also manually delete it sooner.                                                                                                                                                   |

## Goal

Allow an individual to publish "I need help" to unknown groups such that:

- Any eligible group (per directory/bucket) can read it
- Relay cannot read message content or contact details
- The individual does not need prior contact with any group
- Works on borrowed/public devices (no accounts required)

### Threat Model

Relay protects against Relay-side and infrastructure compromise, not recipient compromise. Reviewed groups can read broadcasts sent to them — that is by design. If a group is compromised, broadcasts they have already decrypted are compromised, including contact info.

Relay's security boundary is the server. A full server breach reveals only encrypted ciphertext and routing metadata. The per-group invite model further limits exposure: encrypted invites are deleted after group confirmation, so a breach at any given moment exposes only unconfirmed invites rather than the full broadcast archive.

Relay does not protect against a rogue group being added to the directory by a compromised admin. However, the per-group invite model ensures a rogue group can only receive invites for broadcasts sent _after_ it was added — it cannot retroactively access past broadcasts. Multi-party vetting (requiring an external co-signer for group approval) is the primary defense against this scenario.

### Non-Goals (MVP)

- Perfect anonymity against network-level observation
- Strong identity/anti-impersonation for individuals
- Complex group chat or ongoing threads beyond basic replies
- Returning to view or manage past broadcasts (post-MVP, pending confirmation)

## Core Concept

A sender selects a region and one or more categories. Relay resolves these selections into one or more **buckets** (one per category). Only reviewed groups are included in the directory and eligible for routing — vetting is a binary gate on directory inclusion, not a sender-facing choice. The client encrypts the message once with a symmetric key, then creates a **per-group encrypted invite** for each matching group by wrapping the symmetric key with that group's public key (deduplicated — a group serving multiple selected categories receives only one invite).

Each invite is individually tracked by Relay. Once a group confirms receipt, Relay deletes that group's invite. Once all invites for a broadcast are confirmed or expired, Relay deletes the shared ciphertext. This means:

- **Relay holds encrypted material for the shortest possible window** — not the full broadcast TTL
- **Groups added after a broadcast was sent never receive an invite** — the invite list is fixed at send time
- **A server breach exposes only unconfirmed invites** — not the full archive

Key properties:

- **Payload encryption:** symmetric (fast)
- **Recipient access:** per-group public key wrapping (asymmetric), one invite per group
- **Relay's role:** stores ciphertext, routes invites by bucket, tracks confirmation, cannot decrypt
- **Invite lifecycle:** created at send → delivered to group → confirmed → deleted

## How the Encryption Works (Plain Language)

This section explains the cryptographic scheme in everyday terms. No technical background is required.

### The lockbox analogy

Imagine the individual writes a letter asking for help, puts it in a lockbox, and locks it with a key. That key is the only way to open the lockbox. Relay holds the locked box but does not have the key — so Relay can never read the letter.

Now, each group has their own personal padlock (their "public key") and the only key that opens that padlock (their "private key"). The group publishes the padlock but keeps the key.

When the individual submits their help request, their device:

1. **Puts the letter in the lockbox** — encrypts the message (including contact info and safe-word) with a single random key
2. **Makes a copy of that key for each group** — but wraps each copy inside that group's padlock, so only that group's private key can unwrap it
3. **Sends the locked box and the wrapped key copies to Relay** — Relay can hold them, but can't open any of it

When a group checks their inbox, their device:

1. **Unwraps their copy of the key** using their private key (which never leaves their device)
2. **Opens the lockbox** and reads the letter
3. **Confirms they've read it** — Relay deletes their wrapped key copy. After 10 minutes it's deleted automatically.

Once every group has confirmed (or their invite expires), Relay deletes the lockbox too.

### Why Relay can't read anything

Relay only ever holds the locked box and wrapped key copies. It doesn't have any group's private key, so it can't unwrap any key copy. It can't open the lockbox. Even if someone broke into Relay's servers, they'd find only encrypted data they can't decrypt.

### Why a new group can't read old messages

The wrapped key copies are created at the moment the individual submits. If a new group joins the directory later, there is no wrapped key copy for them — it was never created. They can only receive invites for future broadcasts.

### Why the message disappears

Once a group reads the message, their wrapped key copy is deleted. Once all copies are gone, the lockbox itself is deleted. There's nothing left on Relay to decrypt even if the right key appeared later.

### What Relay can see

Relay can see the _outside of the envelope_ — which region and categories the request is for, when it was sent, and which groups it was routed to. It cannot see the _contents_ — the message, the contact info, or the safe-word. This routing metadata is the minimum needed to deliver the right invites to the right groups.

## Definitions

### Bucket

A deterministic label representing a recipient set.

Examples:

```
US-VA_ROANOKE::FOOD
US-NY_NYC_BK::HOUSING
```

Bucket dimensions (MVP):

| Dimension | Scope                                 |
| --------- | ------------------------------------- |
| Region    | Coarse (city / county / zip3 / metro) |
| Category  | Limited taxonomy (see below)          |

Only reviewed groups appear in the directory and are eligible for bucket routing. Vetting is a prerequisite for directory inclusion, not a bucket dimension.

### Directory

Public list of group endpoints, public keys, and metadata needed for bucket membership.

### Broadcast

A help request from an individual, consisting of shared encrypted ciphertext and a set of per-group invites.

### Invite

A per-group encrypted package containing a wrapped copy of the broadcast's symmetric key. Each invite is individually tracked and deleted after the group confirms receipt or the TTL expires.

## UX Flows

### Sender: "Request Help"

**Entry point:** "Request help (anonymous)"

**Steps:**

1. **Choose location** (coarse)
   - Pick from a dropdown or "near me" (if allowed) — convert to coarse region client-side
   - Display: "We only store coarse region for routing."
2. **Choose one or more categories** (multi-select required — individuals often need help in multiple areas simultaneously, e.g., food + shelter)
3. **Write message**
   - Required: at least one contact method (phone / email / freeform "safe contact")
   - Warning displayed: "Only recipient groups can read this. Relay cannot."
4. **Submit**

**Post-submit receipt screen:**

- Broadcast ID (short)
- **Safe-word verification code** (MVP required): generated client-side and displayed to the individual on this screen only. The same code is included inside the encrypted payload so that recipient groups can read it after decryption. When a group contacts the individual outside Relay, they speak the safe-word to prove the contact originated from a Relay broadcast. Relay never sees the safe-word — it exists only in the encrypted payload and on the individual's receipt screen.
- Group contacts you via your chosen method(s) outside of Relay

### Group: "Inbox"

1. Group operator unlocks group key material on their device
2. Client fetches pending invites for buckets the group is subscribed to
3. Client unwraps the symmetric key from the invite and decrypts the broadcast payload
4. Group sees the message, contact info, and safe-word verification code
5. Group **confirms receipt** — Relay deletes that group's invite from the server
6. Group contacts the individual outside Relay, using the safe-word to verify

**Confirmation model:** When a group successfully decrypts an invite, a 10-minute window starts. During this window the group can re-read the message and copy out what they need. After 10 minutes the invite is automatically deleted from the server. The group can also manually delete the invite before the 10 minutes elapse. The countdown is visible in the UI.

## Cryptographic Envelope (MVP)

### Group Keys

Each group has:

- `group_enc_keypair` (X25519 recommended)
- Public key published in directory; private key stored by group operators (never on Relay)

Note: group key management infrastructure (generation, storage, multi-operator sharing, rotation) is deferred. MVP assumes this exists.

### Cryptographic Primitives

This document describes the cryptographic model at an architectural level — what operations happen, who holds what keys, and what Relay can and cannot see. It does not pin specific algorithms or parameters.

The broadcast model is a **multi-recipient sealed envelope** (one symmetric key, wrapped per recipient). This is closer to how `age` or PGP multi-recipient encryption works than to the Signal Protocol. Signal's Double Ratchet provides forward secrecy for ongoing 1:1 conversations — that does not apply here, as broadcasts are one-shot with no replies and no persistent sender identity.

TweetNaCl.js is already in the codebase and covers the necessary primitives: `crypto_secretbox` (symmetric AEAD), `crypto_box` (asymmetric key wrapping), and `crypto_box_keypair` (X25519 key generation). A separate implementation spec (`docs/broadcast_crypto_spec.md`) should be created when moving to implementation, pinning exact primitives, key sizes, nonce handling, and padding schemes.

### Broadcast Encryption (Sender-Side)

1. Generate random `content_key` (symmetric)
2. Generate safe-word verification code client-side
3. Encrypt payload (message text + contact info + safe-word) with `content_key` to produce `ciphertext_payload`
4. Resolve selected categories into matching buckets, collect the deduplicated set of recipient groups
5. For each recipient group: wrap `content_key` using group's public key to produce one invite (`wrapped_key[group_id]`)
6. Upload to Relay:
   - `broadcast_header` (routing metadata: region, categories, timestamp, TTL)
   - `ciphertext_payload` (shared across all invites)
   - Per-group invites: `wrapped_key[group_id]` for each recipient
     **Encrypted payload contains:**

- Message text
- Contact info
- Safe-word verification code

**No replies from groups to individual broadcasts on Relay.** Groups contact the individual directly outside the platform using the contact info in the decrypted payload.

### Invite Lifecycle

Each invite progresses through a fixed lifecycle:

```
created → pending → decrypted (10 min) → deleted
                  ↘ expired → deleted
```

| State     | Meaning                                                                                                          |
| --------- | ---------------------------------------------------------------------------------------------------------------- |
| pending   | Invite exists on Relay, group has not yet decrypted                                                              |
| decrypted | Group decrypted the invite, 10-minute countdown started                                                          |
| deleted   | Wrapped key removed — either countdown elapsed, group manually deleted, or invite TTL expired without decryption |

Once all invites for a broadcast are deleted (confirmed or expired), Relay deletes the shared `ciphertext_payload`. A **tombstone** is created with aggregate metadata only.

## Key Handling for Public/Borrowed Devices

### Sender (No Persistent Identity)

- No long-term sender identity key required
- MVP broadcasts are fire-and-forget: individual submits, sees the safe-word on the receipt screen, and leaves
- Post-MVP: may support returning to view past broadcasts (pending stakeholder confirmation)

### Group (Must Be Trusted)

- Group private key must be protected: passphrase-derived unlock, or encrypted key blob + passphrase
- MVP assumes at least one trusted operator device
- Every group is manually vetted before receiving access (see Vetting)

## Directory & Group Onboarding (MVP)

### Group Registration

A group submits:

- Display name (optional public)
- Regions served (coarse)
- Categories served
- Public encryption key

### Vetting

Vetting is **mandatory** — without it, attackers can register as "groups" and decrypt invites containing contact info.

MVP vetting:

- Every group is manually reviewed before being granted access
- Manual review + references + basic proof of community presence
- No group receives broadcast decryption capability without prior vetting
- Groups that have not been reviewed are excluded from broadcast routing entirely

**Terminology note:** In user-facing copy, use **"reviewed"** or **"approved"** rather than "verified." "Verified" implies endorsement, background checks, or safety guarantees that Relay does not provide. UX copy should include a disclaimer:

> "Relay reviews groups to confirm they are real community organizations. This does not guarantee quality, safety, or outcomes."

### Directory Access

The directory is public and cacheable. Client fetches the recipient list for a bucket.

Directory response per group:

| Field               | Description                   |
| ------------------- | ----------------------------- |
| `group_id`          | Unique group identifier       |
| `public_key`        | Encryption public key         |
| `bucket_membership` | Buckets this group belongs to |
| Contact page        | Optional (not required)       |

## Routing & Storage (Relay Server)

### What Relay Stores

**Per broadcast (while any invite is pending):**

- `broadcast_id`
- `ciphertext_payload` (shared encrypted blob)
- `broadcast_header` (routing metadata: region, categories, timestamp, TTL)
  **Per invite (while pending):**

- `invite_id`
- `broadcast_id` (reference to parent broadcast)
- `group_id` (recipient group)
- `wrapped_key` (symmetric key wrapped to this group's public key)
- `status` (pending / confirmed / expired)
- `created_at`, `expires_at`

**After all invites are deleted (tombstone only):**

- `broadcast_id`
- Bucket (region + categories)
- Timestamp
- Which groups confirmed (group IDs)

### What Relay Must NOT Store or Log

- Plaintext payload (message text, contact info)
- Safe-word verification codes (plaintext or hashed — Relay never stores these in any form)
- `content_key` or any group's `wrapped_key` after that invite is deleted
- IP logs beyond what is operationally unavoidable (configure no-retention where possible)
- Analytics identifiers

### Retention & Deletion

- **Invite TTL:** each invite expires after a configurable period (e.g., 7 days)
- **Confirmation-based deletion:** when a group confirms receipt, their invite (`wrapped_key`) is immediately deleted
- **Ciphertext cleanup:** once all invites for a broadcast are deleted (confirmed or expired), the shared `ciphertext_payload` is deleted
- **Tombstone creation:** a tombstone with aggregate metadata is created at ciphertext cleanup
- **Optional shorter TTL** for high-risk categories

This means encrypted material exists on Relay for the **shortest possible window** — not a fixed 30-day broadcast TTL, but only until all groups have confirmed or their invites have expired.

## Abuse & Safety Controls (MVP)

### Sender-Side Friction (Lightweight, Anonymous)

- Rate limiting by proof-of-work or privacy-preserving token
- Optional CAPTCHA in strict mode (careful: CAPTCHAs can deanonymize)

### Recipient-Side Controls

- Groups can mute/ignore invites
- Report abusive broadcasts (report contains ciphertext + broadcast ID, not plaintext)

### Content Warnings (UX)

- "Don't share information you wouldn't want the recipient group to know."
- "On shared computers, consider using a safe contact method."

## Performance Constraints & Scaling

### Invite List Size

The number of invites per broadcast grows with the number of groups in the matching buckets.

**MVP constraints:**

- Keep buckets small via coarse region + category
- Cap invites per broadcast (e.g., max 50-200 groups)
- If a bucket exceeds the cap:
  - Choose top N by proximity / availability / reviewed priority
  - Or split into multiple broadcasts (v2)

### Invite List Padding (MVP)

The number of invites in a broadcast reveals how many reviewed groups serve that bucket, leaking relative group density by region/category. To partially blunt this metadata leakage:

- Pad the invite list to a fixed bucket cap (e.g., 50 entries)
- If fewer groups exist in the bucket, add dummy invites with wrapped keys to a null public key
- If more groups exist, cap at the limit and prioritize as described above

This keeps the invite list size roughly constant across broadcasts regardless of actual group density. Dummy invites are never confirmed and are cleaned up at TTL expiry.

### Payload Padding (MVP+)

To reduce phone/email inference by ciphertext size: pad payload to nearest size class (1 KB, 4 KB, 16 KB).

## Category Taxonomy (MVP)

| Category          |
| ----------------- |
| Food              |
| Shelter / Housing |
| Transportation    |
| Medical           |
| Safety / Escort   |
| Childcare         |
| Legal             |
| Supplies          |
| Other             |

## Sharp Edges

Known risks to address early:

1. **Vetting is mandatory.** If attackers can join the directory as "groups," they can decrypt invites containing contact info. Every group must be vetted before access.
2. **Individual provides contact info.** Unlike the previous mailbox model where groups revealed themselves first, this model requires the individual to include contact info in the encrypted payload. This is an accepted tradeoff — encryption ensures only reviewed groups can read it.
3. **Recipient compromise is unavoidable.** If a group is compromised, any invites they have already decrypted are compromised, including contact info. The per-group invite model limits this: only invites sent while the group was active are exposed, and server-side invites are deleted after confirmation.
4. **Rogue group insertion.** Relay controls the directory. A compromised admin could add a rogue group that receives invites for future broadcasts. Mitigations: (a) per-group invites prevent retroactive access to past broadcasts, (b) multi-party vetting requires an external co-signer for group approval, (c) public directory audit trail makes covert insertion detectable. This is the residual trust-in-operator risk.
5. **Network-layer anonymity is an operational choice.** Requires decisions around Tor access and log retention settings.
6. **Safe-word code handling.** The safe-word is generated client-side, displayed on the individual's receipt screen, and included inside the encrypted payload. Relay never stores the safe-word in any form — not plaintext, not hashed. Storing even a hash would create a correlation artifact linking an individual to a specific broadcast.
7. **Confirmation timing.** The window between invite creation and group confirmation is the period of maximum exposure. Encouraging groups to check their inbox frequently and confirming promptly reduces the amount of encrypted material at rest at any given time.

## Migration Notes

This spec replaces the current anonymous mailbox system. The existing mailbox code (passphrase-derived keypairs, on-platform encrypted replies, mailbox creation/lookup/deletion, tombstones) remains in the codebase during the discovery and planning phase. No code will be torn down until the broadcast system is ready to replace it.
