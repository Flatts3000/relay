# Problem Brief

## Connecting Mutual Aid Groups to Central Funds — Safely, Quickly, and at Scale

## Context

Across the U.S. (and specifically in Minnesota), mutual aid operates through many small, local groups—often block-level, school-based, church-based, or informal networks. These groups are effective at identifying real need and distributing aid locally.

At the same time, money is easier to raise centrally through trusted hubs and statewide funds. This creates a natural hub-and-spoke system:

- Hubs raise and hold money
- Local groups distribute aid directly to people in need

Today, this system works largely through word of mouth, personal networks, and ad-hoc introductions.

That approach does not scale and leaves significant gaps.

## The Core Problem

**Two coordination failures exist in mutual aid today:**

### 1. Group-to-Hub Connection Gap

Local mutual aid groups lack a safe, reliable, low-friction way to discover, connect to, and receive funds from centralized hubs, while hubs lack a safe way to identify and trust local groups—without collecting sensitive personal data or creating risk for undocumented or vulnerable people.

### 2. Individual-to-Group Discovery Gap

Individual residents facing housing insecurity and other urgent needs lack a centralized way to discover which mutual aid groups serve their area and what resources are available—without providing information that would put them in danger if obtained by federal authorities.

**These are not fundraising problems.** They are coordination, discovery, trust, and safety problems.

## Key Constraints (Non-Negotiable)

These constraints are essential and must shape any solution:

### No individual data collection

- No lists of people seeking aid
- No personally identifying recipient data
- No sensitive data retention
- No search queries, IP addresses, or usage patterns that could identify individuals
- Assume data could be subpoenaed, leaked, or scraped
- Data minimization by default

### Anonymous resource discovery

- Individuals can request help without providing identifying information
- Access via passphrase only—no email, phone, or account required
- Messages from groups are end-to-end encrypted; Relay cannot read them
- Mailboxes auto-delete after 7 days of inactivity
- No tracking of IP addresses on sensitive routes
- If subpoenaed, Relay has nothing useful to produce

### Lightweight verification only

- Some verification is necessary (especially for rent-sized dollars)
- Verification must not be onerous, invasive, or exclusionary

### Group-level operations, anonymous individual intake

- Trust and accountability for fund routing live at the group level
- Distribution decisions remain local
- Individuals submit anonymous requests; groups reach out to help
- Relay facilitates initial contact but cannot read message contents
- No centralized list of individuals—only encrypted, ephemeral mailboxes

## Where the System Breaks Today

### Discovery Failure (Groups ↔ Hubs)

- New or small groups don't know how to get connected
- Hubs don't know which groups exist
- Word-of-mouth leaves invisible gaps

### Discovery Failure (Individuals → Groups)

- Individuals in crisis don't know what mutual aid groups serve their area
- Existing directories are fragmented, outdated, or require accounts
- People avoid searching due to fear of creating digital trails
- Current options require knowing someone who knows someone
- Providing contact info (email, phone) to get help creates a traceable record

### Trust Gap

- Central funds need some assurance money is going to real, functioning groups
- Current options are either too informal or too bureaucratic

### Rent Relief as the Hardest Case

- Larger dollar amounts
- Time-sensitive
- Higher fraud risk
- Higher fear and stigma

Any solution that works only for food or supplies but fails for rent is insufficient.

## Actors & Roles

### Central Fund / Hub

- Raises pooled money
- Needs confidence in downstream distribution
- Often fiscally sponsored or incorporated

### Local Mutual Aid Group

- Informal or semi-formal
- Deep local knowledge
- Needs fast access to funds without exposure risk

### Individual Resident (anonymous)

- Facing housing insecurity, food insecurity, or other urgent need
- Needs to find local resources without creating a digital trail
- May be undocumented or otherwise vulnerable to authorities
- Creates an anonymous mailbox using only a passphrase (no email/phone)
- Specifies what help they need and their region
- Receives encrypted messages from groups who can help
- Relay cannot identify who they are or read their messages

### Verifier / Sponsor (implicit role)

- Could be an existing org, peer group, or trusted intermediary
- Provides just enough assurance without paperwork overload

## What This Is Not

- ❌ A case-management system
- ❌ A benefits application platform
- ❌ A donor-facing marketplace
- ❌ A surveillance-friendly database

## Design Principles (Derived from Research & Practice)

- Trust-based, not compliance-heavy
- Federated, not centralized
- Ephemeral where possible
- Group-first, individual-opaque
- Assume risk and design to reduce blast radius

## Open Questions to Resolve (Before Designing)

### Verification

- What does "trusted enough" mean in practice?
- Peer attestation? Sponsor reference? Lightweight public footprint?

### Discovery

- How do groups find hubs and hubs find groups without a risky directory?

### Money Flow

- How funds actually move today (fiscal sponsors, pass-throughs, informal rails)
- What minimum guardrails are required for larger grants?

### Governance

- Who decides inclusion/exclusion?
- How are disputes or failures handled without punishment or exposure?

## Why This Matters

The current system works—but unevenly. People are helped, but only where connections already exist.

Solving this problem would:

- Close gaps created by informal networks
- Move money faster where it's needed most
- Reduce risk to undocumented and vulnerable communities
- Strengthen mutual aid without institutionalizing it
