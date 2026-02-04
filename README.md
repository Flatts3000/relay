# Relay

Coordination platform connecting mutual aid groups with fund hubs—safely, quickly, and without collecting individual recipient data.

## Overview

Relay is a minimal coordination layer that enables local mutual aid groups to connect with centralized fund hubs. It solves a coordination, discovery, and trust problem—not a fundraising problem.

**This is not:**
- A case-management system
- A benefits application platform
- A donor-facing marketplace
- A surveillance-friendly database

## Features

- **Group Registry** — Private, invite-only registry of participating mutual aid groups
- **Lightweight Verification** — Trust establishment without invasive documentation
- **Funding Requests** — Group-level (not individual) funding request workflow
- **Status Tracking** — Simple payout status tracking (submitted → approved → sent → acknowledged)
- **Aggregate Reporting** — Hub-level metrics without per-person data

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL |
| Infrastructure | AWS (Fargate, RDS) + Terraform |
| CI/CD | GitHub Actions |

## Repository Structure

```
/frontend    # React + Vite application
/backend     # Express API server
/infra       # Terraform configurations
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
