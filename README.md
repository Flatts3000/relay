# Relay

Coordination platform connecting mutual aid groups with fund hubs—safely, quickly, and without collecting individual recipient data.

## Overview

Relay is a minimal coordination layer that enables local mutual aid groups to connect with centralized fund hubs. It solves a coordination, discovery, and trust problem—not a fundraising problem.

**This is not:**

- A case-management system
- A benefits application platform
- A donor-facing marketplace
- A surveillance-friendly database

## Project Status

**Paused. Not ready for use.** Last active development was February 2026.

A demonstration deployment exists at relayfunds.org, but its API is currently returning errors on every route, so the application is not functional. There is no pilot running and no production data.

Anyone evaluating or forking this project should read the [open issues](https://github.com/Flatts3000/relay/issues) first. The most significant are the production outage (#1), 20 unpatched dependency advisories (#3), disabled CI (#5), and a superseded anonymous-intake path that is still wired up (#15).

## Features

- **Group Registry** — Private, invite-only registry of participating mutual aid groups
- **Lightweight Verification** — Trust establishment without invasive documentation
- **Funding Requests** — Group-level (not individual) funding request workflow
- **Status Tracking** — Simple payout status tracking (submitted → approved → sent → acknowledged)
- **Aggregate Reporting** — Hub-level metrics without per-person data

## Tech Stack

| Layer          | Technology                               |
| -------------- | ---------------------------------------- |
| Frontend       | React + Vite + TypeScript + Tailwind CSS |
| Backend        | Node.js + Express + TypeScript           |
| Database       | PostgreSQL                               |
| E2E encryption | TweetNaCl.js                             |
| i18n           | react-i18next (English, Spanish)         |

Infrastructure is documented separately, because what is deployed differs from what `/infra` describes:

| Layer    | Deployed today                                | Described in `/infra`               |
| -------- | --------------------------------------------- | ----------------------------------- |
| Compute  | Single EC2 instance running Docker Compose    | AWS Fargate                         |
| Database | PostgreSQL container on a local Docker volume | AWS RDS with customer-managed KMS   |
| Edge     | Caddy on the instance                         | Application Load Balancer + AWS WAF |
| Secrets  | Environment file on the host                  | AWS Secrets Manager                 |
| CI/CD    | None. GitHub Actions is disabled              | GitHub Actions                      |

The single-host deployment is the chosen architecture, decided 2026-08-28. See [Deployment](docs/deployment.md) for what runs and how. The Terraform in `/infra` has never been applied and is kept only as a design sketch should the deployment ever outgrow one host.

## Repository Structure

```
/frontend    # React + Vite application
/backend     # Express API server
/deploy      # Scripts and Compose files for the deployment that actually runs
/infra       # Terraform configurations (target architecture, never applied)
/docs        # Project documentation
```

## Development

Prerequisites:

- Node.js 20+
- Docker
- PostgreSQL (local) or Docker Compose

```bash
# Install dependencies
npm install

# Start the databases
docker compose -f docker-compose.dev.yml up -d

# Apply the schema (see below - use migrate, not push)
npm run db:migrate --workspace=backend

# Start development servers
npm run dev
```

### Database schema

**Use `npm run db:migrate`, not `db:push`.** Both appear to bring a database up
to date and only one of them is what production gets.

`push` diffs the live database against the TypeScript schema definitions and
applies the difference. It does not update a CHECK constraint whose expression
has changed: with the constraint already present it leaves the old one in place
and reports success. A long-lived development database therefore keeps the
weaker constraint while production, built by `migrate`, gets the intended one -
and a test suite passes against the weaker one. CI runs the migrations for
exactly this reason, so this is about local trust.

If your database was built with `push` and `migrate` now fails with
`type ... already exists`, it has no migration history to continue from. Recreate
it:

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
npm run db:migrate --workspace=backend
```

Hand-written migrations need a matching entry in `drizzle/meta/_journal.json`,
and the newest migration needs a `meta/NNNN_snapshot.json` so `drizzle-kit
generate` diffs against the current schema rather than a stale one.
`npm run db:check-journal` verifies both and runs in CI.

Seeding, for a database with something in it to look at:

```bash
npx tsx backend/src/db/seed-audit.ts
```

### Ports

The dev servers default to 3000 (frontend) and 4000 (backend), matching
`.env.example`, `docker-compose.yml` and the URLs in magic-link emails. To run on
different ports, export them - Vite does not read the repo-root `.env`:

```bash
FRONTEND_PORT=3021 BACKEND_URL=http://localhost:8004 npm run dev:frontend
```

and set `PORT`, `CORS_ORIGIN` and `FRONTEND_URL` in `.env` to match.

## Documentation

- [Product Requirements Document](docs/product_requirements_document.md)
- [Problem Brief](docs/problem_brief.md)
- [Pilot Proposal](docs/pilot_proposal.md)
- [Deployment](docs/deployment.md)
- [Encrypted Public Help Broadcast](docs/encrypted_public_help_broadcast.md)
- [Onboarding](docs/onboarding.md)
- [Security Audit](docs/security_audit.md)

## Privacy & Safety

Relay is designed with privacy and safety as core constraints:

- **No individual recipient data** — The system cannot collect PII about aid recipients
- **Group-level only** — All operations are at the mutual aid group level
- **Data minimization** — Collect only what's explicitly needed
- **Short retention** — Request details are purged after defined periods
- **Assume subpoena risk** — Architecture assumes any stored data could be legally compelled

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0).

This means if you modify Relay and provide it as a service over a network, you must make your modified source code available under the same license.
