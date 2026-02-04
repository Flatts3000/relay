# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Relay** (relayfunds.org) is a coordination layer connecting local mutual aid groups with centralized fund hubs. It solves a coordination, discovery, and trust problem—not a fundraising problem.

**Current state:** Development ready. Tech stack finalized, pilot planning complete.

## The Core Problem

Local mutual aid groups lack a safe, low-friction way to connect with fund hubs, while hubs lack a safe way to identify and trust local groups—without collecting sensitive personal data or creating risk for vulnerable people.

## Key Constraints (Non-Negotiable)

### No individual-level data
- No lists of people seeking aid
- No personally identifying recipient data
- No sensitive data retention
- Assume data could be subpoenaed, leaked, or scraped
- Data minimization by default

### Group-level only
- Trust and accountability live at the group level
- Distribution decisions remain local
- Groups submit requests on behalf of their work, not individuals

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

## Repository Structure

```
/frontend    # React + Vite application
/backend     # Express API server
/infra       # Terraform configurations
/docs        # Project documentation
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

## Explicitly Out of Scope

- Individual aid applications
- Case management
- Recipient data storage
- Document uploads
- Donor-facing dashboards
- Messaging or chat
- Automation of eligibility decisions

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
| **Local Group** | Informal/semi-formal, deep local knowledge, needs fast fund access |
| **Verifier** | Existing org, peer group, or intermediary providing attestation |

## Success Criteria

- Groups connect without relying on personal introductions
- Hub reviews and routes funds with less back-and-forth
- Funds move faster than before
- Feels safer than ad hoc tools
- No one asks for recipient data because the system doesn't need it

## Documentation

- `/docs/product_requirements_document.md` - Full PRD with functional/non-functional requirements
- `/docs/problem_brief.md` - Core problem and constraints
- `/docs/pilot_proposal.md` - Pilot scope and success criteria
- `/docs/decision_mobile_app_vs_web_app.md` - Platform decision rationale
- `/docs/naming_and_domain_decision.md` - Naming and branding principles
