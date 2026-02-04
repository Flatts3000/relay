# Contributing to Relay

Thank you for your interest in contributing to Relay. This project exists to support mutual aid coordination, and we welcome contributions that align with that mission.

## Before You Start

Please read:
- [README.md](README.md) — Project overview
- [docs/problem_brief.md](docs/problem_brief.md) — The problem we're solving
- [docs/product_requirements_document.md](docs/product_requirements_document.md) — Detailed requirements
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — Community standards

## Core Principles

Contributions must respect these non-negotiable constraints:

1. **No individual recipient data** — Never add features that collect PII about aid recipients
2. **Group-level only** — All functionality operates at the mutual aid group level
3. **Privacy by design** — Assume any stored data could be subpoenaed or leaked
4. **Security first** — No shortcuts that compromise data integrity or security

## How to Contribute

### Reporting Issues

- Check existing issues before creating a new one
- Use issue templates when available
- Include steps to reproduce for bugs
- Be specific about expected vs actual behavior

### Suggesting Features

- Open an issue to discuss before implementing
- Explain the use case and how it aligns with project goals
- Features that expand data collection will likely be declined

### Pull Requests

1. Fork the repository
2. Create a feature branch from `main`
3. Make your changes
4. Write or update tests as needed
5. Ensure all tests pass
6. Submit a pull request

#### PR Guidelines

- Keep PRs focused on a single change
- Write clear commit messages
- Update documentation if needed
- Link related issues

### Code Style

- TypeScript for all code
- Run linting before committing
- Follow existing patterns in the codebase

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/relay.git
cd relay

# Install dependencies
npm install

# Start development
npm run dev

# Run tests
npm test
```

## Questions?

Open an issue with the "question" label.

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 license.
