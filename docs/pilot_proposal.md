# Pilot Proposal

## Mutual Aid Group ↔ Fund Hub Coordination Pilot

## Purpose

The goal of this pilot is to test a safer, faster way for:
1. Local mutual aid groups to connect with centralized fund hubs
2. Individual residents in crisis to connect with local groups who can help

All of this without collecting or storing identifiable individual data, and without changing how aid is distributed on the ground.

This pilot is explicitly not about tracking individuals or standardizing how groups do their work.

## What Problems This Pilot Addresses

### Group-to-Hub Coordination

Today, most coordination between local mutual aid groups and centralized funds happens through:

- Word of mouth
- Ad hoc emails, DMs, or Google Forms
- Personal networks that unintentionally leave gaps

This works, but unevenly. New or smaller groups struggle to get connected, hubs struggle to discover groups safely, and everyone spends more time coordinating than moving resources.

### Individual-to-Group Discovery

Individual residents facing housing insecurity and other urgent needs lack a safe way to find help:

- Existing directories are fragmented, outdated, or require accounts
- Providing an email or phone number creates a traceable record
- People avoid searching due to fear of creating digital trails that could be subpoenaed by federal authorities
- Current options require knowing someone who knows someone

This pilot tests whether a minimal coordination layer can reduce friction while respecting safety, privacy, and autonomy.

## Scope of the Pilot

### Duration

30–45 days

### Participants

- 1 central fund hub (e.g., a statewide mutual aid fund)
- 3–5 local mutual aid groups
- Individual residents in those groups' service areas (anonymous, no registration)
- 1 pilot facilitator / builder (me)

Participation is opt-in and can be ended at any time by any party.

## What the Pilot Includes

### 1. Group Registry (Private, Invite-Only)

Participating groups are listed in a private registry visible only to the hub.

**Collected information (minimal):**

- Group name (can be pseudonymous)
- Service area (city/region)
- Aid categories supported (e.g., rent, food, utilities)
- Preferred contact method (role-based email or equivalent)
- Verification status (see below)

**Explicitly excluded:**

- Individual names of aid recipients
- Addresses
- Immigration status
- Case details

### 2. Lightweight Verification

Verification exists solely to establish "trusted enough" status for routing funds.

**Accepted methods:**

- Hub-admin approval
- Peer attestation (e.g., two existing groups vouch)
- Known sponsor reference (church, nonprofit, etc.)

No IDs, rosters, or sensitive documents are required.

### 3. Funding Request Workflow (Group-Level Only)

Groups submit funding requests on behalf of their work, not individuals.

**Each request includes:**

- Amount requested
- Category (rent / food / utilities / etc.)
- Urgency (normal / urgent)
- Region served
- Optional short justification (with explicit guidance not to include personal details)

The hub can approve, decline, or ask clarifying questions at the group level.

### 4. Payout Status Tracking

The system tracks only:

- Request submitted
- Approved
- Funds sent
- Acknowledged

No receipts, narratives, or recipient data are required.

### 5. Aggregate Transparency

The pilot produces aggregate-only summaries, such as:

- Total funds routed by category
- Number of groups supported
- Time-to-funding averages

No per-person or per-household reporting.

### 6. Anonymous Help Requests (Individual-to-Group)

Individuals in crisis can request help without providing identifying information.

**How it works:**

1. Individual visits the site and selects "I need help"
2. System generates a passphrase (e.g., "blue-river-mountain-4729")
3. Individual specifies: type of help needed, general area/region
4. Individual writes down their passphrase—this is their only way to check for responses
5. Groups serving that area see the request (category + region only, no identifying info)
6. Groups send encrypted messages offering to help
7. Individual returns to site, enters passphrase, reads messages
8. Individual contacts the group directly using info provided in the message

**Privacy guarantees:**

- No email, phone number, or account required
- Messages are end-to-end encrypted—Relay cannot read them
- Private key derived from passphrase; Relay never sees it
- Mailboxes delete after 7 days of inactivity (checking messages resets the timer)
- On deletion: tombstone retained (category, region, timestamps) for group visibility; messages and keys hard deleted
- No IP address logging on anonymous routes
- Works from any device with the passphrase
- If subpoenaed, Relay can only produce: encrypted blobs it cannot decrypt, and that a request for "rent help in Hennepin County" existed

**What groups see:**

- Category of help needed (rent, food, utilities, etc.)
- General region (city/county level)
- A "Reply" button to send an encrypted message

**What groups do NOT see:**

- Any identifying information about the individual
- Other groups' responses

## What Is Explicitly Out of Scope

To avoid risk and scope creep, the following are not part of this pilot:

- Individual accounts or registration (passphrase-only access)
- Collection of email, phone, or other contact info from individuals
- Case management
- Long-term data storage of individual requests
- Document uploads
- Donor-facing dashboards
- Relay-mediated chat (groups provide their own contact methods)
- Automation of eligibility decisions

If any of these become necessary, the pilot pauses and is reevaluated.

## Data & Safety Guardrails

- No collection of individual PII (no email, phone, name, address)
- End-to-end encryption for individual-to-group messages
- Passphrase-only access for individuals (nothing stored that identifies them)
- Auto-deletion of anonymous mailboxes after 7 days of inactivity
- No IP logging on anonymous routes
- Strong UX guidance discouraging sensitive data entry
- Short data retention for group funding requests
- Aggregate reporting only
- No data sharing outside pilot participants
- **Subpoena-resistant design:** If legally compelled, Relay can only produce encrypted data it cannot decrypt
- **Veto power:** Any participating group or hub may pause or end the pilot if it feels unsafe or misaligned.

## Success Criteria (How We'll Know This Helped)

This pilot is successful if:

- A group can get connected to hubs without relying on personal introductions
- An individual can request help without providing identifying information
- Groups can respond to individuals in need without knowing who they are
- The hub can review and route funds with less back-and-forth
- Funds move faster than before
- Participants say this feels safer than existing ad hoc tools
- No one asks for recipient data because the system doesn't need it
- If asked to produce individual data, Relay has nothing useful to provide

If these aren't met, the pilot is considered unsuccessful and stopped.

## What Comes After (Only If the Pilot Works)

If—and only if—the pilot proves useful and safe:

- Participants decide whether to continue, expand, or stop
- Any next steps are co-designed with organizers
- No expansion happens by default

## Why This Approach

This pilot prioritizes:

- Trust over scale
- Coordination over control
- Safety over convenience

The intent is to support the work already happening—not reshape it.

## Next Steps

1. Confirm interest from 1 hub and 3–5 groups
2. Agree on pilot duration and start date
3. Launch with a closed, invite-only setup
