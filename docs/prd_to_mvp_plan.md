# PRD to MVP Implementation Plan

This document outlines the implementation plan to deliver Relay's MVP as defined in the [Product Requirements Document](product_requirements_document.md).

## Overview

**Goal:** Deliver a working pilot-ready application for 1 hub and 3-5 mutual aid groups over a 30-45 day pilot.

**Approach:** Vertical slices—deliver complete, usable features end-to-end rather than building all backend then all frontend.

**Key Principle:** Security and privacy are not afterthoughts. Infrastructure security, E2E encryption architecture, and privacy controls are built from the foundation up.

---

## Phase 0: Project Setup

**Objective:** Development environment, tooling, and CI pipeline ready.

### 0.1 Monorepo Structure

- [ ] Verify workspace configuration (frontend, backend, infra)
- [ ] Shared TypeScript configuration
- [ ] Shared ESLint and Prettier configuration
- [ ] Husky pre-commit hooks (lint, typecheck)

### 0.2 Development Environment

- [ ] Docker Compose for local PostgreSQL
- [ ] Environment variable management (.env.example, validation)
- [ ] Local development scripts (npm run dev, etc.)
- [ ] Hot reload for frontend and backend

### 0.3 Testing Infrastructure

- [ ] Jest/Vitest configuration for backend
- [ ] React Testing Library for frontend
- [ ] Test database configuration
- [ ] Coverage thresholds defined

### 0.4 CI Pipeline (GitHub Actions)

- [ ] Lint and typecheck on PR
- [ ] Run tests on PR
- [ ] Build verification
- [ ] Security scanning (dependency audit)
- [ ] OIDC configuration for AWS deployment (no long-lived credentials)

**Checkpoint:** `npm run dev` starts full stack locally; CI runs on PR.

---

## Phase 1: AWS Infrastructure Foundation

**Objective:** Secure, production-ready AWS infrastructure with all security controls in place.

### 1.1 Network Foundation (Terraform)

- [ ] VPC with DNS hostnames enabled
- [ ] Public subnets (2 AZs) for ALB only
- [ ] Private subnets (2 AZs) for Fargate and RDS
- [ ] NAT Gateway for outbound internet access
- [ ] Internet Gateway for public subnets
- [ ] Route tables configured correctly

### 1.2 Security Groups

- [ ] ALB security group: inbound 443 from 0.0.0.0/0 only
- [ ] Fargate security group: inbound from ALB security group only
- [ ] RDS security group: inbound 5432 from Fargate security group only
- [ ] **Verify:** No overly permissive rules (no 0.0.0.0/0 except ALB 443)

### 1.3 Database (RDS PostgreSQL)

- [ ] RDS instance in private subnets
- [ ] Multi-AZ disabled for pilot (cost); document for production
- [ ] Encryption at rest with customer-managed KMS key
- [ ] Automated backups enabled (7-day retention)
- [ ] **Verify:** Not publicly accessible
- [ ] **Verify:** Security group restricts access to Fargate only

### 1.4 Secrets Management

- [ ] AWS Secrets Manager secret for database credentials
- [ ] Secrets Manager secret for email service API key
- [ ] Automatic rotation configured (90-day)
- [ ] **Verify:** No credentials in code, config, or environment files

### 1.5 IAM Roles

- [ ] Fargate task execution role (ECR pull, CloudWatch Logs, Secrets Manager read)
- [ ] Fargate task role (application permissions only)
- [ ] CI/CD deployment role (minimal permissions for deploy)
- [ ] Permission boundaries on all roles
- [ ] **Verify:** Least privilege—no `*` resources or actions

### 1.6 Container Infrastructure

- [ ] ECR repository with vulnerability scanning enabled
- [ ] Image immutability enforced (no tag overwrites)
- [ ] Fargate cluster in private subnets
- [ ] Task definition with secrets from Secrets Manager
- [ ] **Verify:** Container runs as non-root user

### 1.7 Load Balancer & WAF

- [ ] Application Load Balancer in public subnets
- [ ] HTTPS listener with ACM certificate
- [ ] HTTP → HTTPS redirect
- [ ] AWS WAF attached with managed rule groups:
  - AWS Managed Rules Common Rule Set
  - SQL injection rules
  - Rate limiting rule
- [ ] Health check endpoint configured

### 1.8 Monitoring & Audit

- [ ] CloudTrail enabled for all API calls
- [ ] CloudTrail logs to S3 with integrity validation
- [ ] CloudWatch Log Groups for application logs
- [ ] CloudWatch Alarms:
  - 5xx error rate > threshold
  - Response latency p95 > 500ms
  - Failed authentication attempts
- [ ] VPC Flow Logs enabled
- [ ] Log retention policies (1 year for CloudTrail)

### 1.9 DNS & SSL

- [ ] Route 53 hosted zone (or external DNS)
- [ ] ACM certificate for relayfunds.org
- [ ] Certificate attached to ALB

**Checkpoint:** Infrastructure deployed; Fargate can connect to RDS; no public database access; WAF active.

---

## Phase 2: Database Schema & API Foundation

**Objective:** Complete database schema and API structure with security built-in.

### 2.1 Database Schema

Design and implement all tables upfront to ensure data integrity:

```
users
├── id (UUID)
├── email (unique)
├── role (enum: hub_admin, group_coordinator)
├── group_id (FK, nullable)
├── hub_id (FK, nullable)
├── created_at
├── updated_at
└── deleted_at

hubs
├── id (UUID)
├── name
├── created_at
├── updated_at
└── deleted_at

groups
├── id (UUID)
├── hub_id (FK)
├── name
├── service_area
├── aid_categories (array)
├── contact_email
├── verification_status (enum: pending, verified, revoked)
├── created_at
├── updated_at
└── deleted_at

verification_requests
├── id (UUID)
├── group_id (FK)
├── method (enum: hub_approval, peer_attestation, sponsor_reference)
├── status (enum: pending, approved, denied)
├── attestor_group_ids (array, for peer attestation)
├── sponsor_info (text, for sponsor reference)
├── reviewed_by (FK to users)
├── reviewed_at
├── denial_reason
├── created_at
└── updated_at

funding_requests
├── id (UUID)
├── group_id (FK)
├── amount (decimal)
├── category (enum: rent, food, utilities, other)
├── urgency (enum: normal, urgent)
├── region
├── justification (text, optional)
├── status (enum: submitted, approved, declined, funds_sent, acknowledged)
├── decline_reason (text, optional)
├── clarification_request (text, optional)
├── approved_by (FK to users)
├── approved_at
├── funds_sent_at
├── acknowledged_at
├── created_at
├── updated_at
└── deleted_at

funding_request_status_history
├── id (UUID)
├── funding_request_id (FK)
├── status
├── changed_by (FK to users)
├── changed_at
└── notes

mailboxes
├── id (UUID, random - NOT sequential)
├── public_key (bytea)
├── help_category (enum: rent, food, utilities, other)
├── region
├── created_at
├── last_accessed_at
├── deleted_at
└── deletion_type (enum: manual, auto_inactivity, null)

mailbox_messages
├── id (UUID)
├── mailbox_id (FK)
├── group_id (FK)
├── ciphertext (bytea)
├── created_at

mailbox_tombstones
├── id (UUID)
├── original_mailbox_id (UUID, not FK - original is deleted)
├── help_category
├── region
├── had_responses (boolean)
├── responding_group_ids (array)
├── deletion_type (enum: manual, auto_inactivity)
├── created_at
├── deleted_at

audit_log (authenticated routes only)
├── id (UUID)
├── user_id (FK)
├── action
├── resource_type
├── resource_id
├── metadata (jsonb)
├── ip_address
├── created_at
```

- [ ] Create migration files
- [ ] Add foreign key constraints
- [ ] Add check constraints (e.g., amount > 0)
- [ ] Add indexes for common queries
- [ ] **Verify:** No PII fields for individuals (no name, address, phone, email in mailbox tables)

### 2.2 API Structure

- [ ] Express app with TypeScript
- [ ] Route structure:
  ```
  /api/auth/*           (authentication)
  /api/groups/*         (group management)
  /api/verification/*   (verification workflow)
  /api/requests/*       (funding requests)
  /api/reports/*        (aggregate reporting)
  /api/mailbox/*        (anonymous - NO AUTH)
  /api/help-requests/*  (group-facing anonymous requests)
  /health               (health check)
  ```
- [ ] Error handling middleware (no stack traces in production)
- [ ] Request ID middleware for tracing

### 2.3 Input Validation

- [ ] Zod schemas for all request bodies
- [ ] Validation middleware
- [ ] Sanitization of text inputs
- [ ] **Verify:** Parameterized queries only (no string concatenation)

### 2.4 Audit Logging

- [ ] Audit log middleware for authenticated routes
- [ ] Log: user, action, resource, timestamp
- [ ] **Critical:** No audit logging on `/api/mailbox/*` routes
- [ ] **Critical:** No IP logging on anonymous routes

### 2.5 Security Middleware

- [ ] Helmet.js for security headers
- [ ] CORS configuration (strict origins)
- [ ] Content Security Policy (no external scripts/fonts)
- [ ] Rate limiting (authenticated routes)
- [ ] **Critical:** Anonymous rate limiting must not store user identifiers

**Checkpoint:** Database migrations run; API structure in place; audit logging works for authenticated routes only.

---

## Phase 3: Internationalization (i18n)

**Objective:** i18n infrastructure in place before building UI, so all features are translatable from the start.

### 3.1 Configuration

- [ ] Install and configure react-i18next
- [ ] Language detection (browser preference)
- [ ] Fallback to English
- [ ] localStorage persistence

### 3.2 Translation Structure

```
frontend/src/locales/
├── en/
│   ├── common.json      (shared: buttons, labels, errors)
│   ├── auth.json        (login, logout)
│   ├── groups.json      (group registry)
│   ├── verification.json
│   ├── requests.json    (funding requests)
│   ├── reports.json
│   └── help.json        (anonymous help requests)
└── es/
    └── (same structure)
```

- [ ] Create translation file structure
- [ ] Add common translations (English)
- [ ] Add common translations (Spanish)

### 3.3 UI Components

- [ ] Language switcher component
- [ ] Language switcher in header/nav
- [ ] **Verify:** Switcher accessible from all pages

**Checkpoint:** Language can be switched; translations load correctly.

---

## Phase 4: Authentication (FR-6)

**Objective:** Secure, passwordless authentication for hub admins and group coordinators.

### 4.1 Magic Link Backend

- [ ] `POST /api/auth/request-link` — send magic link email
- [ ] `POST /api/auth/verify` — verify token, create session
- [ ] `POST /api/auth/logout` — destroy session
- [ ] `GET /api/auth/me` — get current user
- [ ] Token generation (cryptographically secure, 32+ bytes)
- [ ] Token expiration (15 minutes)
- [ ] Single-use tokens (invalidate after use)

### 4.2 Session Management

- [ ] JWT or secure session cookies
- [ ] Session expiration (30 minutes inactivity)
- [ ] No "remember me" option
- [ ] Session invalidation on logout
- [ ] **Verify:** Sessions work on shared devices (no persistent state)

### 4.3 Email Service

- [ ] Email service integration (AWS SES or SendGrid)
- [ ] Magic link email template
- [ ] Rate limiting on email requests (prevent abuse)
- [ ] **Verify:** API key in Secrets Manager, not code

### 4.4 Authorization Middleware

- [ ] `requireAuth` middleware
- [ ] `requireRole('hub_admin')` middleware
- [ ] `requireRole('group_coordinator')` middleware
- [ ] `requireGroupMember(groupId)` middleware
- [ ] **Verify:** Authorization enforced at API level, not just UI

### 4.5 Frontend

- [ ] Login page (email input)
- [ ] "Check your email" confirmation page
- [ ] Magic link landing page (token verification)
- [ ] Logout button
- [ ] Auth context/provider
- [ ] Protected route wrapper
- [ ] Redirect unauthenticated users to login

### 4.6 Acceptance Criteria (FR-6)

- [ ] Users receive login link via email
- [ ] Links expire after 15 minutes
- [ ] Users can log out explicitly
- [ ] Sessions timeout after 30 minutes inactivity
- [ ] No "remember me" or persistent sessions

**Checkpoint:** Can log in via magic link; session expires correctly; logout works.

---

## Phase 5: Group Registry (FR-1)

**Objective:** Hub admins can view groups; groups can manage their profiles.

### 5.1 Backend

- [ ] `POST /api/groups` — register new group (invite flow)
- [ ] `GET /api/groups` — list groups (hub admin only)
- [ ] `GET /api/groups/:id` — get group details
- [ ] `PATCH /api/groups/:id` — update group (own group only)
- [ ] `DELETE /api/groups/:id` — soft delete (hub admin only)
- [ ] Input validation with Zod
- [ ] **Verify:** Groups can only edit their own profile

### 5.2 Frontend - Hub Admin

- [ ] Groups list page (table/cards)
- [ ] Group detail view
- [ ] Filter by verification status
- [ ] Filter by service area
- [ ] Filter by aid category

### 5.3 Frontend - Group Coordinator

- [ ] Group profile view
- [ ] Group profile edit form
- [ ] Aid categories multi-select
- [ ] Service area input

### 5.4 Acceptance Criteria (FR-1)

- [ ] Hub admins can view registry of groups in their network
- [ ] Groups can update their own profile information
- [ ] Registry is not publicly accessible
- [ ] No recipient-level data fields exist in the schema

**Checkpoint:** Hub admin can view groups; group can edit own profile.

---

## Phase 6: Verification System (FR-2)

**Objective:** Lightweight verification to establish group trust.

### 6.1 Backend

- [ ] `POST /api/groups/:id/verification` — request verification
- [ ] `GET /api/verification-requests` — list pending (hub admin)
- [ ] `POST /api/verification-requests/:id/approve` — approve (hub admin)
- [ ] `POST /api/verification-requests/:id/deny` — deny with reason (hub admin)
- [ ] `POST /api/verification-requests/:id/attest` — peer attestation
- [ ] Verification method handling:
  - Hub admin direct approval
  - Peer attestation (requires 2 verified groups)
  - Sponsor reference
- [ ] Status transitions and validation
- [ ] **Verify:** Only verified groups can vouch for others

### 6.2 Frontend - Group Coordinator

- [ ] Request verification page
- [ ] Method selection (hub approval, peer, sponsor)
- [ ] Peer attestation: select groups to request vouching
- [ ] Sponsor reference: input sponsor details
- [ ] Verification status display on profile

### 6.3 Frontend - Hub Admin

- [ ] Verification queue (pending requests)
- [ ] Request detail view
- [ ] Approve/Deny actions
- [ ] Denial reason input
- [ ] Revoke verification action

### 6.4 Frontend - Peer Attestation Flow

- [ ] Notification/list of attestation requests
- [ ] Review requesting group info
- [ ] Approve/Deny attestation
- [ ] **Verify:** Requires 2 verified groups to complete

### 6.5 Acceptance Criteria (FR-2)

- [ ] Groups can request verification through any supported method
- [ ] Hub admins can approve/deny verification requests
- [ ] Peer attestation requires minimum of 2 existing verified groups
- [ ] Verification status is visible to hub admins
- [ ] Verification can be revoked by hub admin

**Checkpoint:** All three verification methods work end-to-end.

---

## Phase 7: Funding Requests & Payout Tracking (FR-3, FR-4)

**Objective:** Groups submit requests; hubs review and track payouts.

### 7.1 Backend - Funding Requests

- [ ] `POST /api/requests` — submit request (verified groups only)
- [ ] `GET /api/requests` — list requests (filtered by role)
- [ ] `GET /api/requests/:id` — request detail
- [ ] `POST /api/requests/:id/approve` — approve (hub admin)
- [ ] `POST /api/requests/:id/decline` — decline with reason (hub admin)
- [ ] `POST /api/requests/:id/clarify` — request clarification (hub admin)
- [ ] **Verify:** Only verified groups can submit

### 7.2 Backend - Payout Status

- [ ] `POST /api/requests/:id/mark-sent` — mark funds sent (hub admin)
- [ ] `POST /api/requests/:id/acknowledge` — acknowledge receipt (group)
- [ ] Status history tracking
- [ ] Timestamp for each status change
- [ ] **Verify:** Status transitions are valid (no skipping states)

### 7.3 Frontend - Group Coordinator

- [ ] New request form
  - Amount input (numeric)
  - Category dropdown
  - Urgency toggle
  - Region (pre-filled from profile)
  - Justification textarea with privacy guidance tooltip
- [ ] Request history list
- [ ] Request detail view with status timeline
- [ ] "Acknowledge Receipt" button (when funds_sent)

### 7.4 Frontend - Hub Admin

- [ ] Request queue (filterable, sortable)
- [ ] Filter by: category, urgency, region, status
- [ ] Sort by: date, urgency, amount
- [ ] Request detail view
- [ ] Approve/Decline/Clarify actions
- [ ] "Mark Funds Sent" button
- [ ] Decline reason input

### 7.5 Acceptance Criteria (FR-3)

- [ ] Only verified groups can submit requests
- [ ] Justification field displays guidance discouraging personal details
- [ ] Hub admins can filter/sort requests by category, urgency, region
- [ ] Request history is maintained for the group
- [ ] Declined requests include optional reason visible to group

### 7.6 Acceptance Criteria (FR-4)

- [ ] Status updates are timestamped
- [ ] Groups can view status of their requests
- [ ] Hub admins can update status
- [ ] Groups can mark "Acknowledged" when funds received
- [ ] Status history is preserved

**Checkpoint:** Full request lifecycle works: submit → approve → funds sent → acknowledged.

---

## Phase 8: Anonymous Help Requests (FR-7)

**Objective:** Individuals can request help and receive encrypted responses without any identifying information.

### 8.1 Cryptographic Foundation

- [ ] Integrate TweetNaCl.js (libsodium) in frontend
- [ ] Passphrase generation (e.g., 4 random words + 4 digits)
- [ ] Deterministic keypair derivation from passphrase
- [ ] **Verify:** Same passphrase always produces same keypair
- [ ] **Verify:** Private key never leaves client
- [ ] **Verify:** No custom cryptography—use library primitives only

### 8.2 Backend - Mailbox

- [ ] `POST /api/mailbox` — create mailbox (public key, category, region)
  - **No authentication required**
  - **No IP logging**
  - **No cookies**
- [ ] `GET /api/mailbox/:id` — get mailbox + encrypted messages
  - Updates `last_accessed_at`
  - **No authentication required**
  - **No IP logging**
- [ ] `DELETE /api/mailbox/:id` — manual deletion
  - Creates tombstone
  - Hard deletes messages, keys, mailbox
  - **No authentication required**
- [ ] Mailbox ID is random UUID (not sequential)

### 8.3 Backend - Anonymous Route Security

- [ ] **Critical:** Disable all logging middleware on `/api/mailbox/*`
- [ ] **Critical:** No IP address in request context
- [ ] **Critical:** No cookies set on response
- [ ] **Critical:** No session/auth checks
- [ ] Rate limiting without user identifiers (by IP hash with short TTL, or proof-of-work)

### 8.4 Backend - Group-Facing Help Requests

- [ ] `GET /api/help-requests` — list open mailboxes (groups only)
  - Filter by region matching group's service area
  - Filter by category
  - Returns: mailbox ID, category, region, created_at
  - **Does NOT return:** public key (fetched separately)
- [ ] `GET /api/help-requests/:mailboxId/public-key` — get public key for encryption
- [ ] `POST /api/help-requests/:mailboxId/reply` — send encrypted message
  - Requires group authentication
  - Stores ciphertext only

### 8.5 Backend - Auto-Deletion Job

- [ ] Scheduled job (daily) to find inactive mailboxes
- [ ] Inactive = `last_accessed_at` > 7 days ago
- [ ] For each inactive mailbox:
  1. Create tombstone record
  2. Hard delete messages
  3. Hard delete mailbox (including public key)
- [ ] **Verify:** Tombstone contains only: category, region, had_responses, responding_group_ids, timestamps
- [ ] **Verify:** No recovery possible for deleted data

### 8.6 Frontend - Individual Flow

- [ ] "I need help" landing page
- [ ] Passphrase generation (client-side)
- [ ] Passphrase display with "write this down" warning
- [ ] Copy passphrase button
- [ ] Help category selector
- [ ] Region input (city/county)
- [ ] Submit: derive keypair, send public key + metadata to API
- [ ] Confirmation page with passphrase reminder
- [ ] "Check for messages" page
- [ ] Passphrase input
- [ ] Derive private key, fetch encrypted messages
- [ ] Decrypt messages client-side
- [ ] Display messages (group name, decrypted content)
- [ ] "Delete my mailbox" button
- [ ] 7-day inactivity warning in UI
- [ ] **Verify:** Works on slow/intermittent connections
- [ ] **Verify:** No cookies, no localStorage (except language preference)

### 8.7 Frontend - Group Flow

- [ ] Help requests queue (matching service area)
- [ ] Request cards: category, region, time posted
- [ ] Filter by category
- [ ] Reply form with message textarea
- [ ] Client-side encryption before send
- [ ] Confirmation of sent reply
- [ ] Tombstone view: "You responded to [category] request in [region]. Deleted on [date]."

### 8.8 Privacy Verification

- [ ] **Audit:** No cookies set for anonymous users
- [ ] **Audit:** No server logs of mailbox API calls
- [ ] **Audit:** No IP addresses logged anywhere for anonymous routes
- [ ] **Audit:** Server cannot decrypt stored messages (test with manual inspection)
- [ ] **Audit:** Passphrase never transmitted to server
- [ ] **Audit:** Private key never transmitted to server
- [ ] **Audit:** Content Security Policy blocks external scripts
- [ ] **Audit:** No third-party resources loaded (fonts, CDNs)
- [ ] **Test:** Full flow works end-to-end
- [ ] **Test:** Messages only decryptable with correct passphrase
- [ ] **Test:** Wrong passphrase fails gracefully
- [ ] **Test:** Auto-deletion works after 7 days
- [ ] **Test:** Tombstones retained, messages gone

### 8.9 Acceptance Criteria (FR-7)

- [ ] Individual can create mailbox with only a passphrase (no email/phone)
- [ ] Passphrase is generated client-side and displayed once
- [ ] Individual can specify help type and region
- [ ] Groups can view anonymous requests matching their service area
- [ ] Groups can send encrypted replies
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

**Checkpoint:** Full anonymous help request flow works; encryption verified; no tracking verified.

---

## Phase 9: Aggregate Reporting (FR-5)

**Objective:** Hub admins can view aggregate metrics without individual details.

### 9.1 Backend

- [ ] `GET /api/reports/summary` — totals by category
- [ ] `GET /api/reports/groups` — count of groups supported
- [ ] `GET /api/reports/timing` — average time to funding
- [ ] `GET /api/reports/export` — CSV export
- [ ] Date range filtering on all endpoints
- [ ] **Verify:** No individual request details in response
- [ ] **Verify:** No drill-down capability

### 9.2 Frontend

- [ ] Reports dashboard (hub admin only)
- [ ] Summary cards (total funds, groups, requests)
- [ ] Category breakdown (table or chart)
- [ ] Date range picker
- [ ] Export to CSV button

### 9.3 Acceptance Criteria (FR-5)

- [ ] Reports show aggregate data only
- [ ] Reports can be filtered by date range
- [ ] Reports can be exported (CSV or PDF)
- [ ] No drill-down to individual request details

**Checkpoint:** Hub admin can view and export aggregate reports.

---

## Phase 10: Security Audit & Hardening

**Objective:** Comprehensive security review before pilot launch.

### 10.1 Application Security Audit

- [ ] Input validation review (all endpoints)
- [ ] SQL injection testing (parameterized queries verified)
- [ ] XSS testing (output encoding verified)
- [ ] Auth token security review
- [ ] Session management review
- [ ] CORS configuration review
- [ ] Rate limiting verification
- [ ] E2E encryption implementation review
- [ ] **Verify:** Server cannot decrypt mailbox messages

### 10.2 Infrastructure Security Audit

- [ ] IAM policy review (least privilege verified)
- [ ] Security group rules audit
- [ ] **Verify:** RDS not publicly accessible
- [ ] **Verify:** Fargate tasks in private subnets
- [ ] Secrets Manager configuration review
- [ ] KMS key policies review
- [ ] CloudTrail enabled and logging
- [ ] WAF rules effective (test attacks)
- [ ] VPC Flow Logs enabled
- [ ] **Verify:** No long-lived credentials
- [ ] ECR vulnerability scan results reviewed
- [ ] **Verify:** Containers running as non-root

### 10.3 Privacy Audit

- [ ] **Verify:** No IP logging on anonymous routes
- [ ] **Verify:** No cookies on anonymous routes
- [ ] **Verify:** No third-party scripts or resources
- [ ] **Verify:** CSP headers configured correctly
- [ ] **Verify:** No PII fields in mailbox-related tables
- [ ] **Verify:** Tombstones contain no identifying data
- [ ] Review all log statements for PII leakage

### 10.4 Accessibility Audit

- [ ] WCAG 2.1 AA compliance check
- [ ] Screen reader testing
- [ ] Keyboard navigation (where applicable)
- [ ] Color contrast verification
- [ ] Touch target sizes (44x44px minimum)
- [ ] Low-bandwidth testing

### 10.5 Performance Verification

- [ ] Lighthouse audit (mobile)
- [ ] Page load < 3 seconds on 3G
- [ ] Time to interactive < 5 seconds on 3G
- [ ] API response time < 500ms p95
- [ ] Database query optimization

### 10.6 Error Handling

- [ ] User-friendly error messages (no stack traces)
- [ ] Error logging (no PII in logs)
- [ ] Graceful degradation for failures

**Checkpoint:** All security audits pass; no critical vulnerabilities.

---

## Phase 11: Pilot Deployment

**Objective:** Production system live and ready for pilot participants.

### 11.1 Production Infrastructure

- [ ] Terraform apply to production
- [ ] Verify all security controls active
- [ ] Domain configured (relayfunds.org)
- [ ] SSL certificate active
- [ ] WAF rules active
- [ ] CloudWatch alarms configured
- [ ] Backup verification (test restore)

### 11.2 Pre-Launch Checklist

- [ ] Final security audit sign-off
- [ ] All acceptance criteria verified
- [ ] Translations complete (English + Spanish)
- [ ] Error pages in place
- [ ] Health check endpoint working
- [ ] Monitoring dashboard ready

### 11.3 Onboarding

- [ ] Create hub admin account
- [ ] Hub admin walkthrough session
- [ ] Group invitation workflow tested
- [ ] Group coordinator onboarding materials
- [ ] Support contact channel established

### 11.4 Pilot Support

- [ ] Feedback collection mechanism
- [ ] Issue tracking process
- [ ] On-call support plan
- [ ] Incident response procedure

### 11.5 Documentation

- [ ] API documentation
- [ ] User guide for hub admins
- [ ] User guide for group coordinators
- [ ] Individual help request guide (simple, translated)
- [ ] Deployment runbook
- [ ] Infrastructure security runbook
- [ ] Incident response playbook

**Checkpoint:** Live at relayfunds.org; first hub onboarded; monitoring active.

---

## Success Checkpoints

| Phase | Checkpoint |
|-------|------------|
| **Phase 0** | Dev environment works; CI runs on PR |
| **Phase 1** | AWS infra deployed; all security controls verified |
| **Phase 2** | Database schema complete; API structure in place |
| **Phase 3** | i18n configured; language switching works |
| **Phase 4** | Magic link auth works; sessions expire correctly |
| **Phase 5** | Hub sees groups; groups edit profiles |
| **Phase 6** | All verification methods work |
| **Phase 7** | Full funding request lifecycle works |
| **Phase 8** | Anonymous help requests work; E2E encryption verified; no tracking |
| **Phase 9** | Aggregate reports display and export correctly |
| **Phase 10** | All security/privacy/accessibility audits pass |
| **Phase 11** | Live at relayfunds.org; pilot participants onboarded |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Scope creep | Strict PRD adherence; out-of-scope logged for post-pilot |
| PII in free text | UX guidance; no "name"/"address" fields |
| Auth complexity | Magic link only; no passwords, no OAuth |
| Over-engineering | YAGNI—build only what's needed for pilot |
| Cryptographic flaws | Use proven libraries only; no custom crypto; security audit |
| Passphrase loss | Clear UX warning; no recovery by design |
| Accidental tracking | Audit logging disabled on anonymous routes; no IP logging |
| Third-party tracking | No external scripts/fonts/CDNs; CSP headers |
| IAM over-permissioning | Least privilege; permission boundaries; audit |
| Secrets exposure | Secrets Manager; no hardcoded credentials; rotation |
| Database breach | Encryption at rest; private subnet; security group |
| Misconfigured security groups | Terraform-managed; audit; no 0.0.0.0/0 except ALB 443 |
| Missing audit trail | CloudTrail; VPC Flow Logs; log retention |

---

## Out of Scope for MVP

Per the PRD, these are explicitly excluded:

- Individual accounts/registration (passphrase-only access)
- Collection of email/phone from individuals
- Server-readable messages (all E2E encrypted)
- Case management
- Long-term storage of individual requests (7-day auto-delete)
- Document uploads
- Donor-facing dashboards
- Real-time chat
- Eligibility automation
- Native mobile apps
- Push notifications
- Analytics on individual usage
- Passphrase recovery

---

## Post-MVP Considerations

If the pilot succeeds, evaluate:

1. Multi-hub support
2. Enhanced reporting
3. Audit log viewer for admins
4. Notification preferences (opt-in email for groups)
5. Additional languages
6. Mobile app (if justified by feedback)
