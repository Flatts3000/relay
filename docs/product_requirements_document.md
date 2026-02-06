# Product Requirements Document

## Relay — Mutual Aid Coordination Platform

**Version:** 1.0
**Last Updated:** February 2026
**Status:** Pre-Development (Pilot Planning)

---

## Executive Summary

Relay is a minimal coordination layer that connects local mutual aid groups with centralized fund hubs, and helps individuals in crisis discover local resources. The platform enables safer, faster fund routing without collecting or storing individual recipient data—and provides anonymous resource discovery without creating digital trails.

This is not a fundraising platform, benefits application system, or case management tool. Relay solves two specific coordination problems:

1. Helping fund hubs discover and trust local groups, and helping local groups access funds without bureaucratic overhead or privacy risk
2. Helping individual residents find mutual aid resources without providing information that could endanger them if obtained by federal authorities

---

## Problem Statement

### Current State

Across the U.S., mutual aid operates through small, local groups—block-level, school-based, church-based, or informal networks. These groups effectively identify need and distribute aid locally. Meanwhile, money is easier to raise centrally through trusted hubs and statewide funds.

Today, coordination between these actors happens through:

- Word of mouth
- Ad hoc emails, DMs, or Google Forms
- Personal networks that unintentionally leave gaps

### Pain Points

| Actor                | Problem                                                  |
| -------------------- | -------------------------------------------------------- |
| **New/small groups** | Don't know how to get connected to funding sources       |
| **Fund hubs**        | Can't safely discover and verify legitimate local groups |
| **Everyone**         | Spends more time coordinating than moving resources      |

### The Hardest Case: Rent Relief

Any solution must handle rent relief—the most challenging category:

- Larger dollar amounts
- Time-sensitive
- Higher fraud risk
- Higher fear and stigma for recipients

A solution that works only for food or supplies but fails for rent is insufficient.

### Core Problem Statements

**1. Group-to-Hub Connection Gap**

Local mutual aid groups lack a safe, reliable, low-friction way to discover, connect to, and receive funds from centralized hubs, while hubs lack a safe way to identify and trust local groups—without collecting sensitive personal data or creating risk for undocumented or vulnerable people.

**2. Individual-to-Group Discovery Gap**

Individual residents facing housing insecurity and other urgent needs lack a safe way to connect with mutual aid groups who can help—without providing information that would put them in danger if obtained by federal authorities. Existing options require email addresses, phone numbers, or accounts that create traceable records.

---

## Goals and Objectives

### Primary Goals

1. **Enable discovery** — Groups and hubs can find each other without relying on personal introductions
2. **Enable anonymous help requests** — Individuals can request help and receive responses from groups without providing identifying information
3. **Establish trust** — Lightweight verification that doesn't require invasive documentation
4. **Accelerate funding** — Reduce time from request to funds disbursed
5. **Protect privacy** — Zero identifiable individual data; passphrase-only access; E2E encryption; subpoena-resistant design

### Success Metrics

| Metric                                                                      | Target                                    |
| --------------------------------------------------------------------------- | ----------------------------------------- |
| Groups can connect without personal introductions                           | Yes/No                                    |
| Hub reviews and routes funds with less back-and-forth                       | Qualitative feedback                      |
| Time from request to funds sent                                             | Faster than current process               |
| Participant safety perception                                               | "Feels safer than existing tools"         |
| Recipient data requests                                                     | Zero (system doesn't need it)             |
| Individuals can request help without accounts                               | Yes/No                                    |
| Individuals can receive group responses anonymously                         | Yes/No                                    |
| Community members can find groups by region/category without authentication | Yes/No                                    |
| Individual usage tracking                                                   | Zero (no analytics, no logs)              |
| Data producible if subpoenaed                                               | Only encrypted blobs Relay cannot decrypt |

### Non-Goals

- Replacing how local groups distribute aid
- Standardizing mutual aid practices
- Building donor engagement features
- Automating eligibility decisions
- Storing individual contact information (email, phone, address)
- Reading or moderating individual-to-group messages (E2E encrypted)

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

#### Individual Resident (Anonymous User)

**Role:** Person in crisis seeking help from local mutual aid groups

**Characteristics:**

- Facing housing insecurity, food insecurity, or other urgent need
- May be undocumented or otherwise vulnerable to authorities
- Cannot risk creating digital trails that could be subpoenaed
- Needs fast access to help without barriers
- May have limited internet access or shared devices

**Goals:**

- Request help without providing identifying information
- Receive responses from groups who can help
- Connect with a group directly using contact info they provide
- Do all of this without email, phone number, or account

**Frustrations:**

- Existing help systems require email or phone (creates traceable record)
- Fear of creating records that could be used against them
- Doesn't know who to trust or where to start
- Current options require knowing someone who knows someone

**Key constraint:** Individuals access Relay using only a passphrase—no email, phone, or account. Messages from groups are end-to-end encrypted; Relay cannot read them. Mailboxes auto-delete after 7 days. If subpoenaed, Relay can only produce encrypted data it cannot decrypt.

---

#### Community Member (Public Visitor)

**Role:** Person looking for a local mutual aid group through the public directory

**Characteristics:**

- Not necessarily in crisis — may be looking ahead, or heard about a group through word of mouth
- Will not create an account or provide identifying information for a simple lookup
- May be on a mobile phone with limited bandwidth
- May prefer Spanish

**Goals:**

- Find a specific group by name or discover groups serving their area
- See what kind of help each group offers
- Get contact information to reach out directly
- Do all of this without authentication, tracking, or data collection

**Frustrations:**

- Existing directories are fragmented, outdated, or require accounts
- Providing contact information just to browse feels invasive
- Hard to tell which groups are active vs. defunct

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

| Field               | Required | Notes                       |
| ------------------- | -------- | --------------------------- |
| Group name          | Yes      | May be pseudonymous         |
| Service area        | Yes      | City/region level           |
| Aid categories      | Yes      | Rent, food, utilities, etc. |
| Contact method      | Yes      | Role-based email preferred  |
| Verification status | Yes      | System-managed              |

**Explicitly excluded from collection:**

- Individual names of aid recipients
- Addresses
- Immigration status
- Case details

**Acceptance Criteria:**

- [ ] Hub admins can view registry of groups in their network
- [ ] Hub admins can filter/sort groups by verification status, aid category, and service area
- [ ] Groups can update their own profile information
- [ ] Group coordinators see a dashboard summarizing: open help requests in their area, pending funding requests, and verification status
- [ ] Full group registry (including unverified groups) is visible only to hub admins
- [ ] Verified groups are listed in the public directory (see FR-8)
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
- [ ] Attestation flow is completable on a single screen with a single action (e.g., "I can confirm this group is active in my community")
- [ ] Attestation UI includes clear language explaining what the attestation means and does not mean (not a legal endorsement)
- [ ] Attestation creates no ongoing monitoring or reporting obligation for the verifier
- [ ] Verifier's name is not publicly attached to the group in the system
- [ ] Attestation flow works on mobile with minimal input required

---

### FR-3: Funding Request Workflow

**Priority:** P0 (Must Have)

The system shall allow verified groups to submit funding requests at the group level (not individual level).

**Request fields:**

| Field            | Required | Notes                                     |
| ---------------- | -------- | ----------------------------------------- |
| Amount requested | Yes      | Numeric value                             |
| Category         | Yes      | Rent, food, utilities, other              |
| Urgency          | Yes      | Normal, Urgent                            |
| Region served    | Yes      | Pre-filled from group profile             |
| Justification    | No       | With UX guidance against personal details |

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

### FR-7: Anonymous Help Requests

**Priority:** P0 (Must Have)

The system shall allow individuals in crisis to request help and receive responses from groups—without providing any identifying information.

**User flow:**

1. Individual visits site and selects "I need help"
2. System generates a random passphrase (e.g., "blue-river-mountain-4729")
3. Individual specifies: type of help needed (rent, food, utilities), general region
4. Individual writes down passphrase—this is their only way to access responses
5. Relevant groups see the request (category + region only)
6. Groups send encrypted messages with their contact info and how they can help
7. Individual returns to site, enters passphrase, decrypts and reads messages
8. Individual contacts group directly using the info provided

**What the system stores:**

| Data               | Stored | Notes                                       |
| ------------------ | ------ | ------------------------------------------- |
| Passphrase         | No     | Used to derive encryption key client-side   |
| Mailbox ID         | Yes    | Random identifier, not linked to any person |
| Help category      | Yes    | e.g., "rent", "food"                        |
| Region             | Yes    | City/county level                           |
| Encrypted messages | Yes    | Relay cannot decrypt                        |
| Email/phone/name   | No     | Never collected                             |
| IP address         | No     | Not logged for anonymous routes             |

**Cryptographic design:**

- Passphrase generates a keypair client-side (e.g., using libsodium)
- Public key stored with mailbox; private key never leaves client
- Groups encrypt messages with mailbox's public key
- Only someone with the passphrase can derive the private key and decrypt
- Relay stores only ciphertext it cannot read

**Retention and deletion:**

- Mailboxes delete after 7 days of inactivity (no access)
- Activity (entering passphrase to check messages) resets the 7-day timer
- Individual can manually delete earlier

**Soft delete (tombstone retained for groups/hubs):**

- Record that a request existed
- Help category and region
- That a group responded (yes/no)
- Deletion type: manual or auto (inactivity)
- Created and deleted timestamps

**Hard delete (permanently removed, no recovery):**

- Encrypted messages
- Public key
- Original mailbox ID
- Any data that could identify or correlate to the individual

This allows groups to see: "You responded to a rent request in Hennepin County. Mailbox deleted (inactivity) on [date]." — without retaining any sensitive content.

**What groups see:**

- Category of help needed
- General region
- "Reply" button to send encrypted message
- Number of other groups who have replied (optional)

**What groups do NOT see:**

- Any identifying information
- Other groups' message contents
- Whether the individual has read their message

**Explicitly prohibited:**

- Email, phone, or any contact info collection from individuals
- IP address logging on anonymous routes
- Analytics or tracking of any kind
- Server-side ability to read messages
- Persistent cookies for anonymous users

**Acceptance Criteria:**

- [ ] Individual can create mailbox with only a passphrase (no email/phone)
- [ ] Passphrase is generated client-side and displayed once
- [ ] Passphrase display includes a copy-to-clipboard button and strong visual emphasis on writing it down (this is the only way to access responses)
- [ ] Individual can specify help type and region
- [ ] Region selection uses a constrained autocomplete (static dataset, no API calls) to ensure reliable group matching
- [ ] Groups can view anonymous requests matching their service area
- [ ] Groups can send encrypted replies
- [ ] Encrypted reply flow is simple — group enters contact info and a message, encryption is invisible to the user
- [ ] Individual can return from any device with passphrase and read messages
- [ ] Messages are encrypted client-side before transmission
- [ ] Server cannot decrypt stored messages
- [ ] Mailboxes delete after 7 days of inactivity
- [ ] On deletion: tombstone retained (category, region, response status, timestamps)
- [ ] On deletion: messages, keys, and mailbox ID hard deleted with no recovery
- [ ] Groups can see tombstones of deleted mailboxes they responded to
- [ ] No IP logging on anonymous routes
- [ ] No cookies set for anonymous users
- [ ] Works on slow/intermittent connections
- [ ] All anonymous flow screens are fully bilingual (English/Spanish) with language switcher accessible
- [ ] Mobile-first layout with minimum 44px tap targets and minimal text
- [ ] Shared/borrowed device warning displayed (no data persisted after session)

---

### FR-8: Public Group Directory

**Priority:** P0 (Must Have)

The system shall provide a public, searchable directory of verified mutual aid groups — browsable without authentication, accounts, or tracking.

**Directory displays (for each verified group):**

| Field               | Source        | Notes                                    |
| ------------------- | ------------- | ---------------------------------------- |
| Group name          | Group profile | May be pseudonymous                      |
| Service area        | Group profile | City/county level                        |
| Aid categories      | Group profile | Rent, food, utilities, etc.              |
| Contact method      | Group profile | Role-based email or equivalent           |
| Verification status | System        | Only verified groups appear in directory |

**Explicitly excluded from directory:**

- Groups that have not been verified
- Any individual-level data
- Usage analytics, search logs, or browsing patterns

**Search and filtering:**

- Filter by region (same constrained autocomplete dataset as help requests)
- Filter by aid category
- Text search by group name
- Results update as filters are applied

**Privacy guarantees (same as anonymous routes):**

- No authentication required to browse
- No cookies set for directory visitors
- No analytics or tracking scripts on directory pages
- No IP address logging for directory access
- No third-party scripts that could track visitors

**Acceptance Criteria:**

- [ ] Verified groups appear in the public directory automatically
- [ ] Unverified groups do not appear in the directory
- [ ] Directory is browsable without authentication, account creation, or providing any personal information
- [ ] Directory is searchable by group name
- [ ] Directory is filterable by region (using constrained autocomplete) and aid category
- [ ] Each listing shows group name, service area, aid categories, and contact method
- [ ] No cookies, analytics, tracking, or IP logging on directory pages
- [ ] Directory is fully bilingual (English/Spanish)
- [ ] Directory is mobile-responsive with 44px minimum tap targets
- [ ] Directory loads fast on low-bandwidth connections (static or pre-rendered where possible)
- [ ] Directory is visually distinct from the anonymous help request flow — these are different paths for different needs
- [ ] Groups can control what contact information appears in their public listing

---

## Non-Functional Requirements

### NFR-1: Security

**Priority:** P0 (Must Have)

| Requirement              | Specification                                                                    |
| ------------------------ | -------------------------------------------------------------------------------- |
| Data encryption          | TLS 1.3 in transit; AES-256 at rest                                              |
| E2E encryption           | Client-side encryption for anonymous mailbox messages (libsodium or similar)     |
| Input validation         | All user inputs validated and sanitized                                          |
| SQL injection prevention | Parameterized queries only                                                       |
| XSS prevention           | Output encoding on all rendered content                                          |
| Authentication           | Secure token-based, short-lived sessions (for groups/hubs only)                  |
| Authorization            | Role-based access control enforced server-side                                   |
| Audit logging            | Data access logged for authenticated routes only; no logging on anonymous routes |
| Key management           | Private keys never transmitted to or stored on server                            |

---

### NFR-1a: Infrastructure Security (AWS)

**Priority:** P0 (Must Have)

#### IAM (Identity and Access Management)

| Requirement        | Specification                                                              |
| ------------------ | -------------------------------------------------------------------------- |
| Least privilege    | All IAM roles grant minimum permissions required for function              |
| No root access     | AWS root account not used for operations; MFA required                     |
| Service roles      | Fargate tasks use dedicated IAM roles, not shared credentials              |
| No long-lived keys | No IAM access keys in code or config; use IAM roles for service-to-service |
| Role boundaries    | Permission boundaries on all IAM roles to prevent privilege escalation     |

#### Network Security

| Requirement         | Specification                                                        |
| ------------------- | -------------------------------------------------------------------- |
| VPC isolation       | All resources deployed in private VPC                                |
| Private subnets     | RDS and Fargate tasks in private subnets (no direct internet access) |
| Public subnets      | Only load balancer in public subnets                                 |
| Security groups     | Principle of least privilege; only required ports open               |
| RDS access          | Database accessible only from Fargate security group                 |
| No public endpoints | RDS not publicly accessible; no public IPs on Fargate tasks          |
| NAT gateway         | Outbound internet access (for email sending) via NAT gateway only    |

#### Secrets Management

| Requirement          | Specification                                               |
| -------------------- | ----------------------------------------------------------- |
| No hardcoded secrets | No secrets in code, environment variables, or config files  |
| AWS Secrets Manager  | Database credentials, API keys stored in Secrets Manager    |
| Rotation             | Database credentials rotated automatically (90-day minimum) |
| Access logging       | All secret access logged via CloudTrail                     |
| Fargate integration  | Secrets injected at runtime via Secrets Manager integration |

#### Encryption

| Requirement        | Specification                                                 |
| ------------------ | ------------------------------------------------------------- |
| RDS encryption     | Encryption at rest enabled using AWS KMS                      |
| KMS key management | Customer-managed KMS keys (not AWS-managed) for audit control |
| EBS encryption     | Any EBS volumes encrypted with KMS                            |
| S3 encryption      | If S3 used, server-side encryption with KMS required          |
| TLS termination    | TLS 1.3 at load balancer; internal traffic encrypted          |

#### Audit and Monitoring

| Requirement       | Specification                                                              |
| ----------------- | -------------------------------------------------------------------------- |
| CloudTrail        | Enabled for all AWS API calls; logs stored in S3 with integrity validation |
| CloudWatch Logs   | Application logs sent to CloudWatch (no PII in logs)                       |
| CloudWatch Alarms | Alerts for security events (failed auth, unusual API calls)                |
| Log retention     | CloudTrail logs retained minimum 1 year                                    |
| VPC Flow Logs     | Enabled for network traffic analysis (anonymized for individual routes)    |

#### Container Security

| Requirement              | Specification                                                 |
| ------------------------ | ------------------------------------------------------------- |
| ECR scanning             | Vulnerability scanning enabled on container images            |
| No privileged containers | Fargate tasks run as non-root user                            |
| Image immutability       | Container images tagged immutably; no `:latest` in production |
| Base image updates       | Base images updated regularly for security patches            |

#### Additional Protections

| Requirement       | Specification                                                           |
| ----------------- | ----------------------------------------------------------------------- |
| WAF               | AWS WAF on ALB with rules for common attacks (SQLi, XSS, rate limiting) |
| DDoS protection   | AWS Shield Standard (included); evaluate Shield Advanced for pilot      |
| Backup encryption | RDS automated backups encrypted; retention per data policy              |
| Multi-AZ          | RDS Multi-AZ for availability (evaluate for pilot scope)                |

---

### NFR-2: Privacy

**Priority:** P0 (Must Have)

| Requirement                 | Specification                                                                  |
| --------------------------- | ------------------------------------------------------------------------------ |
| Data minimization           | Collect only what's explicitly needed; no email/phone from individuals         |
| E2E encryption              | Individual-to-group messages encrypted client-side; server cannot read         |
| Passphrase-only access      | Individuals access mailboxes with passphrase only; no account                  |
| Retention limits            | Anonymous mailboxes auto-delete after 7 days of inactivity                     |
| No IP logging               | Anonymous routes do not log IP addresses                                       |
| No tracking                 | No analytics, cookies, or tracking for anonymous users                         |
| Subpoena-resistant          | If legally compelled, Relay can only produce encrypted blobs it cannot decrypt |
| No third-party data sharing | Data never shared outside pilot participants                                   |
| No third-party scripts      | No external analytics, fonts, or CDNs that could track users                   |

---

### NFR-3: Accessibility

**Priority:** P0 (Must Have)

| Requirement                | Specification                              |
| -------------------------- | ------------------------------------------ |
| Mobile responsive          | Fully functional on mobile browsers        |
| Touch targets              | Minimum 44x44px touch targets              |
| No hover dependencies      | All interactions work without hover        |
| No keyboard-only shortcuts | All features accessible via touch          |
| Low bandwidth              | Functions on slow/intermittent connections |
| Screen reader compatible   | WCAG 2.1 AA compliance                     |

---

### NFR-4: Availability

**Priority:** P1 (Should Have)

| Requirement         | Specification                                    |
| ------------------- | ------------------------------------------------ |
| Uptime target       | 99% during pilot                                 |
| Planned maintenance | Communicated 24 hours in advance                 |
| Error handling      | Graceful degradation with user-friendly messages |

---

### NFR-5: Performance

**Priority:** P1 (Should Have)

| Requirement         | Specification                |
| ------------------- | ---------------------------- |
| Page load time      | < 3 seconds on 3G connection |
| Time to interactive | < 5 seconds on 3G connection |
| API response time   | < 500ms for 95th percentile  |

---

### NFR-6: Internationalization (i18n)

**Priority:** P0 (Must Have)

| Requirement          | Specification                                               |
| -------------------- | ----------------------------------------------------------- |
| Supported languages  | English (en), Spanish (es)                                  |
| Language detection   | Browser language preference, user-selectable                |
| Language persistence | Stored in localStorage                                      |
| Translation coverage | All UI text, form labels, error messages, status indicators |
| RTL support          | Not required (neither English nor Spanish is RTL)           |

**Implementation:**

- Frontend: react-i18next with JSON translation files
- Namespace separation by feature (common, groups, requests, auth)
- Language switcher accessible from all pages
- Fallback to English for missing translations

**Rationale:** Many mutual aid communities serve Spanish-speaking populations. Language access is essential for equitable participation.

---

## Constraints

### Technical Constraints

- **Web-only:** Single-page web application; no native mobile apps
- **No push notifications:** Privacy concern; surfaces sensitive context
- **Email-based access:** Links shared via email or secure messaging
- **No app store presence:** Avoids account/identity requirements

### Operational Constraints

- **Invite-only registration, public directory:** Group registration is invite-only and all participating groups are vetted; once verified, groups are listed in a public directory for community discovery
- **Anonymous for individuals:** Passphrase-only access; no registration, email, or phone required
- **Pilot scope:** 1 hub, 3-5 groups, 30-45 days
- **Veto power:** Any participant can pause or end pilot
- **No expansion by default:** Post-pilot decisions made collaboratively

### Data Constraints

- **No individual PII:** No email, phone, name, or address collected from individuals
- **E2E encryption:** Individual-to-group messages encrypted; server cannot read
- **Passphrase-only:** Individuals access mailboxes with passphrase; nothing links to identity
- **Auto-deletion:** Anonymous mailboxes purged after 7 days of inactivity
- **No IP logging:** Anonymous routes do not log IP addresses
- **Group-level funding:** No individual case tracking for fund requests
- **Short retention:** Group funding request details not retained indefinitely
- **Aggregate reporting only:** No per-person or per-household reports

---

## Out of Scope

The following are explicitly excluded from this product:

| Feature                                    | Reason                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| Individual accounts/registration           | Privacy risk; passphrase-only access                                    |
| Collection of email/phone from individuals | Privacy risk; creates traceable records                                 |
| Server-readable messages                   | Privacy risk; all individual messages E2E encrypted                     |
| Case management                            | Scope creep; different product                                          |
| Long-term storage of individual requests   | Privacy risk; mailboxes auto-delete after 7 days                        |
| Document uploads                           | Privacy risk; not needed for workflow                                   |
| Donor-facing dashboards                    | Different audience; scope creep                                         |
| Real-time chat                             | Scope creep; async encrypted mailbox approach instead                   |
| Eligibility automation                     | Removes human judgment; scope creep                                     |
| Native mobile apps                         | Pilot scope; reassess post-pilot                                        |
| Push notifications                         | Privacy risk; individuals must return to check messages                 |
| Analytics on individual usage              | Privacy risk; cannot track who views what                               |
| Passphrase recovery                        | By design; Relay cannot recover access (would require storing identity) |

If any out-of-scope feature becomes necessary, the pilot pauses for reevaluation.

---

## Risks and Mitigations

| Risk                                           | Likelihood | Impact   | Mitigation                                                               |
| ---------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------ |
| Groups enter recipient PII in free-text fields | Medium     | High     | UX guidance; field labels; no "name" or "address" fields                 |
| Verification process too slow                  | Medium     | Medium   | Multiple verification paths; hub admin can fast-track                    |
| Low adoption during pilot                      | Medium     | Medium   | Direct outreach; personal onboarding support                             |
| Data breach                                    | Low        | High     | E2E encryption means breached data is unreadable; minimal retention      |
| Legal subpoena for records                     | Low        | High     | E2E encryption; Relay can only produce encrypted blobs it cannot decrypt |
| Individual loses passphrase                    | High       | Medium   | Clear UX warning; encourage writing it down; no recovery by design       |
| Cryptographic implementation flaws             | Low        | Critical | Use proven libraries (libsodium); security audit; no custom crypto       |
| Hub or group withdraws mid-pilot               | Medium     | Low      | Graceful offboarding; data export; no lock-in                            |
| Scope creep requests                           | High       | Medium   | Clear PRD; out-of-scope list; pause-and-evaluate policy                  |
| Third-party tracking                           | Medium     | Critical | No analytics scripts; no third-party resources; CSP headers              |
| Accidental logging of individual activity      | Medium     | High     | Code review; no logging on anonymous routes; audit log configuration     |
| Groups abuse anonymous requests (spam)         | Low        | Medium   | Rate limiting by mailbox; groups can ignore; report mechanism            |
| Individuals don't return to check messages     | Medium     | Medium   | Clear UX explaining async nature; encourage checking back                |

---

## Technical Architecture (High-Level)

### Technology Stack

| Layer          | Technology                     | Rationale                                                         |
| -------------- | ------------------------------ | ----------------------------------------------------------------- |
| Frontend       | React + Vite + TypeScript      | Fast builds; SPA architecture; type safety                        |
| Styling        | Tailwind CSS                   | Mobile-first; utility classes; rapid UI development               |
| Backend        | Node.js + Express + TypeScript | Unified language; mature ecosystem; type safety                   |
| Database       | PostgreSQL (AWS RDS)           | ACID compliance; data integrity; managed service                  |
| Compute        | AWS Fargate                    | Containerized; serverless scaling; no server management           |
| Infrastructure | Terraform                      | Infrastructure as code; reproducible; version controlled          |
| CI/CD          | GitHub Actions                 | Integrated with repo; automated testing and deployment            |
| Containers     | Docker                         | Consistent environments; portable deployments                     |
| Authentication | Magic link / passwordless      | No password storage; works on shared devices                      |
| E2E Encryption | libsodium (TweetNaCl.js)       | Proven cryptography; client-side key generation; no custom crypto |

### Repository Structure

Monorepo with the following structure:

```
/frontend    # React + Vite application
/backend     # Express API server
/infra       # Terraform configurations
```

### Key Architectural Decisions

1. **No individual PII in schema** — Cannot be collected even accidentally; no email/phone fields for individuals
2. **E2E encryption for individual messages** — Server stores only ciphertext it cannot decrypt
3. **Passphrase-derived keys** — Private keys generated client-side from passphrase; never transmitted
4. **Role-based access control** — Enforced at API level, not just UI (for groups/hubs)
5. **Audit logging for authenticated routes only** — No logging on anonymous routes
6. **Tombstone + hard delete for individual data** — After 7 days of inactivity: soft delete retains category/region/timestamps for group visibility; hard delete permanently removes messages, keys, and mailbox ID
7. **Soft delete for group/hub data** — Group profiles, funding requests, verification records use soft delete with `deleted_at` timestamp; no auto-deletion, manual only
8. **Stateless sessions** — No persistent login; works on shared devices
9. **No third-party scripts** — Self-hosted fonts; no external analytics or CDNs

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

### Phase 3: Anonymous Help Requests & Public Directory (Pre-Pilot)

- [ ] Implement client-side encryption (libsodium/TweetNaCl.js)
- [ ] Build anonymous mailbox creation with passphrase generation
- [ ] Build encrypted message sending for groups
- [ ] Build message decryption for individuals
- [ ] Implement auto-deletion after 7 days
- [ ] Verify no IP logging on anonymous routes
- [ ] Security audit of cryptographic implementation
- [ ] Build public group directory with search/filter (FR-8)
- [ ] Verify no tracking/cookies/analytics on directory and anonymous routes

### Phase 4: Pilot Launch

- [ ] Onboard 1 hub administrator
- [ ] Onboard 3-5 local groups
- [ ] Monitor and support for 30-45 days
- [ ] Collect qualitative feedback

### Phase 5: Evaluation

- [ ] Assess success criteria
- [ ] Document learnings
- [ ] Collaborative decision on next steps
- [ ] No expansion without explicit agreement

---

## Appendix

### Glossary

| Term               | Definition                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **Hub**            | Central organization that raises and pools funds for distribution                                                      |
| **Local Group**    | Informal or semi-formal mutual aid group that distributes aid directly                                                 |
| **Verification**   | Process of establishing a group as "trusted enough" to receive funds                                                   |
| **Attestation**    | Vouching for a group's legitimacy by peers or sponsors                                                                 |
| **Recipient**      | Individual receiving aid from a local group (never tracked in Relay)                                                   |
| **Mailbox**        | Anonymous, encrypted inbox for an individual; accessed only via passphrase                                             |
| **Passphrase**     | Random words (e.g., "blue-river-mountain-4729") used to access a mailbox; not stored by Relay                          |
| **E2E Encryption** | End-to-end encryption; messages encrypted on sender's device, decrypted only on recipient's device; server cannot read |

### Related Documents

- [Problem Brief](/docs/problem_brief.md)
- [Pilot Proposal](/docs/pilot_proposal.md)
- [User Personas](/docs/user_personas.md)
- [Platform Decision](/docs/decision_mobile_app_vs_web_app.md)
- [Naming Decision](/docs/naming_and_domain_decision.md)

### Document History

| Version | Date          | Author | Changes                                                                                                        |
| ------- | ------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| 1.0     | February 2026 | —      | Initial PRD                                                                                                    |
| 1.1     | February 2026 | —      | Added FR-7 Anonymous Help Requests with E2E encryption                                                         |
| 1.2     | February 2026 | —      | Added Community Member persona, FR-8 Public Group Directory, strengthened acceptance criteria for all personas |
