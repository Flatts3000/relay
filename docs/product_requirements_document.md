# Product Requirements Document

## Relay — Mutual Aid Coordination Platform

**Version:** 1.0
**Last Updated:** February 2026
**Status:** Pre-Development (Pilot Planning)

---

## Executive Summary

Relay is a minimal coordination layer that connects local mutual aid groups with centralized fund hubs. The platform enables safer, faster fund routing without collecting or storing individual recipient data.

This is not a fundraising platform, benefits application system, or case management tool. Relay solves a specific coordination problem: helping fund hubs discover and trust local groups, and helping local groups access funds without bureaucratic overhead or privacy risk.

---

## Problem Statement

### Current State

Across the U.S., mutual aid operates through small, local groups—block-level, school-based, church-based, or informal networks. These groups effectively identify need and distribute aid locally. Meanwhile, money is easier to raise centrally through trusted hubs and statewide funds.

Today, coordination between these actors happens through:
- Word of mouth
- Ad hoc emails, DMs, or Google Forms
- Personal networks that unintentionally leave gaps

### Pain Points

| Actor | Problem |
|-------|---------|
| **New/small groups** | Don't know how to get connected to funding sources |
| **Fund hubs** | Can't safely discover and verify legitimate local groups |
| **Everyone** | Spends more time coordinating than moving resources |

### The Hardest Case: Rent Relief

Any solution must handle rent relief—the most challenging category:
- Larger dollar amounts
- Time-sensitive
- Higher fraud risk
- Higher fear and stigma for recipients

A solution that works only for food or supplies but fails for rent is insufficient.

### Core Problem Statement

Local mutual aid groups lack a safe, reliable, low-friction way to discover, connect to, and receive funds from centralized hubs, while hubs lack a safe way to identify and trust local groups—without collecting sensitive personal data or creating risk for undocumented or vulnerable people.

---

## Goals and Objectives

### Primary Goals

1. **Enable discovery** — Groups and hubs can find each other without relying on personal introductions
2. **Establish trust** — Lightweight verification that doesn't require invasive documentation
3. **Accelerate funding** — Reduce time from request to funds disbursed
4. **Protect privacy** — Zero individual recipient data collection or retention

### Success Metrics

| Metric | Target |
|--------|--------|
| Groups can connect without personal introductions | Yes/No |
| Hub reviews and routes funds with less back-and-forth | Qualitative feedback |
| Time from request to funds sent | Faster than current process |
| Participant safety perception | "Feels safer than existing tools" |
| Recipient data requests | Zero (system doesn't need it) |

### Non-Goals

- Replacing how local groups distribute aid
- Standardizing mutual aid practices
- Building donor engagement features
- Creating a public directory of groups
- Automating eligibility decisions

---

## Users and Personas

### Primary Users

#### Hub Administrator

**Role:** Manages a central fund that pools and distributes money to local groups

**Characteristics:**
- Often part of a fiscally sponsored or incorporated organization
- Needs confidence that funds reach legitimate, functioning groups
- Currently relies on personal networks for group discovery
- Time-constrained; needs efficient review workflows

**Goals:**
- Discover new groups safely
- Verify group legitimacy without bureaucratic overhead
- Route funds quickly with minimal back-and-forth
- Generate aggregate reports for stakeholders

**Frustrations:**
- Current verification options are too informal or too bureaucratic
- No systematic way to discover groups outside personal networks
- Ad hoc communication creates delays and confusion

---

#### Group Coordinator

**Role:** Represents a local mutual aid group seeking funds from hubs

**Characteristics:**
- May be part of an informal or semi-formal organization
- Deep local knowledge of community needs
- Often volunteers with limited time
- May share devices or rotate responsibilities with others
- Privacy-conscious; concerned about data exposure

**Goals:**
- Access funds quickly without extensive paperwork
- Maintain autonomy over local distribution decisions
- Protect community members from data exposure risks
- Track request status without constant follow-up

**Frustrations:**
- Doesn't know how to get connected to funding sources
- Existing processes feel invasive or bureaucratic
- Status updates require manual follow-up
- Fear of creating records that could harm recipients

---

#### Verifier (Implicit Role)

**Role:** Provides attestation that a group is legitimate

**Characteristics:**
- Could be an existing organization, peer group, or trusted intermediary
- Has existing relationship with the group seeking verification
- Willing to vouch without formal paperwork

**Goals:**
- Provide lightweight assurance to hubs
- Support groups without taking on administrative burden

---

## Functional Requirements

### FR-1: Group Registry

**Priority:** P0 (Must Have)

The system shall maintain a private, invite-only registry of participating groups.

| Field | Required | Notes |
|-------|----------|-------|
| Group name | Yes | May be pseudonymous |
| Service area | Yes | City/region level |
| Aid categories | Yes | Rent, food, utilities, etc. |
| Contact method | Yes | Role-based email preferred |
| Verification status | Yes | System-managed |

**Explicitly excluded from collection:**
- Individual names of aid recipients
- Addresses
- Immigration status
- Case details

**Acceptance Criteria:**
- [ ] Hub admins can view registry of groups in their network
- [ ] Groups can update their own profile information
- [ ] Registry is not publicly accessible
- [ ] No recipient-level data fields exist in the schema

---

### FR-2: Group Verification

**Priority:** P0 (Must Have)

The system shall support lightweight verification to establish "trusted enough" status.

**Supported verification methods:**
1. Hub-admin direct approval
2. Peer attestation (e.g., two existing verified groups vouch)
3. Sponsor reference (church, nonprofit, known organization)

**Constraints:**
- No government IDs required
- No membership rosters required
- No sensitive documents required

**Acceptance Criteria:**
- [ ] Groups can request verification through any supported method
- [ ] Hub admins can approve/deny verification requests
- [ ] Peer attestation requires minimum of 2 existing verified groups
- [ ] Verification status is visible to hub admins
- [ ] Verification can be revoked by hub admin

---

### FR-3: Funding Request Workflow

**Priority:** P0 (Must Have)

The system shall allow verified groups to submit funding requests at the group level (not individual level).

**Request fields:**

| Field | Required | Notes |
|-------|----------|-------|
| Amount requested | Yes | Numeric value |
| Category | Yes | Rent, food, utilities, other |
| Urgency | Yes | Normal, Urgent |
| Region served | Yes | Pre-filled from group profile |
| Justification | No | With UX guidance against personal details |

**Hub actions:**
- Approve request
- Decline request (with optional reason)
- Request clarification (group-level questions only)

**Acceptance Criteria:**
- [ ] Only verified groups can submit requests
- [ ] Justification field displays guidance discouraging personal details
- [ ] Hub admins can filter/sort requests by category, urgency, region
- [ ] Request history is maintained for the group
- [ ] Declined requests include optional reason visible to group

---

### FR-4: Payout Status Tracking

**Priority:** P0 (Must Have)

The system shall track funding request status through defined states.

**Status states:**
1. **Submitted** — Request created by group
2. **Approved** — Hub admin approved the request
3. **Funds Sent** — Hub marked funds as disbursed
4. **Acknowledged** — Group confirmed receipt

**Constraints:**
- No receipts required
- No narratives required
- No recipient data required

**Acceptance Criteria:**
- [ ] Status updates are timestamped
- [ ] Groups can view status of their requests
- [ ] Hub admins can update status
- [ ] Groups can mark "Acknowledged" when funds received
- [ ] Status history is preserved

---

### FR-5: Aggregate Reporting

**Priority:** P1 (Should Have)

The system shall generate aggregate-only reports for hub administrators.

**Available metrics:**
- Total funds routed by category
- Number of groups supported
- Number of requests by status
- Average time from submission to funds sent

**Constraints:**
- No per-person reporting
- No per-household reporting
- No individual request details in reports

**Acceptance Criteria:**
- [ ] Reports show aggregate data only
- [ ] Reports can be filtered by date range
- [ ] Reports can be exported (CSV or PDF)
- [ ] No drill-down to individual request details

---

### FR-6: User Authentication

**Priority:** P0 (Must Have)

The system shall provide secure, email-based authentication.

**Requirements:**
- Email/magic link authentication (no passwords)
- Role-based access (hub admin vs. group coordinator)
- Session management with appropriate timeouts
- Works on shared devices (no persistent login required)

**Acceptance Criteria:**
- [ ] Users receive login link via email
- [ ] Links expire after reasonable time period
- [ ] Users can log out explicitly
- [ ] Sessions timeout after inactivity
- [ ] No "remember me" or persistent sessions

---

## Non-Functional Requirements

### NFR-1: Security

**Priority:** P0 (Must Have)

| Requirement | Specification |
|-------------|---------------|
| Data encryption | TLS 1.3 in transit; AES-256 at rest |
| Input validation | All user inputs validated and sanitized |
| SQL injection prevention | Parameterized queries only |
| XSS prevention | Output encoding on all rendered content |
| Authentication | Secure token-based, short-lived sessions |
| Authorization | Role-based access control enforced server-side |
| Audit logging | All data access and modifications logged |

---

### NFR-2: Privacy

**Priority:** P0 (Must Have)

| Requirement | Specification |
|-------------|---------------|
| Data minimization | Collect only what's explicitly needed |
| Retention limits | Request details purged after defined period |
| No tracking | No analytics that could identify individuals |
| Subpoena consideration | Assume any stored data could be legally compelled |
| No third-party data sharing | Data never shared outside pilot participants |

---

### NFR-3: Accessibility

**Priority:** P0 (Must Have)

| Requirement | Specification |
|-------------|---------------|
| Mobile responsive | Fully functional on mobile browsers |
| Touch targets | Minimum 44x44px touch targets |
| No hover dependencies | All interactions work without hover |
| No keyboard-only shortcuts | All features accessible via touch |
| Low bandwidth | Functions on slow/intermittent connections |
| Screen reader compatible | WCAG 2.1 AA compliance |

---

### NFR-4: Availability

**Priority:** P1 (Should Have)

| Requirement | Specification |
|-------------|---------------|
| Uptime target | 99% during pilot |
| Planned maintenance | Communicated 24 hours in advance |
| Error handling | Graceful degradation with user-friendly messages |

---

### NFR-5: Performance

**Priority:** P1 (Should Have)

| Requirement | Specification |
|-------------|---------------|
| Page load time | < 3 seconds on 3G connection |
| Time to interactive | < 5 seconds on 3G connection |
| API response time | < 500ms for 95th percentile |

---

## Constraints

### Technical Constraints

- **Web-only:** Single-page web application; no native mobile apps
- **No push notifications:** Privacy concern; surfaces sensitive context
- **Email-based access:** Links shared via email or secure messaging
- **No app store presence:** Avoids account/identity requirements

### Operational Constraints

- **Invite-only:** No public registration; all participants vetted
- **Pilot scope:** 1 hub, 3-5 groups, 30-45 days
- **Veto power:** Any participant can pause or end pilot
- **No expansion by default:** Post-pilot decisions made collaboratively

### Data Constraints

- **No recipient PII:** System architecture prevents collection
- **Group-level only:** No individual case tracking
- **Short retention:** Request details not retained indefinitely
- **Aggregate reporting only:** No per-person or per-household reports

---

## Out of Scope

The following are explicitly excluded from this product:

| Feature | Reason |
|---------|--------|
| Individual aid applications | Privacy risk; not group-level |
| Case management | Scope creep; different product |
| Recipient data storage | Core constraint violation |
| Document uploads | Privacy risk; not needed for workflow |
| Donor-facing dashboards | Different audience; scope creep |
| Messaging or chat | Scope creep; use existing channels |
| Eligibility automation | Removes human judgment; scope creep |
| Public group directory | Privacy/safety risk |
| Native mobile apps | Pilot scope; reassess post-pilot |
| Push notifications | Privacy risk |

If any out-of-scope feature becomes necessary, the pilot pauses for reevaluation.

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Groups enter recipient PII in free-text fields | Medium | High | UX guidance; field labels; no "name" or "address" fields |
| Verification process too slow | Medium | Medium | Multiple verification paths; hub admin can fast-track |
| Low adoption during pilot | Medium | Medium | Direct outreach; personal onboarding support |
| Data breach | Low | Critical | Encryption; minimal data retention; security audit |
| Legal subpoena for records | Low | High | Data minimization; short retention; no recipient data |
| Hub or group withdraws mid-pilot | Medium | Low | Graceful offboarding; data export; no lock-in |
| Scope creep requests | High | Medium | Clear PRD; out-of-scope list; pause-and-evaluate policy |

---

## Technical Architecture (High-Level)

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React + Vite + TypeScript | Fast builds; SPA architecture; type safety |
| Styling | Tailwind CSS | Mobile-first; utility classes; rapid UI development |
| Backend | Node.js + Express + TypeScript | Unified language; mature ecosystem; type safety |
| Database | PostgreSQL (AWS RDS) | ACID compliance; data integrity; managed service |
| Compute | AWS Fargate | Containerized; serverless scaling; no server management |
| Infrastructure | Terraform | Infrastructure as code; reproducible; version controlled |
| CI/CD | GitHub Actions | Integrated with repo; automated testing and deployment |
| Containers | Docker | Consistent environments; portable deployments |
| Authentication | Magic link / passwordless | No password storage; works on shared devices |

### Repository Structure

Monorepo with the following structure:
```
/frontend    # React + Vite application
/backend     # Express API server
/infra       # Terraform configurations
```

### Key Architectural Decisions

1. **No recipient data in schema** — Cannot be collected even accidentally
2. **Role-based access control** — Enforced at API level, not just UI
3. **Audit logging** — All data access logged for accountability
4. **Soft deletes with purge** — Data retained briefly for recovery, then purged
5. **Stateless sessions** — No persistent login; works on shared devices

---

## Milestones

### Phase 1: Foundation (Pre-Pilot)

- [ ] Finalize technical architecture
- [ ] Set up development environment
- [ ] Implement authentication system
- [ ] Create database schema
- [ ] Build group registry (FR-1)

### Phase 2: Core Workflow (Pre-Pilot)

- [ ] Implement verification system (FR-2)
- [ ] Build funding request workflow (FR-3)
- [ ] Implement status tracking (FR-4)
- [ ] Security review and hardening

### Phase 3: Pilot Launch

- [ ] Onboard 1 hub administrator
- [ ] Onboard 3-5 local groups
- [ ] Monitor and support for 30-45 days
- [ ] Collect qualitative feedback

### Phase 4: Evaluation

- [ ] Assess success criteria
- [ ] Document learnings
- [ ] Collaborative decision on next steps
- [ ] No expansion without explicit agreement

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **Hub** | Central organization that raises and pools funds for distribution |
| **Local Group** | Informal or semi-formal mutual aid group that distributes aid directly |
| **Verification** | Process of establishing a group as "trusted enough" to receive funds |
| **Attestation** | Vouching for a group's legitimacy by peers or sponsors |
| **Recipient** | Individual receiving aid from a local group (never tracked in Relay) |

### Related Documents

- [Problem Brief](/docs/problem_brief.md)
- [Pilot Proposal](/docs/pilot_proposal.md)
- [Platform Decision](/docs/decision_mobile_app_vs_web_app.md)
- [Naming Decision](/docs/naming_and_domain_decision.md)

### Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | February 2026 | — | Initial PRD |
