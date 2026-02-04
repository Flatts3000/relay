# PRD to MVP Implementation Plan

This document outlines the implementation plan to deliver Relay's MVP as defined in the [Product Requirements Document](product_requirements_document.md).

## Overview

**Goal:** Deliver a working pilot-ready application for 1 hub and 3-5 mutual aid groups over a 30-45 day pilot.

**Approach:** Vertical slices—deliver complete, usable features end-to-end rather than building all backend then all frontend.

---

## Phase 1: Foundation

**Objective:** Authentication, database schema, and core infrastructure.

### 1.1 Database Schema

- [ ] Design and document schema (groups, users, requests, audit_log)
- [ ] Create initial migration
- [ ] Add database constraints (foreign keys, check constraints, indexes)
- [ ] Seed script for development data

**Schema considerations:**
- No recipient PII fields—enforce at schema level
- Soft deletes with `deleted_at` for recovery, scheduled purge
- Audit log table for all data modifications
- UUID primary keys (not sequential integers)

### 1.2 Authentication System

- [ ] Magic link email sending (SendGrid, AWS SES, or similar)
- [ ] Token generation and validation
- [ ] Session management (short-lived, no persistent login)
- [ ] Login/logout endpoints
- [ ] Auth middleware for protected routes

**Auth flow:**
1. User enters email
2. System sends magic link (valid 15 minutes)
3. User clicks link → session created
4. Session expires after inactivity (30 minutes)

### 1.3 User & Role Model

- [ ] User table (email, role, associated group/hub)
- [ ] Role enum: `hub_admin`, `group_coordinator`
- [ ] Role-based middleware for authorization
- [ ] API to get current user

### 1.4 Infrastructure Baseline

- [ ] Set up AWS environment (VPC, subnets, security groups)
- [ ] Provision RDS PostgreSQL instance
- [ ] Set up ECR repository
- [ ] Configure GitHub Actions for deployment
- [ ] Set up environment secrets management

---

## Phase 2: Group Registry (FR-1)

**Objective:** Hub admins can view and manage groups; groups can register and update profiles.

### 2.1 Backend

- [ ] Group model and migrations
- [ ] CRUD endpoints for groups
  - `POST /api/groups` (create/register)
  - `GET /api/groups` (list, hub admin only)
  - `GET /api/groups/:id` (detail)
  - `PATCH /api/groups/:id` (update own group)
- [ ] Input validation with Zod schemas
- [ ] Authorization checks (group can only edit own profile)

**Group fields:**
- `id` (UUID)
- `name` (string, can be pseudonymous)
- `service_area` (string, city/region)
- `aid_categories` (array: rent, food, utilities, other)
- `contact_email` (string, role-based)
- `verification_status` (enum: pending, verified, revoked)
- `created_at`, `updated_at`, `deleted_at`

### 2.2 Frontend

- [ ] Group registration form
- [ ] Group profile view/edit page
- [ ] Hub admin: groups list view
- [ ] Hub admin: group detail view
- [ ] Mobile-responsive layouts (44px touch targets)

### 2.3 Testing

- [ ] Backend: API tests for all endpoints
- [ ] Backend: Authorization tests
- [ ] Frontend: Component tests
- [ ] E2E: Registration flow

---

## Phase 3: Verification System (FR-2)

**Objective:** Lightweight verification to establish trust.

### 3.1 Backend

- [ ] Verification request model
- [ ] Verification methods:
  - Hub admin direct approval
  - Peer attestation (2 verified groups)
  - Sponsor reference
- [ ] Endpoints:
  - `POST /api/groups/:id/verification` (request verification)
  - `GET /api/verification-requests` (hub admin)
  - `POST /api/verification-requests/:id/approve` (hub admin)
  - `POST /api/verification-requests/:id/deny` (hub admin)
- [ ] Status transitions and validation

### 3.2 Frontend

- [ ] Group: request verification UI
- [ ] Group: verification status display
- [ ] Hub admin: verification queue
- [ ] Hub admin: approve/deny actions
- [ ] Peer attestation flow (select 2 groups to vouch)

### 3.3 Testing

- [ ] All verification paths tested
- [ ] Edge cases (already verified, revoked, etc.)

---

## Phase 4: Funding Request Workflow (FR-3)

**Objective:** Groups submit requests, hubs review and act.

### 4.1 Backend

- [ ] Funding request model and migrations
- [ ] Endpoints:
  - `POST /api/requests` (create, verified groups only)
  - `GET /api/requests` (list, filtered by role)
  - `GET /api/requests/:id` (detail)
  - `POST /api/requests/:id/approve` (hub admin)
  - `POST /api/requests/:id/decline` (hub admin)
  - `POST /api/requests/:id/clarify` (hub admin)
- [ ] Status machine: submitted → approved/declined
- [ ] Validation: no PII in justification (guidance, not blocking)

**Request fields:**
- `id` (UUID)
- `group_id` (FK)
- `amount` (decimal)
- `category` (enum: rent, food, utilities, other)
- `urgency` (enum: normal, urgent)
- `region` (string, from group profile)
- `justification` (text, optional)
- `status` (enum: submitted, approved, declined)
- `decline_reason` (text, optional)
- `created_at`, `updated_at`

### 4.2 Frontend

- [ ] Group: new request form
  - Amount, category, urgency inputs
  - Justification with privacy guidance tooltip
- [ ] Group: request history list
- [ ] Group: request detail view
- [ ] Hub admin: request queue (filterable, sortable)
- [ ] Hub admin: approve/decline/clarify actions
- [ ] Mobile-optimized card layouts

### 4.3 Testing

- [ ] Request lifecycle tests
- [ ] Authorization (only own group's requests visible)
- [ ] Filter and sort functionality

---

## Phase 5: Payout Status Tracking (FR-4)

**Objective:** Track funds through to acknowledgment.

### 5.1 Backend

- [ ] Extend request model with payout status
- [ ] Status machine: approved → funds_sent → acknowledged
- [ ] Endpoints:
  - `POST /api/requests/:id/mark-sent` (hub admin)
  - `POST /api/requests/:id/acknowledge` (group)
- [ ] Timestamp tracking for each status change

### 5.2 Frontend

- [ ] Status badges with timestamps
- [ ] Hub admin: "Mark as Sent" action
- [ ] Group: "Acknowledge Receipt" action
- [ ] Status history timeline view

### 5.3 Testing

- [ ] Full status lifecycle
- [ ] Cannot skip states
- [ ] Correct actor for each transition

---

## Phase 6: Aggregate Reporting (FR-5)

**Objective:** Hub-level metrics without individual details.

### 6.1 Backend

- [ ] Reporting queries (aggregates only)
- [ ] Endpoints:
  - `GET /api/reports/summary` (totals by category)
  - `GET /api/reports/groups` (count supported)
  - `GET /api/reports/timing` (avg time to funding)
- [ ] Date range filtering
- [ ] CSV export endpoint

### 6.2 Frontend

- [ ] Reports dashboard (hub admin only)
- [ ] Summary cards (total funds, groups, requests)
- [ ] Category breakdown chart
- [ ] Date range picker
- [ ] Export to CSV button

### 6.3 Testing

- [ ] Aggregation accuracy
- [ ] No individual request data exposed
- [ ] Export format validation

---

## Phase 7: Polish & Hardening

**Objective:** Production readiness.

### 7.1 Security Audit

- [ ] Input validation review
- [ ] SQL injection testing
- [ ] XSS testing
- [ ] Auth token security review
- [ ] Rate limiting on sensitive endpoints
- [ ] CORS configuration review

### 7.2 Error Handling

- [ ] User-friendly error messages
- [ ] Error logging (no PII in logs)
- [ ] Graceful degradation

### 7.3 Accessibility

- [ ] WCAG 2.1 AA audit
- [ ] Screen reader testing
- [ ] Keyboard navigation
- [ ] Color contrast verification

### 7.4 Performance

- [ ] Lighthouse audit
- [ ] Database query optimization
- [ ] API response time verification (<500ms p95)

### 7.5 Documentation

- [ ] API documentation
- [ ] User guide for hub admins
- [ ] User guide for group coordinators
- [ ] Deployment runbook

---

## Phase 8: Pilot Deployment

**Objective:** Live system ready for pilot participants.

### 8.1 Infrastructure

- [ ] Production Terraform apply
- [ ] SSL certificate (ACM)
- [ ] Domain configuration (relayfunds.org)
- [ ] Monitoring and alerting setup
- [ ] Backup configuration

### 8.2 Onboarding

- [ ] Create hub admin account
- [ ] Hub admin walkthrough
- [ ] Group invitation workflow
- [ ] Group coordinator onboarding materials

### 8.3 Pilot Support

- [ ] Feedback collection mechanism
- [ ] Issue tracking process
- [ ] Support contact channel

---

## Success Checkpoints

Before moving to the next phase, verify:

| Checkpoint | Criteria |
|------------|----------|
| **Phase 1 Complete** | Can log in via magic link, session works, DB connected |
| **Phase 2 Complete** | Group can register, hub can view groups |
| **Phase 3 Complete** | Group can get verified through any method |
| **Phase 4 Complete** | Full request submission and review cycle works |
| **Phase 5 Complete** | Request can go from submitted to acknowledged |
| **Phase 6 Complete** | Hub admin can view aggregate reports |
| **Phase 7 Complete** | Security audit passed, accessibility verified |
| **Phase 8 Complete** | Live at relayfunds.org, first hub onboarded |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Scope creep | Strict adherence to PRD; out-of-scope requests logged for post-pilot |
| PII in free text | UX guidance, field labels, no "name"/"address" fields; review logs |
| Auth complexity | Magic link only, no passwords, no OAuth initially |
| Over-engineering | YAGNI—build only what's needed for pilot |

---

## Out of Scope for MVP

Per the PRD, these are explicitly not included:

- Individual aid applications
- Case management
- Recipient data storage
- Document uploads
- Donor-facing dashboards
- Messaging or chat
- Eligibility automation
- Native mobile apps
- Push notifications

---

## Post-MVP Considerations

If the pilot succeeds, evaluate:

1. Multi-hub support
2. Enhanced reporting
3. Audit log viewer for admins
4. Notification preferences
5. Mobile app (if justified by pilot feedback)
