# Decision: Authentication Approach

## Context

Relay requires authentication to distinguish hub admins from group coordinators and to protect access to funding workflows. However, the project has strong data minimization principles.

## Decision

**Email-based magic link authentication for operators (hub admins and group coordinators).**

## Rationale

### PII Constraints Apply to Recipients, Not Operators

The PRD's privacy constraints protect **aid recipients**—the vulnerable individuals receiving assistance. Operators (hub admins, group coordinators) are system users who manage coordination, not recipients of aid.

The PRD explicitly includes operator data:
- "Contact method (role-based email)" for groups
- User accounts with roles for access control

### Why Magic Links

| Requirement | How Magic Links Address It |
|-------------|---------------------------|
| No passwords | Nothing to store, nothing to breach |
| Shared devices | No persistent login; works from any device |
| Low friction | Click a link, you're in |
| Email-based access | Aligns with PRD's "email/link-based access only" |

### Minimization Practices

Even for operators, we minimize data:

1. **Role-based emails encouraged** — UX copy prompts "Use a group email like treasurer@yourgroup.org"
2. **Minimal fields** — Only email and role stored; no names required
3. **Short sessions** — 30-minute inactivity timeout, no "remember me"
4. **Retention limits** — Inactive accounts purged after defined period
5. **No third-party auth** — No OAuth/social login that would expand data surface

## Implementation

### Auth Flow

```
1. User enters email
2. System generates time-limited token (15 min expiry)
3. System sends email with magic link
4. User clicks link → token validated → session created
5. Session expires after 30 min inactivity
6. User can explicitly log out
```

### Data Stored

| Field | Purpose | Retention |
|-------|---------|-----------|
| `email` | Authentication, notifications | Until account deleted |
| `role` | Authorization (hub_admin, group_coordinator) | Until account deleted |
| `group_id` or `hub_id` | Association | Until account deleted |
| `created_at` | Audit | Until account deleted |
| `last_login_at` | Inactive account cleanup | Until account deleted |

### What Is NOT Stored

- Passwords
- Personal names (optional, not required)
- Phone numbers
- Physical addresses
- Social login tokens
- Device fingerprints

## Alternatives Considered

### Invite Links (No Email Storage)

Hub generates unique links for each group. No email stored.

**Rejected because:**
- No way to recover access if link is lost
- Can't send notifications
- Link sharing creates security risk
- Revocation is complex

### Passkeys/WebAuthn

Device-bound authentication with no email after setup.

**Rejected because:**
- Doesn't work well on shared devices (key pilot requirement)
- Browser support still inconsistent
- Recovery flow requires fallback anyway

### OAuth/Social Login

Use Google, GitHub, etc. for authentication.

**Rejected because:**
- Expands data surface to third parties
- May feel invasive for mutual aid context
- Adds dependency and complexity

## Security Considerations

- Magic link tokens are single-use
- Tokens expire after 15 minutes
- Sessions are server-side, not JWT (revocable)
- Rate limiting on login requests
- Audit log of all authentication events

## UX Copy

Login page should include:

> "Enter your group's contact email. We recommend using a role-based address like treasurer@yourgroup.org rather than a personal email."

## Conclusion

Email-based magic link authentication balances security, usability, and data minimization. It respects the project's privacy principles while providing necessary access control for the pilot.
