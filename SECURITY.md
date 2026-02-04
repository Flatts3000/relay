# Security Policy

## Reporting a Vulnerability

Security is critical to this project. Relay handles coordination for mutual aid groups, and any vulnerability could put vulnerable communities at risk.

**Do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via GitHub's private vulnerability reporting:

1. Go to the [Security tab](https://github.com/Flatts3000/relay/security) of this repository
2. Click "Report a vulnerability"
3. Provide details about the vulnerability

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 7 days
- **Resolution target**: Depends on severity, but we prioritize security issues

## Security Considerations

This project is designed with the following security principles:

### Data Minimization
- No individual recipient data is collected
- Only group-level information is stored
- Short retention periods for request details

### Assume Breach
- Architecture assumes any stored data could be subpoenaed or leaked
- No sensitive data that could harm individuals if exposed

### Defense in Depth
- Input validation on all user inputs
- Parameterized queries (no SQL injection)
- Output encoding (no XSS)
- Role-based access control enforced server-side
- Audit logging for accountability

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |

## Security Updates

Security updates will be released as soon as possible after a vulnerability is confirmed. Watch the repository for notifications.
