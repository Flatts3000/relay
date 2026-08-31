# Security audit, 2026-08-30

**Scope:** the deployed public surface and the application code behind it. HTTP
security headers, dependency posture, authentication, authorization, rate
limiting, input handling, and the privacy guarantees `CLAUDE.md` treats as
non-negotiable.

**Method.** Live probing of the production build served by
`deploy/nginx.prod.conf` and `frontend/nginx.conf` in real nginx containers,
against a running backend with a seeded database. Plus `npm audit`, the
Dependabot API, and code review of the authentication, authorization, rate
limiting and data access paths.

**Relationship to `docs/security_audit.md`:** that document is the design-level
self-audit. This one is a point-in-time review of what is actually running and
what is actually committed. Where they disagree, this document is describing
observed behavior.

---

## Remediation status

All six findings were fixed in the same branch as this audit. The findings below
are left as written, because the record of what was wrong is the point of an
audit; this section says what happened to each.

|                                             | Status                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SEC-1** CSP never reaches the document    | **Fixed.** `Content-Security-Policy` now set on the HTML in both nginx configs, at server level and repeated inside `location ^~ /deck` (an `add_header` in a location drops every inherited one). Verified in a container: present on `/` and `/deck/`, zero CSP violations across four pages, and the home page's `fetch` to formspree.io still permitted by `connect-src`.                                                                |
| **SEC-2** stale lockfile, 28 phantom alerts | **Fixed.** `frontend/package-lock.json` deleted.                                                                                                                                                                                                                                                                                                                                                                                             |
| **SEC-3** third-party fonts (#80)           | **Fixed.** The four faces plus Inter 500 are served from this origin; the `<link>`s to `fonts.googleapis.com` and the `preconnect`s are gone. Verified: zero third-party hosts across `/`, `/directory` and a static page, all four Inter weights loading from origin.                                                                                                                                                                       |
| **SEC-4** enumerable rate-limit hash        | **Fixed.** `createHmac` keyed on a random secret generated at boot, replacing the clock-derived salt. The comment now matches what the code does.                                                                                                                                                                                                                                                                                            |
| **SEC-5** no `Permissions-Policy`           | **Fixed.** Set alongside the CSP in both configs.                                                                                                                                                                                                                                                                                                                                                                                            |
| **SEC-6** every path returns 200            | **Fixed for anything with a file extension**, which is the class that gets probed. No route in `App.tsx` contains a dot, so a path with an extension is never an app route; if the file is absent it now 404s. Extensionless typos still reach the app, and the not-found view now carries `noindex`. Verified: `/nope.txt` 404, `/llms.txt` 200 (it exists now), `/robots.txt` and `/sitemap.xml` still 200, assets still immutably cached. |
| **Informational:** the two configs drift    | **Guarded.** `deploy/check-nginx-parity.mjs` compares six security directives plus the CSP value across both files, and CI runs it. Verified by tampering: removing the CSP from one file and changing it in one file both fail the check.                                                                                                                                                                                                   |

---

## Summary

The application code is in better shape than the delivery layer. Token handling,
authorization, rate limiting and query construction are all done properly and
with unusually clear reasoning in the comments. The findings concentrate in two
places: a strict Content Security Policy that is configured but never reaches
the document it is meant to protect, and a dependency-alerting channel that has
been reduced to noise by a single stale file.

Nothing here is evidence of compromise. There is no exposed secret, no injection
path, and no missing authorization check found in this pass.

---

## HIGH

### SEC-1: The strict CSP is configured, and never reaches a browser that could use it

**Files:** `backend/src/app.ts:47-84`, `deploy/Caddyfile:10-16`, `deploy/nginx.prod.conf`

`backend/src/app.ts` configures helmet with a genuinely strict policy, and it
works. Observed on a live API response:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none';
  frame-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; ...
```

That header is served on `/api/*` responses, which are JSON. JSON does not
execute scripts, load fonts or embed frames, so the policy governs almost
nothing there.

The HTML document is served by nginx and fronted by Caddy, neither of which sets
a CSP. Observed on `/what-is-relay/` and on the application shell: **no
`Content-Security-Policy` header at all.** Caddy contributes four headers and
stops short of this one:

```
X-Content-Type-Options nosniff
X-Frame-Options DENY
Referrer-Policy strict-origin-when-cross-origin
Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
```

So the surface that can execute script has no CSP, and the surface that cannot
has a strict one. That is exactly inverted.

**Why it matters here specifically.** Relay's client-side encryption is the
product. `frontend/src/utils/broadcast-crypto.ts` and `group-key.ts` derive a
group key from a coordinator passphrase in the browser and decrypt help requests
there. A CSP is the control that stops injected script from reading that
material. Its absence does not create an XSS, but it removes the mitigation that
matters most given where the secrets live.

It is also load-bearing for a defect already filed. The policy's own
`font-src 'self'` would have blocked the third-party font loading in
[#80](https://github.com/Flatts3000/relay/issues/80) outright, and made it fail
loudly instead of silently.

**Remediation:**

1. Set the CSP on the HTML document, in `deploy/Caddyfile` so it covers
   everything Caddy fronts, or in the nginx configs. Both nginx configs, if
   there, because they drift (see the note under SEC-6).
2. Start in `Content-Security-Policy-Report-Only` and confirm the application
   loads clean, since the SPA's inline styles and Vite's output will need
   `style-src 'unsafe-inline'` at minimum.
3. Closing #80 first makes this simpler: with fonts self-hosted, `font-src
'self'` needs no exception.
4. Add `Permissions-Policy` in the same change (SEC-5).
5. Verify with `curl -D -` against the real HTML, not against `/api`.

---

## MEDIUM

### SEC-2: A stale lockfile has turned Dependabot into noise, including one critical alert

**File:** `frontend/package-lock.json`

Every push to this repository prints a warning of 28 vulnerabilities, 1
critical. Meanwhile CI's own Security Audit job is green:

```
npm audit --audit-level=moderate   ->  0 vulnerabilities
npm audit --audit-level=high       ->  0 vulnerabilities
Dependabot, open alerts            ->  28 (1 critical, high and medium)
```

Both are correct, and the reason they disagree is a single orphaned file.

This is an npm workspaces monorepo. `package.json` declares
`"workspaces": ["frontend", "backend"]`, CI installs with `npm ci` at the root,
and the root `package-lock.json` is what governs. `backend/package-lock.json`
does not exist. `frontend/package-lock.json` does, was committed exactly once in
February 2026 in `ffbccd5`, and has not been touched since.

Every one of the 28 open alerts names `frontend/package-lock.json`. They are all
phantom:

| Package                     | Stale lockfile | Actually installed |
| --------------------------- | -------------- | ------------------ |
| vitest (**critical** alert) | 1.6.1          | 4.1.11             |
| vite (high alert)           | 5.4.21         | 8.2.2              |

The alerts describe versions that are not installed, cannot be installed by
`npm ci`, and are not shipped. Note also that they are all build and test
tooling; none of them is a runtime dependency of the deployed server.

**Why a noise finding is rated MEDIUM.** The consequence is not the phantom
alerts, it is what they do to the channel. A repository permanently displaying
"28 vulnerabilities, 1 critical" teaches everyone who sees it that the number is
meaningless, and the next alert, the real one against the root lockfile, arrives
into that habit. For a project whose entire proposition is that its claims are
checkable, a security indicator that is confidently wrong is worse than one that
is absent.

**Remediation:**

1. Delete `frontend/package-lock.json`. It governs nothing; `npm ci` at the root
   never reads it.
2. Confirm the alert count drops to zero and that `npm ci` and CI are unaffected.
3. Consider a CI guard that fails if a lockfile appears in a workspace
   directory, since this recurred silently for six months.

### SEC-3: Anonymous visitors are disclosed to a third party on every page load

Filed as [#80](https://github.com/Flatts3000/relay/issues/80). Summarized here
so this audit is complete.

`frontend/index.html:39-41` loads webfonts from `fonts.googleapis.com` and
`fonts.gstatic.com`. Confirmed empirically against the production build: `/` and
`/directory` each make requests to both hosts. Every anonymous visitor's IP,
`User-Agent` and `Referer` reach Google before any application code runs.

This contradicts `CLAUDE.md` ("No tracking of who browses the public directory")
and the published Security page copy at
`frontend/src/locales/en/common.json:172` and `:194`.

**Stated precisely, because the distinction matters:** Relay itself collects
nothing here, and a font stylesheet is arguably not "an analytics or tracking
script." What is not arguable is that the markup hands a third party a per-visit
record of who browsed an anonymous page.

The four static pages added in #78 make **zero** third-party requests and
already self-host the faces under `frontend/public/fonts/`. The application can
point at the same files; it needs Inter 500 added to the build first.

---

## LOW

### SEC-4: The anonymous rate-limit hash is reversible by enumeration

**File:** `backend/src/middleware/rate-limit.ts:63-74`

```js
const timeSlot = Math.floor(Date.now() / (5 * 60 * 1000));
const salt = `relay-anon-${timeSlot}`;
return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 16);
```

The comment above it reads "CRITICAL: We NEVER store the raw IP address."

That is true, and the protection is weaker than the wording suggests. The salt is
derived from the clock, not from a secret, and the code is public, so the salt is
known to anyone. The IPv4 space is 2^32, which is trivially enumerable, so anyone
holding these hashes can recover the addresses by brute force in seconds, or
confirm whether a specific address is present.

**The realistic risk is genuinely low**, and this is rated accordingly: the map
is in process memory only, is never written to disk or to the database, and
expires in five to fifteen minutes. An adversary who can read the process memory
of the API already has far more than this.

It is worth fixing anyway because of what the comment claims. This project's
credibility rests on its security statements being exactly true, and a reader who
checks this one finds it overstated.

**Remediation:** generate a random secret at boot and use `createHmac` keyed on
it instead of a predictable string salt. The key never leaves memory, rotation
on restart is harmless because the windows are minutes long, and the result is
genuinely irreversible rather than merely opaque. Roughly a two-line change, and
the comment then becomes accurate.

### SEC-5: No `Permissions-Policy` header

**File:** `deploy/Caddyfile:10-16`

Four security headers are set and this one is absent, so the document does not
disable camera, microphone, geolocation, or payment APIs it never uses.

Low impact, since nothing in Relay requests those permissions, but it is
defence in depth for exactly the scenario SEC-1 is about: injected script in a
page that handles decrypted help requests.

**Remediation:** add to the Caddy header block alongside the CSP from SEC-1:
`Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()"`.

### SEC-6: Every nonexistent URL returns 200, so 404s cannot be monitored

Covered as S-2 in `seo_audit_2026_08_30.md`, where the impact is larger. The
security-relevant half: the 404 rate is structurally zero, so scanning and
enumeration against this host produce a clean 200 for every probe and there is
nothing for an alert to key on. Given [#2](https://github.com/Flatts3000/relay/issues/2)
records that there is no monitoring or alerting at all, this compounds.

---

## Informational

**A private key lives in the working tree, correctly excluded.**
`deploy/relay-prod.pem` is an OpenSSH private key. It is matched by `.gitignore:81`
(`*.pem`), is not tracked, and `git log --all -- deploy/relay-prod.pem` returns
zero commits, so it has never been committed at any point in history. **This is
not an exposure.** It is noted only because a single `git add -f`, or a
contributor with a different ignore setup, would change that, and because the
file is the production host's SSH key.

**The two nginx configs drift, and it has now happened twice.**
`frontend/nginx.conf` ships inside the image; `deploy/nginx.prod.conf` is
bind-mounted over it in production. Commit `f01ac7e` exists because an access-log
privacy fix landed in one and not the other, and #78's review caught the same
pattern again with `absolute_redirect`. Both are fixed. The structural issue
remains: two files that must agree, with nothing checking that they do. A CI diff
of the security-relevant directives from both files would close it. Worth an
issue.

---

## What is strong

Stated with the same evidence standard as the findings, because a security audit
that only lists problems misrepresents the system.

- **Token handling is correct and well reasoned.** `backend/src/utils/crypto.ts`
  generates 32 bytes of CSPRNG output and stores only a SHA-256 hash. The comment
  explains precisely why a fast hash is right here (the input is already
  high-entropy, so salting and stretching buy nothing) and what it buys (a
  database copy is not a set of working credentials). That is the correct
  analysis, not a cargo-culted one.
- **Authorization is resource-level, not just role-level.**
  `backend/src/middleware/auth.ts` provides `requireRole`, and also
  `requireGroupMember` and `requireHubMember`, which check membership of the
  specific resource in the path. That is the control that prevents IDOR, and it
  exists. No missing check was found in this pass.
- **Middleware ordering deliberately protects the anonymous routes.** In
  `backend/src/app.ts`, `/api/broadcasts` and `/api/directory` are mounted
  _before_ both `authRateLimiter` and `auditMiddleware`, with a comment marking
  it critical. The privacy guarantee is enforced by construction rather than by
  per-route discipline.
- **The rate limiter carries a scar and the reason for it.** The strict login
  limiter is applied to `/login` and `/verify` only, because mounting it on the
  whole auth router locked coordinators out through `/me` on normal page loads,
  worse behind shared addresses. The comment records this.
- **Query construction is parameterized throughout.** All SQL goes through
  Drizzle's tagged templates and helpers; interpolated values are bound
  parameters. No string-concatenated SQL was found, including in the admin search
  path, which uses `ilike()` rather than manual concatenation.
- **Input is bounded and validated.** `express.json({ limit: '10kb' })` and Zod
  schemas in `backend/src/config.ts` and the route layer.
- **`trust proxy` is set to a hop count**, not `true`. Setting it to `true` makes
  a client-supplied `X-Forwarded-For` authoritative and lets any caller forge
  their rate-limit identity; the code has a comment showing the author knew that.
- **`npm audit` is genuinely clean** on the real dependency tree, production and
  dev, at every severity.
- **CI runs real security tooling on every PR**: CodeQL, Trivy container
  scanning, `npm audit` at two thresholds, and a migrations job that diffs the
  applied schema against the definitions.

## Priority order

1. **SEC-2**, delete the stale lockfile. Smallest change, and it restores a
   security channel that is currently dead.
2. **SEC-3** / #80, self-host the fonts. Fixes a live privacy leak and unblocks
   the next item.
3. **SEC-1**, put the CSP on the document. The largest real gain.
4. **SEC-4**, HMAC the rate-limit key, and correct the comment.
5. **SEC-5**, `Permissions-Policy`, alongside SEC-1.
6. **SEC-6**, real 404s.

## Not covered

No penetration testing, no authenticated session testing, and no review of the
signed-in application (dashboard, funding requests, verification queue, admin).
The client-side cryptography was not re-reviewed: it had an independent expert
review whose write-up is still missing from the repository, which is
[#14](https://github.com/Flatts3000/relay/issues/14) and remains the one claim in
the deck a reader cannot check for themselves. The infrastructure gaps in
`CLAUDE.md`'s control table, notably the static IAM key
([#11](https://github.com/Flatts3000/relay/issues/11)) and absent monitoring
([#2](https://github.com/Flatts3000/relay/issues/2)), are already tracked and
were not re-examined here.
