# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Relay** (relayfunds.org) is a coordination layer connecting local mutual aid groups with centralized fund hubs. It solves a coordination, discovery, and trust problem—not a fundraising problem.

**Current state:** Development ready. Tech stack finalized, pilot planning complete.

## The Core Problems

**1. Group-to-Hub Connection Gap**
Local mutual aid groups lack a safe, low-friction way to connect with fund hubs, while hubs lack a safe way to identify and trust local groups—without collecting sensitive personal data or creating risk for vulnerable people.

**2. Individual-to-Group Discovery Gap**
Individual residents facing housing insecurity and other urgent needs lack a centralized way to discover which mutual aid groups serve their area—without providing information that would put them in danger if obtained by federal authorities.

## Key Constraints (Non-Negotiable)

### No individual-level data
- No lists of people seeking aid
- No personally identifying recipient data
- No sensitive data retention
- No tracking of who browses the public directory
- No analytics, cookies, or logging for anonymous users
- Assume data could be subpoenaed, leaked, or scraped
- Data minimization by default

### Anonymous help requests (E2E encrypted)
- Individuals request help using only a passphrase (no email, phone, or account)
- System generates passphrase client-side; individual writes it down
- Groups see anonymous requests (category + region only) and send encrypted replies
- Messages are E2E encrypted; Relay cannot read them
- Private key derived from passphrase client-side; never transmitted
- Mailboxes auto-delete after 7 days of inactivity
- No IP logging on anonymous routes; no cookies for anonymous users
- If subpoenaed, Relay can only produce encrypted blobs it cannot decrypt

### Group-level operations
- Trust and accountability for fund routing live at the group level
- Distribution decisions remain local
- Groups submit funding requests on behalf of their work, not individuals
- Groups respond to anonymous help requests via encrypted messages
- Individuals contact groups directly outside Relay after receiving encrypted responses

### Lightweight verification
- Verification must not be onerous, invasive, or exclusionary
- Accepted methods: hub-admin approval, peer attestation, sponsor reference
- No IDs, rosters, or sensitive documents required

## What This Is NOT

- ❌ A case-management system
- ❌ A benefits application platform
- ❌ A donor-facing marketplace
- ❌ A surveillance-friendly database

## Design Principles

- Trust-based, not compliance-heavy
- Federated, not centralized
- Ephemeral where possible
- Group-first, individual-opaque
- Assume risk and design to reduce blast radius

## Development Guardrails

This is an open source project. Data integrity and security are paramount.

- No code smells or bad patterns
- Only make decisions a professional, experienced developer would make
- No hacky solutions or workarounds
- Security-first: validate inputs, sanitize outputs, use parameterized queries
- Data integrity: use transactions, enforce constraints at the database level
- No shortcuts that trade correctness for convenience

## Infrastructure Security (AWS)

- **IAM:** Least privilege; no long-lived credentials; Fargate task roles
- **Network:** VPC with private subnets; RDS not publicly accessible; security groups restrict access
- **Secrets:** AWS Secrets Manager for credentials; no hardcoded secrets; automatic rotation
- **Encryption:** KMS for RDS encryption at rest; TLS 1.3 in transit
- **Audit:** CloudTrail enabled; CloudWatch Logs; VPC Flow Logs
- **Containers:** ECR vulnerability scanning; non-root containers
- **WAF:** AWS WAF on ALB for common attack protection

## Conventions

- Files in `/docs` use `snake_case` naming (e.g., `product_requirements.md`)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (AWS RDS) |
| Compute | AWS Fargate |
| Infrastructure | Terraform |
| CI/CD | GitHub Actions |
| Containers | Docker |
| i18n | react-i18next (English, Spanish) |
| E2E Encryption | libsodium (TweetNaCl.js) |

## Repository Structure

```
/frontend    # React + Vite application
/backend     # Express API server
/infra       # Terraform configurations
/docs        # Project documentation
```

## GitHub Actions

Currently **disabled** during early development.

```bash
# Re-enable when ready for CI
gh api repos/Flatts3000/relay/actions/permissions -X PUT --input - <<< '{"enabled": true, "allowed_actions": "all"}'

# Disable again if needed
gh api repos/Flatts3000/relay/actions/permissions -X PUT --input - <<< '{"enabled": false}'
```

## Build Commands

```bash
# Install dependencies (all workspaces)
npm install

# Development
npm run dev                 # Start all dev servers
npm run dev:frontend        # Frontend only (port 3000)
npm run dev:backend         # Backend only (port 4000)

# Build
npm run build               # Build all
npm run build:frontend      # Build frontend
npm run build:backend       # Build backend

# Test
npm test                    # Run all tests
npm run test:frontend       # Frontend tests
npm run test:backend        # Backend tests

# Lint & Typecheck
npm run lint                # Lint all
npm run lint:fix            # Fix lint issues
npm run typecheck           # Typecheck all

# Docker (local)
docker compose -f docker-compose.dev.yml up    # Start PostgreSQL
docker compose up --build                       # Full stack

# Terraform
cd infra && terraform init
cd infra && terraform plan
cd infra && terraform apply
```

## Features to Build (Pilot Scope)

### 1. Group Registry (Private, Invite-Only)
- Group name (can be pseudonymous)
- Service area (city/region)
- Aid categories (rent, food, utilities)
- Contact method (role-based email)
- Verification status

### 2. Funding Request Workflow
Request fields:
- Amount requested
- Category (rent/food/utilities/etc.)
- Urgency (normal/urgent)
- Region served
- Optional justification (with UX guidance against personal details)

Hub actions: approve, decline, or ask clarifying questions

### 3. Payout Status Tracking
States only: submitted → approved → funds sent → acknowledged

No receipts, narratives, or recipient data required.

### 4. Aggregate Reporting
- Total funds by category
- Number of groups supported
- Time-to-funding averages

No per-person or per-household reporting.

### 5. Anonymous Help Requests (E2E Encrypted)
Individual flow:
1. Select "I need help" → system generates passphrase
2. Specify help type (rent, food, utilities) and region
3. Write down passphrase (only way to access responses)
4. Return later, enter passphrase, read encrypted messages from groups
5. Contact group directly using info they provided

Group flow:
1. See anonymous requests matching their service area (category + region only)
2. Send encrypted reply with contact info and how they can help
3. Cannot see other groups' replies or any identifying info

Privacy guarantees:
- No email, phone, or account required from individuals
- Messages E2E encrypted (libsodium); server cannot read
- Passphrase derives private key client-side; never transmitted
- Mailboxes auto-delete after 7 days of inactivity
- No IP logging, no cookies, no tracking on anonymous routes

## Explicitly Out of Scope

- Individual accounts/registration (passphrase-only access)
- Collection of email/phone from individuals
- Server-readable messages (all individual messages E2E encrypted)
- Case management
- Long-term storage of individual requests (mailboxes auto-delete after 7 days)
- Document uploads
- Donor-facing dashboards
- Real-time chat (async encrypted mailbox approach instead)
- Automation of eligibility decisions
- Analytics on individual usage
- Passphrase recovery (by design; would require storing identity)

If any become necessary, the pilot pauses for reevaluation.

## Platform Requirements

- Single-page web application (no native iOS/Android)
- Mobile-responsive with large tap targets
- No hover, right-click, or keyboard-only interactions
- No push notifications
- Works in low-bandwidth conditions
- Email/link-based access only

## Actors

| Role | Description |
|------|-------------|
| **Hub** | Raises pooled money, needs confidence in downstream distribution |
| **Local Group** | Informal/semi-formal, deep local knowledge, needs fast fund access; responds to anonymous help requests |
| **Individual Resident** | Person in crisis; creates anonymous mailbox with passphrase, receives encrypted responses from groups, contacts groups directly outside Relay |
| **Verifier** | Existing org, peer group, or intermediary providing attestation |

## Success Criteria

- Groups connect without relying on personal introductions
- Individuals can request help without providing identifying information
- Groups can respond to individuals in need without knowing who they are
- Hub reviews and routes funds with less back-and-forth
- Funds move faster than before
- Feels safer than ad hoc tools
- No one asks for recipient data because the system doesn't need it
- If subpoenaed, Relay has nothing useful to provide (only encrypted blobs)

## Documentation

- `/docs/product_requirements_document.md` - Full PRD with functional/non-functional requirements
- `/docs/prd_to_mvp_plan.md` - Implementation plan with phases and checkpoints
- `/docs/problem_brief.md` - Core problem and constraints
- `/docs/pilot_proposal.md` - Pilot scope and success criteria
- `/docs/decision_mobile_app_vs_web_app.md` - Platform decision rationale
- `/docs/decision_authentication.md` - Auth approach and PII considerations
- `/docs/naming_and_domain_decision.md` - Naming and branding principles
