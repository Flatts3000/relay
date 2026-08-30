# PRD to MVP Implementation Plan

> **This is a record of what was built, not a plan for what to build.** Reconciled against the
> code on 2026-08-29 ([#9](https://github.com/Flatts3000/relay/issues/9)). Every `###` section
> below carries a status line; a section marked shipped has its boxes ticked, and everything else
> keeps unticked boxes and says what is actually true. Status is asserted per section rather than
> per item, because that is the granularity the evidence supports.
>
> **The short version.** Phases 2 through 9 shipped, with the departures noted in place. Phase 1
> was never built: the Fargate, RDS, ALB and WAF architecture exists only as unapplied Terraform,
> and production is a single EC2 instance running Docker Compose. Phase 10 covers the application
> and privacy audits but not accessibility or performance, neither of which has tooling. Phase 11
> is mostly outstanding, because no pilot has run.
>
> Two items inside otherwise-shipped work were not built and are easy to miss: broadcast invites
> are not padded with dummies, so the invite count still reveals how many groups matched a request
> (8.2), and there is no short displayable broadcast ID.
>
> An unticked box here means the thing genuinely was not done. It no longer means the document was
> not maintained.

This document outlines the implementation plan to deliver Relay's MVP as defined in the [Product Requirements Document](product_requirements_document.md).

## Overview

**Goal:** Deliver a working pilot-ready application for 1 hub and 3-5 mutual aid groups over a 30-45 day pilot.

**Approach:** Vertical slices—deliver complete, usable features end-to-end rather than building all backend then all frontend.

**Key Principle:** Security and privacy are not afterthoughts. Infrastructure security, E2E encryption architecture, and privacy controls are built from the foundation up.

---

## Phase 0: Project Setup

**Objective:** Development environment, tooling, and CI pipeline ready.

### 0.1 Monorepo Structure

> **Partially shipped.** npm workspaces, Husky pre-commit running lint-staged, and a shared `.prettierrc` are in place. TypeScript and ESLint config are per workspace (`backend/tsconfig.json`, `frontend/tsconfig.json`, and an `eslint.config.js` in each), not shared from the root.

- [ ] Verify workspace configuration (frontend, backend, infra)
- [ ] Shared TypeScript configuration
- [ ] Shared ESLint and Prettier configuration
- [ ] Husky pre-commit hooks (lint, typecheck)

### 0.2 Development Environment

> **Shipped.** `docker-compose.dev.yml` provides local Postgres, `.env.example` and a Zod-validated `config.ts` cover environment variables, and `npm run dev` runs both servers with hot reload (`tsx watch` and Vite).

- [x] Docker Compose for local PostgreSQL
- [x] Environment variable management (.env.example, validation)
- [x] Local development scripts (npm run dev, etc.)
- [x] Hot reload for frontend and backend

### 0.3 Testing Infrastructure

> **Partially shipped.** Vitest, a dedicated test database and coverage thresholds are configured for both workspaces. React Testing Library is installed but the frontend has no test files at all - tracked in [#6](https://github.com/Flatts3000/relay/issues/6).

- [ ] Jest/Vitest configuration for backend
- [ ] React Testing Library for frontend
- [ ] Test database configuration
- [ ] Coverage thresholds defined

### 0.4 CI Pipeline (GitHub Actions)

> **Partially shipped.** CI runs lint, typecheck, both test suites, builds, Docker builds, Terraform validate, dependency audit, CodeQL and Trivy. There is no OIDC configuration: no workflow requests an `id-token` permission, and the production host holds a static IAM key ([#11](https://github.com/Flatts3000/relay/issues/11)).

- [ ] Lint and typecheck on PR
- [ ] Run tests on PR
- [ ] Build verification
- [ ] Security scanning (dependency audit)
- [ ] OIDC configuration for AWS deployment (no long-lived credentials)

**Checkpoint:** `npm run dev` starts full stack locally; CI runs on PR.

---

## Phase 1: AWS Infrastructure Foundation

**Objective:** Secure, production-ready AWS infrastructure with all security controls in place.

> **None of this phase was built.** It is written in Terraform under `infra/` and has never been
> applied. The module declares the VPC, subnets, NAT and internet gateways, security groups, an RDS
> instance, Secrets Manager secrets, IAM roles with an OIDC provider, ECR, an ECS cluster and
> services, the ALB with ACM and a WAF, CloudTrail, CloudWatch log groups and five alarms, and VPC
> flow logs. So the code exists, and `terraform validate` runs in CI - but no resource described
> below is deployed.
>
> Production is a single EC2 instance running Docker Compose behind Caddy, chosen deliberately on
> 2026-08-28. See [deployment.md](deployment.md) for what actually runs, and the control table in
> `CLAUDE.md` for which of the security properties below are consequently unmet.

### 1.1 Network Foundation (Terraform)

> **Not built.** See the note at the top of this phase.

- [ ] VPC with DNS hostnames enabled
- [ ] Public subnets (2 AZs) for ALB only
- [ ] Private subnets (2 AZs) for Fargate and RDS
- [ ] NAT Gateway for outbound internet access
- [ ] Internet Gateway for public subnets
- [ ] Route tables configured correctly

### 1.2 Security Groups

> **Not built.** See the note at the top of this phase.

- [ ] ALB security group: inbound 443 from 0.0.0.0/0 only
- [ ] Fargate security group: inbound from ALB security group only
- [ ] RDS security group: inbound 5432 from Fargate security group only
- [ ] **Verify:** No overly permissive rules (no 0.0.0.0/0 except ALB 443)

### 1.3 Database (RDS PostgreSQL)

> **Not built.** See the note at the top of this phase.

- [ ] RDS instance in private subnets
- [ ] Multi-AZ disabled for pilot (cost); document for production
- [ ] Encryption at rest with customer-managed KMS key
- [ ] Automated backups enabled (7-day retention)
- [ ] **Verify:** Not publicly accessible
- [ ] **Verify:** Security group restricts access to Fargate only

### 1.4 Secrets Management

> **Not built.** See the note at the top of this phase.

- [ ] AWS Secrets Manager secret for database credentials
- [ ] Secrets Manager secret for email service API key
- [ ] Automatic rotation configured (90-day)
- [ ] **Verify:** No credentials in code, config, or environment files

### 1.5 IAM Roles

> **Not built.** See the note at the top of this phase.

- [ ] Fargate task execution role (ECR pull, CloudWatch Logs, Secrets Manager read)
- [ ] Fargate task role (application permissions only)
- [ ] CI/CD deployment role (minimal permissions for deploy)
- [ ] Permission boundaries on all roles
- [ ] **Verify:** Least privilege—no `*` resources or actions

### 1.6 Container Infrastructure

> **Not built.** See the note at the top of this phase.

- [ ] ECR repository with vulnerability scanning enabled
- [ ] Image immutability enforced (no tag overwrites)
- [ ] Fargate cluster in private subnets
- [ ] Task definition with secrets from Secrets Manager
- [ ] **Verify:** Container runs as non-root user

### 1.7 Load Balancer & WAF

> **Not built.** See the note at the top of this phase.

- [ ] Application Load Balancer in public subnets
- [ ] HTTPS listener with ACM certificate
- [ ] HTTP → HTTPS redirect
- [ ] AWS WAF attached with managed rule groups:
  - AWS Managed Rules Common Rule Set
  - SQL injection rules
  - Rate limiting rule
- [ ] Health check endpoint configured

### 1.8 Monitoring & Audit

> **Not built.** See the note at the top of this phase.

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

> **Not built.** See the note at the top of this phase.

- [ ] Route 53 hosted zone (or external DNS)
- [ ] ACM certificate for relayfunds.org
- [ ] Certificate attached to ALB

**Checkpoint:** Infrastructure deployed; Fargate can connect to RDS; no public database access; WAF active.

---

## Phase 2: Database Schema & API Foundation

**Objective:** Complete database schema and API structure with security built-in.

### 2.1 Database Schema

> **Shipped.** Seventeen tables across eleven migrations, with foreign keys, three CHECK constraints (`positive_amount`, `broadcast_invites_decrypted_at_required`, `groups_key_material_complete`) and indexes on the queried columns. Two deliberate departures from the sketch above: `users` carries no `group_id` or `hub_id` - membership lives in `hub_members`, `group_members` and `group_hub_memberships`, which is what lets a group belong to more than one hub - and `verification_requests` has no `attestor_group_ids` array, because attestations are rows in `peer_attestations`. The broadcast tables hold no individual-level fields.

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

broadcasts
├── id (UUID, random - NOT sequential)
├── broadcast_id (short, displayable identifier)
├── ciphertext_payload (bytea)
├── region
├── categories (array)
├── ttl_expires_at
├── created_at

broadcast_invites
├── id (UUID)
├── broadcast_id (FK)
├── group_id (FK)
├── wrapped_key (bytea)
├── status (enum: pending, decrypted, deleted)
├── is_dummy (boolean, default false)
├── decrypted_at
├── expires_at
├── created_at

broadcast_tombstones
├── id (UUID)
├── original_broadcast_id (UUID)
├── broadcast_id_display (short identifier)
├── bucket (text)
├── confirming_group_ids (array)
├── created_at
├── resolved_at

audit_log (authenticated routes only)
├── id (UUID)
├── user_id (FK)
├── action
├── resource_type
├── resource_id
├── metadata (jsonb)
├── created_at
```

- [x] Create migration files
- [x] Add foreign key constraints
- [x] Add check constraints (e.g., amount > 0)
- [x] Add indexes for common queries
- [x] **Verify:** No PII fields for individuals (no name, address, phone, email in broadcast tables)

### 2.2 API Structure

> **Shipped.** Every route group listed is mounted in `app.ts`, plus `/api/admin` and `/api/onboarding`, which this plan predates. Health is at `/api/health` rather than `/health`, with `/api/health/ready` for readiness. Error handling and request-ID middleware are in `middleware/`.

- [x] Express app with TypeScript
- [x] Route structure:
  ```
  /api/auth/*           (authentication)
  /api/groups/*         (group management)
  /api/verification/*   (verification workflow)
  /api/requests/*       (funding requests)
  /api/reports/*        (aggregate reporting)
  /api/broadcasts/*     (anonymous - NO AUTH for submission)
  /api/invites/*        (group-facing broadcast invites)
  /api/directory/*      (public directory)
  /health               (health check)
  ```
- [x] Error handling middleware (no stack traces in production)
- [x] Request ID middleware for tracing

### 2.3 Input Validation

> **Shipped.** Zod schemas in `validations/`, applied per route; Drizzle parameterises every query.

- [x] Zod schemas for all request bodies
- [x] Validation middleware
- [x] Sanitization of text inputs
- [x] **Verify:** Parameterized queries only (no string concatenation)

### 2.4 Audit Logging

> **Shipped.** `auditMiddleware` is mounted after the anonymous routers in `app.ts` specifically so broadcast submission is never audited, and `logAuditEvent` records IP only when handed a request, which anonymous routes never do.

- [x] Audit log middleware for authenticated routes
- [x] Log: user, action, resource, timestamp
- [x] **Critical:** No audit logging on `/api/broadcasts/*` submission routes
- [x] **Critical:** No IP logging on anonymous routes

### 2.5 Security Middleware

> **Shipped.** Helmet, strict CORS, CSP with no external origins, and rate limiting. The anonymous limiter keys on a hash whose salt rotates every five minutes, so it stores no durable identifier.

- [x] Helmet.js for security headers
- [x] CORS configuration (strict origins)
- [x] Content Security Policy (no external scripts/fonts)
- [x] Rate limiting (authenticated routes)
- [x] **Critical:** Anonymous rate limiting must not store user identifiers

**Checkpoint:** Database migrations run; API structure in place; audit logging works for authenticated routes only.

---

## Phase 3: Internationalization (i18n)

**Objective:** i18n infrastructure in place before building UI, so all features are translatable from the start.

### 3.1 Configuration

> **Shipped.** `react-i18next` with browser language detection, English fallback and localStorage persistence.

- [x] Install and configure react-i18next
- [x] Language detection (browser preference)
- [x] Fallback to English
- [x] localStorage persistence

### 3.2 Translation Structure

> **Shipped.** Nine namespaces, complete in both `en` and `es`.

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

- [x] Create translation file structure
- [x] Add common translations (English)
- [x] Add common translations (Spanish)

### 3.3 UI Components

> **Shipped.** `LanguageSwitcher` is rendered by `PublicHeader` and `ConsoleLayout`, so it is present on every page in both the public and signed-in shells.

- [x] Language switcher component
- [x] Language switcher in header/nav
- [x] **Verify:** Switcher accessible from all pages

**Checkpoint:** Language can be switched; translations load correctly.

---

## Phase 4: Authentication (FR-6)

**Objective:** Secure, passwordless authentication for hub admins and group coordinators.

### 4.1 Magic Link Backend

> **Shipped.** The request-link route is `POST /api/auth/login`. Tokens are 32 bytes, expire in 15 minutes (`MAGIC_LINK_EXPIRY_MINUTES`), are single-use, and are stored as a SHA-256 of the issued value ([#48](https://github.com/Flatts3000/relay/issues/48)).

- [x] `POST /api/auth/request-link` — send magic link email
- [x] `POST /api/auth/verify` — verify token, create session
- [x] `POST /api/auth/logout` — destroy session
- [x] `GET /api/auth/me` — get current user
- [x] Token generation (cryptographically secure, 32+ bytes)
- [x] Token expiration (15 minutes)
- [x] Single-use tokens (invalidate after use)

### 4.2 Session Management

> **Shipped in modified form.** Sessions expire after 30 minutes of inactivity, slide forward on use, are revoked server-side on logout, and there is no "remember me". They are bearer tokens held in `localStorage`, not JWTs or cookies, so the "secure session cookies" half of this item was not built as described.

- [ ] JWT or secure session cookies
- [ ] Session expiration (30 minutes inactivity)
- [ ] No "remember me" option
- [ ] Session invalidation on logout
- [ ] **Verify:** Sessions work on shared devices (no persistent state)

### 4.3 Email Service

> **Partially shipped.** Console, Resend and SES providers, a React Email template, and a per-route rate limit. The API key is not in Secrets Manager: production reads it from an environment file on the host.

- [ ] Email service integration (AWS SES or SendGrid)
- [ ] Magic link email template
- [ ] Rate limiting on email requests (prevent abuse)
- [ ] **Verify:** API key in Secrets Manager, not code

### 4.4 Authorization Middleware

> **Shipped.** `authenticate`, `requireRole`, `requireHubAdmin`, `requireGroupCoordinator`, `requireStaffAdmin`, `requireGroupMember` and `requireHubMember`, applied at the route layer.

- [x] `requireAuth` middleware
- [x] `requireRole('hub_admin')` middleware
- [x] `requireRole('group_coordinator')` middleware
- [x] `requireGroupMember(groupId)` middleware
- [x] **Verify:** Authorization enforced at API level, not just UI

### 4.5 Frontend

> **Shipped.** `LoginPage`, `AuthContext`, `ProtectedRoute` and the logout control in `ConsoleLayout`. The magic link lands back on `/login` with the token in the query string rather than on a separate page.

- [x] Login page (email input)
- [x] "Check your email" confirmation page
- [x] Magic link landing page (token verification)
- [x] Logout button
- [x] Auth context/provider
- [x] Protected route wrapper
- [x] Redirect unauthenticated users to login

### 4.6 Acceptance Criteria (FR-6)

> **Shipped.** All five criteria hold; the expiry figures are the constants named in 4.1.

- [x] Users receive login link via email
- [x] Links expire after 15 minutes
- [x] Users can log out explicitly
- [x] Sessions timeout after 30 minutes inactivity
- [x] No "remember me" or persistent sessions

**Checkpoint:** Can log in via magic link; session expires correctly; logout works.

---

## Phase 5: Group Registry (FR-1)

**Objective:** Hub admins can view groups; groups can manage their profiles.

### 5.1 Backend

> **Shipped.** All five routes exist in `routes/groups.ts`, plus `GET /api/groups/me`, `GET /api/groups/me/dashboard` and the broadcast-key route added later.

- [x] `POST /api/groups` — register new group (invite flow)
- [x] `GET /api/groups` — list groups (hub admin only)
- [x] `GET /api/groups/:id` — get group details
- [x] `PATCH /api/groups/:id` — update group (own group only)
- [x] `DELETE /api/groups/:id` — soft delete (hub admin only)
- [x] Input validation with Zod
- [x] **Verify:** Groups can only edit their own profile

### 5.2 Frontend - Hub Admin

> **Shipped.** `HubGroupsListPage`, `HubGroupDetailPage` and `CreateGroupPage`.

- [x] Groups list page (table/cards)
- [x] Group detail view
- [x] Filter by verification status
- [x] Filter by service area
- [x] Filter by aid category

### 5.3 Frontend - Group Coordinator

> **Shipped.** `GroupProfilePage` and `GroupSettingsPage`.

- [x] Group profile view
- [x] Group profile edit form
- [x] Aid categories multi-select
- [x] Service area input

### 5.4 Acceptance Criteria (FR-1)

> **Shipped.** Verified against the running application during the UX audit of 2026-08-29.

- [x] Hub admins can view registry of groups in their network
- [x] Groups can update their own profile information
- [x] Registry is not publicly accessible
- [x] No recipient-level data fields exist in the schema

**Checkpoint:** Hub admin can view groups; group can edit own profile.

---

## Phase 6: Verification System (FR-2)

**Objective:** Lightweight verification to establish group trust.

### 6.1 Backend

> **Shipped.** Request, status, list, detail, approve, deny, revoke, attestation-requests and attest are all in `routes/verification.ts`.

- [x] `POST /api/groups/:id/verification` — request verification
- [x] `GET /api/verification-requests` — list pending (hub admin)
- [x] `POST /api/verification-requests/:id/approve` — approve (hub admin)
- [x] `POST /api/verification-requests/:id/deny` — deny with reason (hub admin)
- [x] `POST /api/verification-requests/:id/attest` — peer attestation
- [x] Verification method handling:
  - Hub admin direct approval
  - Peer attestation (requires 2 verified groups)
  - Sponsor reference
- [x] Status transitions and validation
- [x] **Verify:** Only verified groups can vouch for others

### 6.2 Frontend - Group Coordinator

> **Shipped.** `RequestVerificationPage`.

- [x] Request verification page
- [x] Method selection (hub approval, peer, sponsor)
- [x] Peer attestation: select groups to request vouching
- [x] Sponsor reference: input sponsor details
- [x] Verification status display on profile

### 6.3 Frontend - Hub Admin

> **Shipped.** `VerificationQueuePage` and `VerificationRequestDetailPage`.

- [x] Verification queue (pending requests)
- [x] Request detail view
- [x] Approve/Deny actions
- [x] Denial reason input
- [x] Revoke verification action

### 6.4 Frontend - Peer Attestation Flow

> **Shipped.** `AttestationRequestsPage`. It returned 400 for every caller until [#54](https://github.com/Flatts3000/relay/pull/54).

- [x] Notification/list of attestation requests
- [x] Review requesting group info
- [x] Approve/Deny attestation
- [x] **Verify:** Requires 2 verified groups to complete

### 6.5 Acceptance Criteria (FR-2)

> **Shipped.** Verified against the running application during the UX audit of 2026-08-29.

- [x] Groups can request verification through any supported method
- [x] Hub admins can approve/deny verification requests
- [x] Peer attestation requires minimum of 2 existing verified groups
- [x] Verification status is visible to hub admins
- [x] Verification can be revoked by hub admin

**Checkpoint:** All three verification methods work end-to-end.

---

## Phase 7: Funding Requests & Payout Tracking (FR-3, FR-4)

**Objective:** Groups submit requests; hubs review and track payouts.

### 7.1 Backend - Funding Requests

> **Shipped.** Create, list and detail in `routes/requests.ts`.

- [x] `POST /api/requests` — submit request (verified groups only)
- [x] `GET /api/requests` — list requests (filtered by role)
- [x] `GET /api/requests/:id` — request detail
- [x] `POST /api/requests/:id/approve` — approve (hub admin)
- [x] `POST /api/requests/:id/decline` — decline with reason (hub admin)
- [x] `POST /api/requests/:id/clarify` — request clarification (hub admin)
- [x] **Verify:** Only verified groups can submit

### 7.2 Backend - Payout Status

> **Shipped.** Approve, decline, clarify, mark-sent and acknowledge, with `funding_request_status_history` recording each transition.

- [x] `POST /api/requests/:id/mark-sent` — mark funds sent (hub admin)
- [x] `POST /api/requests/:id/acknowledge` — acknowledge receipt (group)
- [x] Status history tracking
- [x] Timestamp for each status change
- [x] **Verify:** Status transitions are valid (no skipping states)

### 7.3 Frontend - Group Coordinator

> **Shipped.** `NewFundingRequestPage`, `FundingRequestsListPage` and `FundingRequestDetailPage`. The form rejected every verified group until [#54](https://github.com/Flatts3000/relay/pull/54).

- [x] New request form
  - Amount input (numeric)
  - Category dropdown
  - Urgency toggle
  - Region (pre-filled from profile)
  - Justification textarea with privacy guidance tooltip
- [x] Request history list
- [x] Request detail view with status timeline
- [x] "Acknowledge Receipt" button (when funds_sent)

### 7.4 Frontend - Hub Admin

> **Shipped.** The same list and detail pages, which switch on role.

- [x] Request queue (filterable, sortable)
- [x] Filter by: category, urgency, region, status
- [x] Sort by: date, urgency, amount
- [x] Request detail view
- [x] Approve/Decline/Clarify actions
- [x] "Mark Funds Sent" button
- [x] Decline reason input

### 7.5 Acceptance Criteria (FR-3)

> **Shipped.** Verified against the running application during the UX audit of 2026-08-29.

- [x] Only verified groups can submit requests
- [x] Justification field displays guidance discouraging personal details
- [x] Hub admins can filter/sort requests by category, urgency, region
- [x] Request history is maintained for the group
- [x] Declined requests include optional reason visible to group

### 7.6 Acceptance Criteria (FR-4)

> **Shipped.** Status transitions only - no receipts, narratives or recipient data are collected at any point.

- [x] Status updates are timestamped
- [x] Groups can view status of their requests
- [x] Hub admins can update status
- [x] Groups can mark "Acknowledged" when funds received
- [x] Status history is preserved

**Checkpoint:** Full request lifecycle works: submit → approve → funds sent → acknowledged.

---

## Phase 8: Anonymous Help Broadcasts (FR-7)

**Objective:** Individuals can broadcast encrypted help requests to matching groups without any identifying information.

> _This phase implements the encrypted public help broadcast system, replacing the earlier mailbox/passphrase design. See `docs/encrypted_public_help_broadcast.md` for the full spec._

### 8.1 Cryptographic Foundation

> **Shipped.** TweetNaCl only, no custom primitives: `secretbox` for the payload, `box` for per-group key wrapping with a fresh ephemeral keypair each time, and a content key generated per broadcast. The safe word is generated client-side and appears only inside the encrypted payload and on the receipt screen.

- [x] TweetNaCl.js integration (already in codebase)
- [x] Symmetric content key generation (`crypto_secretbox`)
- [x] Per-group key wrapping (`crypto_box` with group's X25519 public key)
- [x] Safe-word generation (client-side, random)
- [x] **Verify:** Content key is random per broadcast, never reused
- [x] **Verify:** Wrapped keys are individually encrypted per group
- [x] **Verify:** Safe-word exists only in encrypted payload and on receipt screen
- [x] **Verify:** No custom cryptography — use library primitives only

### 8.2 Backend - Broadcasts & Invites

> **Partially shipped.** Broadcast creation and the invite routes exist, under different names: confirmation is `POST /api/invites/:id/decrypt` and `DELETE /api/invites/:id` rather than `/confirm`. Two items were not built. There is no invite padding - `broadcast_invites` has no `is_dummy` column and nothing pads a bucket to a fixed cap, so the invite count still reveals how many groups matched. There is no short displayable broadcast ID; the receipt shows the UUID.

- [ ] `POST /api/broadcasts` — create broadcast (ciphertext, header, per-group invites)
- [ ] `GET /api/invites` — group fetches pending invites for subscribed buckets
- [ ] `GET /api/invites/:id` — get specific invite + shared ciphertext
- [ ] `POST /api/invites/:id/confirm` — group confirms receipt (triggers deletion)
- [ ] `DELETE /api/invites/:id` — group manually deletes invite
- [ ] Broadcast ID generation (short, displayable)
- [ ] Invite padding (pad to fixed bucket cap with dummy invites)

### 8.3 Backend - Anonymous Route Security

> **Shipped.** The anonymous routers are mounted before `auditMiddleware`, set no cookies, run no auth check, and never pass a request into `logAuditEvent`. Rate limiting uses a salted hash that rotates every five minutes rather than proof-of-work, which is a departure from the wording but meets the requirement of storing no user identifier.

- [x] **Critical:** Disable all logging middleware on broadcast submission routes
- [x] **Critical:** No IP address in request context for anonymous routes
- [x] **Critical:** No cookies set on response
- [x] **Critical:** No session/auth checks on broadcast submission
- [x] Rate limiting without user identifiers (proof-of-work or privacy-preserving token)

### 8.4 Backend - Invite Lifecycle & Cleanup

> **Partially shipped.** A ten-minute scheduler enforces the post-decryption window and the seven-day TTL, deletes the ciphertext once the last invite resolves, and writes a tombstone at that point, all covered by `invite-cleanup.service.test.ts`. The dummy invite item below is not built, because dummy invites are not built - see 8.2.

- [x] Invite TTL enforcement (scheduled job)
- [x] Confirmation-based deletion (immediate on confirm)
- [x] 10-minute auto-delete after decryption
- [x] Ciphertext cleanup when all invites resolved
- [x] Tombstone creation (broadcast ID, bucket, timestamp, confirming groups)
- [ ] Dummy invite cleanup at TTL expiry _(no dummy invites exist - see 8.2)_

### 8.5 Backend - Directory

> **Shipped.** The broadcast directory returns only verified groups that have registered a public key.

- [x] `GET /api/directory` — public directory of reviewed groups
- [x] Response: group_id, public_key, bucket_membership, optional contact page
- [x] Only reviewed groups included
- [x] Cacheable (public, no auth required)
- [x] Bucket resolution: region + category → bucket label → matching groups

### 8.6 Frontend - Individual Flow

> **Shipped.** `BroadcastSubmitPage`, with the region and category pickers, the encrypted submit, and the receipt screen carrying the safe word.

- [x] "Request help" entry point on landing page
- [x] Region selector (coarse: city / county / metro; autocomplete from static dataset)
- [x] Category multi-select (from taxonomy)
- [x] Message form with required contact method (phone / email / freeform)
- [x] Content warnings: "Only recipient groups can read this" / shared device warning
- [x] Submit: generate content key → encrypt payload → fetch directory → wrap key per group → upload
- [x] Receipt screen: broadcast ID + safe-word + "A group will contact you" guidance
- [ ] **Verify:** Works on slow/intermittent connections _(never measured - see 10.5)_
- [x] **Verify:** No cookies, no localStorage persisted after submission
- [x] **Verify:** All screens bilingual (English/Spanish)

### 8.7 Frontend - Group Inbox

> **Shipped.** `GroupInboxPage` and `InviteDetailPage`. Group keys are derived from a coordinator passphrase; before that there was no way for a group to hold a key at all, so nothing could be decrypted.

- [x] Pending invites list (matching subscribed buckets)
- [x] Invite card: bucket info, timestamp
- [x] Decrypt flow: unlock group key → unwrap content key → decrypt payload
- [x] Decrypted view: message, contact info, safe-word
- [x] 10-minute countdown timer (visible in UI)
- [x] Manual delete button
- [x] Confirm receipt action
- [x] Tombstone view: "Broadcast [ID] in [bucket]. Confirmed on [date]."

### 8.8 Privacy Verification

> **Partially shipped.** The privacy properties hold and were walked through end to end during the UX audit of 2026-08-29: a request submitted anonymously was opened by the recipient group, and the server holds only ciphertext it cannot read. But the items below labelled **Test:** ask for automated coverage, and there is none - there is no `broadcasts.test.ts`, and the only automated broadcast coverage is `invite-cleanup.service.test.ts` and `broadcast-key.test.ts`. A walkthrough is not a test; it does not run again tomorrow.

- [x] **Audit:** No cookies set for anonymous users
- [x] **Audit:** No server logs of broadcast submission
- [x] **Audit:** No IP addresses logged for anonymous routes
- [x] **Audit:** Server cannot decrypt stored ciphertext or invites
- [x] **Audit:** Safe-word never stored on server (not plaintext, not hashed)
- [x] **Audit:** Content key never stored on server unencrypted
- [x] **Audit:** Invites deleted after confirmation; ciphertext deleted after all invites resolved
- [x] **Audit:** Content Security Policy blocks external scripts
- [x] **Audit:** No third-party resources loaded
- [ ] **Test:** Full broadcast → decrypt → confirm → delete flow end-to-end _(walked through by hand, never automated)_
- [ ] **Test:** Groups added after broadcast cannot decrypt it (no invite exists)
- [x] **Test:** Tombstone retained, ciphertext and invites gone after resolution
- [x] **Test:** 10-minute auto-delete works
- [ ] **Test:** Dummy invite padding works correctly _(no padding to test - see 8.2 and [#57](https://github.com/Flatts3000/relay/issues/57))_

**Checkpoint:** Full anonymous help broadcast flow works; encryption verified; no tracking verified.

---

## Phase 9: Aggregate Reporting (FR-5)

**Objective:** Hub admins can view aggregate metrics without individual details.

### 9.1 Backend

> **Shipped.** Summary, groups, timing and CSV export in `routes/reports.ts`, all aggregate.

- [x] `GET /api/reports/summary` — totals by category
- [x] `GET /api/reports/groups` — count of groups supported
- [x] `GET /api/reports/timing` — average time to funding
- [x] `GET /api/reports/export` — CSV export
- [x] Date range filtering on all endpoints
- [x] **Verify:** No individual request details in response
- [x] **Verify:** No drill-down capability

### 9.2 Frontend

> **Shipped.** `ReportsDashboardPage`.

- [x] Reports dashboard (hub admin only)
- [x] Summary cards (total funds, groups, requests)
- [x] Category breakdown (table or chart)
- [x] Date range picker
- [x] Export to CSV button

### 9.3 Acceptance Criteria (FR-5)

> **Shipped.** Totals by category, groups supported and time-to-funding averages, with no per-person or per-household figure available anywhere.

- [x] Reports show aggregate data only
- [x] Reports can be filtered by date range
- [x] Reports can be exported (CSV or PDF)
- [x] No drill-down to individual request details

**Checkpoint:** Hub admin can view and export aggregate reports.

---

## Phase 10: Security Audit & Hardening

**Objective:** Comprehensive security review before pilot launch.

### 10.1 Application Security Audit

> **Shipped, with the audit itself since corrected.** Recorded in [security_audit.md](security_audit.md). Read it as amended rather than as written: its token-storage findings were wrong when made - [#48](https://github.com/Flatts3000/relay/issues/48) is titled for exactly that, and plaintext storage of session, magic-link and invite tokens was only actually fixed in [#50](https://github.com/Flatts3000/relay/pull/50) and [#55](https://github.com/Flatts3000/relay/pull/55). The reviews in this section have now genuinely happened and the current state is sound; the document they point at was not evidence of that at the time it was written.

- [x] Input validation review (all endpoints)
- [x] SQL injection testing (parameterized queries verified)
- [x] XSS testing (output encoding verified)
- [x] Auth token security review
- [x] Session management review
- [x] CORS configuration review
- [x] Rate limiting verification
- [x] E2E encryption implementation review
- [x] **Verify:** Server cannot decrypt broadcast ciphertext or invites

### 10.2 Infrastructure Security Audit

> **Not applicable.** The infrastructure this section audits was never deployed. See 1.1 to 1.9 and [deployment.md](deployment.md) for what actually runs.

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

> **Shipped.** The privacy checks are the ones verified in 2.4, 2.5 and 8.3.

- [x] **Verify:** No IP logging on anonymous routes
- [x] **Verify:** No cookies on anonymous routes
- [x] **Verify:** No third-party scripts or resources
- [x] **Verify:** CSP headers configured correctly
- [x] **Verify:** No PII fields in broadcast-related tables
- [x] **Verify:** Tombstones contain no identifying data
- [x] Review all log statements for PII leakage

### 10.4 Accessibility Audit

> **Done once by hand, now stale, and untooled.** [security_audit.md](security_audit.md) section 4 is a WCAG 2.1 AA audit covering the checklist below. Treat it with care: its remediation list names `CreateMailboxPage` and `ViewMailboxPage`, screens removed with the mailbox model, so it describes an application that no longer exists. Nothing is automated - no axe, no Lighthouse, no E2E suite - so nothing re-checks any of this on a change. The UX audit of 2026-08-29 covered heading structure and touch targets only.

- [ ] WCAG 2.1 AA compliance check
- [ ] Screen reader testing
- [ ] Keyboard navigation (where applicable)
- [ ] Color contrast verification
- [ ] Touch target sizes (44x44px minimum)
- [ ] Low-bandwidth testing

### 10.5 Performance Verification

> **Not done.** No performance verification has been run. No Lighthouse audit, no bandwidth testing, no measured API latency.

- [ ] Lighthouse audit (mobile)
- [ ] Page load < 3 seconds on 3G
- [ ] Time to interactive < 5 seconds on 3G
- [ ] API response time < 500ms p95
- [ ] Database query optimization

### 10.6 Error Handling

> **Shipped.** Error middleware returns no stack traces outside development, and user-facing copy is translated rather than raw.

- [x] User-friendly error messages (no stack traces)
- [x] Error logging (no PII in logs)
- [x] Graceful degradation for failures

**Checkpoint:** All security audits pass; no critical vulnerabilities.

---

## Phase 11: Pilot Deployment

**Objective:** Production system live and ready for pilot participants.

### 11.1 Production Infrastructure

> **Shipped in modified form.** Production is a single EC2 instance running Docker Compose behind Caddy, not the architecture described in Phase 1. Deploy scripts are in `deploy/`. See [deployment.md](deployment.md).

- [ ] Terraform apply to production
- [ ] Verify all security controls active
- [ ] Domain configured (relayfunds.org)
- [ ] SSL certificate active
- [ ] WAF rules active
- [ ] CloudWatch alarms configured
- [ ] Backup verification (test restore)

### 11.2 Pre-Launch Checklist

> **Not done.** No pilot has run, so no pre-launch checklist was worked through.

- [ ] Final security audit sign-off
- [ ] All acceptance criteria verified
- [ ] Translations complete (English + Spanish)
- [ ] Error pages in place
- [ ] Health check endpoint working
- [ ] Monitoring dashboard ready

### 11.3 Onboarding

> **Partially shipped.** The invite and onboarding flow is built and documented in [onboarding.md](onboarding.md); no group has been onboarded.

- [ ] Create hub admin account
- [ ] Hub admin walkthrough session
- [ ] Group invitation workflow tested
- [ ] Group coordinator onboarding materials
- [ ] Support contact channel established

### 11.4 Pilot Support

> **Not done.** No pilot has run.

- [ ] Feedback collection mechanism
- [ ] Issue tracking process
- [ ] On-call support plan
- [ ] Incident response procedure

### 11.5 Documentation

> **Partially shipped.** The `docs/` directory is extensive and current. There is no end-user or operator handbook.

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

| Phase        | Checkpoint                                                           |
| ------------ | -------------------------------------------------------------------- |
| **Phase 0**  | Dev environment works; CI runs on PR                                 |
| **Phase 1**  | AWS infra deployed; all security controls verified                   |
| **Phase 2**  | Database schema complete; API structure in place                     |
| **Phase 3**  | i18n configured; language switching works                            |
| **Phase 4**  | Magic link auth works; sessions expire correctly                     |
| **Phase 5**  | Hub sees groups; groups edit profiles                                |
| **Phase 6**  | All verification methods work                                        |
| **Phase 7**  | Full funding request lifecycle works                                 |
| **Phase 8**  | Anonymous help broadcasts work; E2E encryption verified; no tracking |
| **Phase 9**  | Aggregate reports display and export correctly                       |
| **Phase 10** | All security/privacy/accessibility audits pass                       |
| **Phase 11** | Live at relayfunds.org; pilot participants onboarded                 |

---

## Risk Mitigation

| Risk                                       | Mitigation                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| Scope creep                                | Strict PRD adherence; out-of-scope logged for post-pilot                                |
| PII in free text                           | UX guidance; no "name"/"address" fields                                                 |
| Auth complexity                            | Magic link only; no passwords, no OAuth                                                 |
| Over-engineering                           | YAGNI—build only what's needed for pilot                                                |
| Cryptographic flaws                        | Use proven libraries only; no custom crypto; security audit                             |
| Contact info exposure via group compromise | Per-group invites limit exposure; invites deleted after confirmation; mandatory vetting |
| Accidental tracking                        | Audit logging disabled on anonymous routes; no IP logging                               |
| Third-party tracking                       | No external scripts/fonts/CDNs; CSP headers                                             |
| IAM over-permissioning                     | Least privilege; permission boundaries; audit                                           |
| Secrets exposure                           | Secrets Manager; no hardcoded credentials; rotation                                     |
| Database breach                            | Encryption at rest; private subnet; security group                                      |
| Misconfigured security groups              | Terraform-managed; audit; no 0.0.0.0/0 except ALB 443                                   |
| Missing audit trail                        | CloudTrail; VPC Flow Logs; log retention                                                |

---

## Out of Scope for MVP

Per the PRD, these are explicitly excluded:

- Individual accounts/registration (anonymous fire-and-forget broadcasts)
- Collection of individual contact info by Relay (inside encrypted payload)
- Server-readable messages (all broadcast payloads E2E encrypted)
- Case management
- Long-term storage of broadcasts (invites deleted after confirmation; ciphertext deleted when resolved)
- Document uploads
- Donor-facing dashboards
- Real-time chat
- Eligibility automation
- Native mobile apps
- Push notifications
- Analytics on individual usage
- Returning to view past broadcasts (post-MVP)

---

## Post-MVP Considerations

If the pilot succeeds, evaluate:

1. Multi-hub support
2. Enhanced reporting
3. Audit log viewer for admins
4. Notification preferences (opt-in email for groups)
5. Additional languages
6. Mobile app (if justified by feedback)
