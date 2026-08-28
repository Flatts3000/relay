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

See [Deployment](docs/deployment.md) for what actually runs. The Terraform in `/infra` has never been applied and should be treated as an unrealized target, not a description of production. Reconciling the two is tracked in #7.

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

# Start development servers
npm run dev
```

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
