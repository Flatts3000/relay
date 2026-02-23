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

- Individuals broadcast encrypted help requests to matching groups (no accounts, no persistent identity)
- Contact info included in encrypted payload — only reviewed groups can decrypt
- Client generates symmetric key, wraps per recipient group's public key
- Per-group invites deleted after confirmation or TTL expiry
- Safe-word verification code for out-of-band contact authentication
- Relay stores only ciphertext it cannot decrypt; encrypted material deleted as soon as all invites are resolved
- No IP logging on anonymous routes; no cookies for anonymous users
- If subpoenaed, Relay can only produce encrypted blobs it cannot decrypt

_Migration note: Replaces the earlier mailbox/passphrase model. See `docs/encrypted_public_help_broadcast.md`._

### Group-level operations

- Trust and accountability for fund routing live at the group level
- Distribution decisions remain local
- Groups submit funding requests on behalf of their work, not individuals
- Groups decrypt broadcast invites and contact individuals directly outside Relay
- Individuals include contact info in encrypted broadcasts; groups contact them directly using safe-word verification

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

| Layer          | Technology                       |
| -------------- | -------------------------------- |
| Frontend       | React + Vite + TypeScript        |
| Styling        | Tailwind CSS                     |
| Backend        | Node.js + Express + TypeScript   |
| Database       | PostgreSQL (AWS RDS)             |
| Compute        | AWS Fargate                      |
| Infrastructure | Terraform                        |
| CI/CD          | GitHub Actions                   |
| Containers     | Docker                           |
| i18n           | react-i18next (English, Spanish) |
| E2E Encryption | libsodium (TweetNaCl.js)         |

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

### 1. Group Registry

- Group name (can be pseudonymous)
- Service area (city/region)
- Aid categories (rent, food, utilities)
- Contact method (role-based email)
- Verification status

### 2. Public Group Directory

- Verified groups are listed in a public, searchable directory
- Browsable by anyone without authentication or account creation
- Searchable/filterable by region (city/county) and aid category
- Shows only what groups opt to make public: name, service area, aid categories, contact method
- No tracking, analytics, or cookies on directory pages
- Bilingual (English/Spanish)

### 3. Funding Request Workflow

Request fields:

- Amount requested
- Category (rent/food/utilities/etc.)
- Urgency (normal/urgent)
- Region served
- Optional justification (with UX guidance against personal details)

Hub actions: approve, decline, or ask clarifying questions

### 4. Payout Status Tracking

States only: submitted → approved → funds sent → acknowledged

No receipts, narratives, or recipient data required.

### 5. Aggregate Reporting

- Total funds by category
- Number of groups supported
- Time-to-funding averages

No per-person or per-household reporting.

### 6. Anonymous Help Broadcasts (E2E Encrypted)

Individual flow:

1. Select "Request help (anonymous)"
2. Choose coarse region and one or more aid categories
3. Write message with at least one contact method (phone / email / freeform)
4. Client encrypts payload, wraps key per recipient group — submit
5. Receipt screen: broadcast ID + safe-word verification code
6. Individual leaves. Fire-and-forget.

Group flow:

1. Unlock group key material
2. Fetch and decrypt pending invites for subscribed buckets
3. See message, contact info, and safe-word
4. Confirm receipt (10-minute auto-delete window)
5. Contact individual outside Relay using safe-word to verify

Privacy guarantees:

- No email, phone, or account required from individuals _to Relay_ (contact info is inside encrypted payload)
- Broadcasts E2E encrypted (TweetNaCl.js); Relay cannot read payloads
- Per-group invites deleted after confirmation or TTL expiry; ciphertext deleted when all invites resolved
- Safe-word verification for out-of-band contact
- No IP logging, no cookies, no tracking on anonymous routes

## Explicitly Out of Scope

- Individual accounts/registration (anonymous fire-and-forget broadcasts)
- Collection of individual contact info by Relay (contact info is inside encrypted payload that Relay cannot read)
- Server-readable messages (all broadcast payloads E2E encrypted)
- Case management
- Long-term storage of broadcasts (invites deleted after confirmation; ciphertext deleted when all invites resolved)
- Document uploads
- Donor-facing dashboards
- Real-time chat (encrypted broadcast with out-of-band contact instead)
- Automation of eligibility decisions
- Analytics on individual usage
- Returning to view past broadcasts (post-MVP, pending stakeholder confirmation)

If any become necessary, the pilot pauses for reevaluation.

## Platform Requirements

- Single-page web application (no native iOS/Android)
- Mobile-responsive with large tap targets
- No hover, right-click, or keyboard-only interactions
- No push notifications
- Works in low-bandwidth conditions
- Email/link-based access only

## Actors

| Role                    | Description                                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hub**                 | Raises pooled money, needs confidence in downstream distribution                                                                                                 |
| **Local Group**         | Informal/semi-formal, deep local knowledge, needs fast fund access; responds to anonymous help requests                                                          |
| **Community Member**    | Heard about a group or wants to find local resources; browses the public group directory without authentication or tracking                                      |
| **Individual Resident** | Person in crisis; submits anonymous encrypted broadcast with contact info and safe-word; groups contact them directly outside Relay using safe-word verification |
| **Verifier**            | Existing org, peer group, or intermediary providing attestation                                                                                                  |

## Success Criteria

- Groups connect without relying on personal introductions
- Community members can find local groups by region and category without creating an account
- Individuals can request help without providing identifying information
- Groups can receive anonymous help requests and contact individuals directly, verified by safe-word
- Hub reviews and routes funds with less back-and-forth
- Funds move faster than before
- Feels safer than ad hoc tools
- No one asks for recipient data because the system doesn't need it
- If subpoenaed, Relay has nothing useful to provide (only encrypted blobs)

## Documentation

- `/docs/product_requirements_document.md` - Full PRD with functional/non-functional requirements
- `/docs/user_personas.md` - User personas and design implications
- `/docs/prd_to_mvp_plan.md` - Implementation plan with phases and checkpoints
- `/docs/problem_brief.md` - Core problem and constraints
- `/docs/pilot_proposal.md` - Pilot scope and success criteria
- `/docs/decision_mobile_app_vs_web_app.md` - Platform decision rationale
- `/docs/decision_authentication.md` - Auth approach and PII considerations
- `/docs/naming_and_domain_decision.md` - Naming and branding principles
