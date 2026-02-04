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

Local mutual aid groups lack a safe, reliable, low-friction way to discover, connect to, and receive funds from centralized hubs, while hubs lack a safe way to identify and trust local groups—without collecting sensitive personal data or creating risk for undocumented or vulnerable people.

**This is not a fundraising problem.** It is a coordination, discovery, trust, and safety problem.

## Key Constraints (Non-Negotiable)

These constraints are essential and must shape any solution:

### No individual applications

- No lists of people seeking aid
- No personally identifying recipient data
- No sensitive data retention
- Assume data could be subpoenaed, leaked, or scraped
- Data minimization by default

### Lightweight verification only

- Some verification is necessary (especially for rent-sized dollars)
- Verification must not be onerous, invasive, or exclusionary

### Group-level, not individual-level

- Trust and accountability must live at the group level
- Distribution decisions remain local

## Where the System Breaks Today

### Discovery Failure

- New or small groups don't know how to get connected
- Hubs don't know which groups exist
- Word-of-mouth leaves invisible gaps

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
