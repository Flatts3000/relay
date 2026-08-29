# UX / UI Audit - 2026-08-29

**Scope:** all 42 routes in `frontend/src/App.tsx`, captured at 1280x800 and 390x844 against a
locally seeded database (12 groups, 18 funding requests, 4 verification requests, 4 encrypted
broadcasts, 3 roles).

**Screenshots:** generated into `docs/audit_screenshots/ux_audit/` and not committed - they go
stale as soon as the pages change, and 9 MB of regenerable PNGs does not belong in history. Reproduce
with `backend/src/db/seed-audit.ts` against a local database and a headless browser pass over the
route list below.

**Dark mode was not audited.** The codebase contains zero `dark:` utilities and Tailwind has no
`darkMode` setting, so there is nothing to score. See U-14.

**Benchmarks:**

| Surface                   | Benchmark         | Why                                                                           |
| ------------------------- | ----------------- | ----------------------------------------------------------------------------- |
| Public directory          | findhelp.org, 211 | Same job: a stranger in difficulty finding a local service fast               |
| Anonymous help request    | Signal onboarding | Same job: earn trust for a privacy claim a non-technical person cannot verify |
| Coordinator + hub console | Linear            | Same job: dense operator surface where the operator must see what needs them  |

---

## Headline

The audit found **four functional defects that make core product workflows impossible**, not
cosmetic ones. Two of them are the two things the product exists to do.

Separately, the authenticated application has **no navigation**. The staff-admin area has a
complete sidebar and is the best-built surface in the app; the coordinator and hub-admin areas -
the actual pilot users - have a header containing a logo, a language switcher, and a log-out
button. Routes that exist and work are reachable only by typing the URL.

Scores below are depressed across the console pages by that single shared cause. Fixing the
layout lifts roughly twenty pages at once, which is why it is ranked first.

---

## Functional defects found during the audit

These are bugs, not design opinions. Each was reproduced against the running app.

### B-1 (CRITICAL): no group can submit a funding request

**File:** `frontend/src/pages/NewFundingRequestPage.tsx:85`, `backend/src/routes/groups.ts:134`

`/requests/new` renders only `Only verified groups can submit funding requests`, for every
coordinator, including verified ones.

The page gates on `group.verificationStatus !== 'verified'`, reading the group from
`GET /api/groups/:id`. Verification status moved to the `group_hub_memberships` table, and that
endpoint does not return the field at all:

```
GET /api/groups/b135a3a3-...
{"group":{"id":"...","name":"Powderhorn Neighbors","serviceArea":"Minneapolis, MN",
"aidCategories":["rent","food"],"contactEmail":"...","createdAt":"...","updatedAt":"..."}}
```

`undefined !== 'verified'` is always true, so the gate always fires. The same coordinator's
dashboard says _"Your group is verified and listed in the public directory"_ in the same session,
because the dashboard reads `/api/groups/me/dashboard`, which does resolve the membership. The app
contradicts itself one click apart.

**Impact:** the funding request workflow - feature 3 of the pilot scope - cannot be started by
anyone.

### B-2 (CRITICAL): no group can ever receive an anonymous help broadcast

**Files:** `frontend/src/pages/InviteDetailPage.tsx`, `frontend/src/utils/broadcast-crypto.ts`,
`backend/src/routes/groups.ts`

`InviteDetailPage` asks the coordinator to _"Paste your group's private key (base64)"_. The product
never issues one:

- The frontend never generates a group keypair. `nacl.box.keyPair()` appears exactly once in
  `frontend/src`, at `broadcast-crypto.ts:52`, and that is the ephemeral sender key inside
  `wrapKeyForGroup`.
- There is no UI anywhere to create, display, store, or back up a group key. `Group Settings`
  contains only team members and staff invites.
- There is no backend endpoint that writes `groups.public_key`. The column is only ever read, by
  `directory.service.ts`, which filters on `isNotNull(groups.publicKey)`.

So `groups.public_key` is null for every group created through the product, every group is filtered
out of the broadcast directory, and no invite is ever generated. The inbox had rows during this
audit only because the seed script inserted keypairs directly into the database.

**Impact:** an individual in crisis can compose and submit an encrypted broadcast and receive a
safe-word receipt. No group will ever be able to read it. This is feature 6 of the pilot scope and
the headline feature in `CLAUDE.md`.

The cryptography itself is not in question here - it has been reviewed and found sound. The gap is
that key custody has no user-facing story at either end.

### B-3 (HIGH): the staff-admin Hubs page always returns 500

**File:** `backend/src/services/admin.service.ts:92`

```
GET /api/admin/hubs?page=1&limit=25 -> 500
error: column reference "id" is ambiguous
```

The correlated subquery counting groups per hub interpolates `${hubs.id}` inside a raw `sql`
template, which emits a bare `"id"`. The subquery's own `FROM` includes `groups g`, which also has
an `id`, so Postgres cannot resolve it. `/admin/hubs` is broken 100% of the time.

### B-4 (HIGH): peer attestation is unreachable for every coordinator

**Files:** `backend/src/routes/verification.ts:292`, `backend/src/services/auth.service.ts:143`

```
GET /api/verification/attestation-requests -> 400 {"error":"User is not associated with a group"}
```

The handler requires both `user.groupId` and `user.hubId`. Session enrichment sources `hubId`
exclusively from `hub_members`, and rows are only ever inserted there for hub admins
(`onboarding.service.ts:356` and `:388`). A `group_coordinator` therefore has `hubId: null` in
every possible state, so the check can never pass and `/verification/attestations` can never load.

Peer attestation is one of the three accepted verification methods in `CLAUDE.md`.

### B-5 (MEDIUM): the API rate limit is too low for ordinary use

**File:** `backend/src/middleware/rate-limit.ts:10`

100 requests per 15 minutes per IP across every non-health route. `AuthContext` calls
`/api/auth/me` on every mount, so each page navigation costs at least two requests. Paging through
the app during this audit tripped the limit and locked the session out mid-run.

The file's own comment on the login limiter notes that this user base arrives from shared addresses

- shelter and library wifi, mobile CGNAT - so the budget is per building, not per person. The same
  argument applies here with more force, because ordinary browsing is far chattier than logging in.

Made configurable via `API_RATE_LIMIT_MAX` during this audit so the capture run could complete. The
default is unchanged at 100 and should be raised separately.

---

## Page-by-page scores

Pages sharing a template are grouped. Score axes: **CE** cutting-edge, **AAA** triple-A/memorable,
**UF** user-friendly.

### Public

| Page                       | Route                           | CE  | AAA | UF  | Avg | Note                                                        |
| -------------------------- | ------------------------------- | --- | --- | --- | --- | ----------------------------------------------------------- |
| Home                       | `/`                             | 3   | 3   | 3   | 3.0 | Only page in the app with navigation                        |
| Directory                  | `/directory`                    | 2   | 2   | 2   | 2.0 | No region filter; one column; 8 results fill 2000px         |
| Request help               | `/help`                         | 2   | 2   | 2   | 2.0 | Most important page; submit button dead with no reason      |
| Login                      | `/login`                        | 3   | 2   | 3   | 2.7 | Clean, bare, no way back                                    |
| Onboarding                 | `/onboarding`                   | 2   | 2   | 2   | 2.0 | Bare error card, no next step                               |
| Privacy / Terms / Security | `/privacy` `/terms` `/security` | 3   | 2   | 3   | 2.7 | Readable; h1 to h3 skips                                    |
| Not found                  | `*`                             | 1   | 1   | 1   | 1.0 | Renders outside any layout: no header, footer, or link home |
| Design system              | `/design-system`                | 3   | 3   | 3   | 3.0 | Internal; should not ship publicly                          |

**Home - eye lands on:** the headline, correctly. But three equal-weight buttons follow, so there
is no dominant CTA. The hero is left-aligned and every section below is centered in a ~640px column
inside a 1280px viewport. Button colours alternate blue, black, blue, black with no rule.

**Directory - what findhelp would do:** filter rail on the left (region, category, open now),
results as a dense two- or three-column grid, and the primary action promoted to a real button. Here
`Contact` is a small text link at the bottom of each card and is the only action on the page - the
weakest element carrying the entire purpose. The `Verified` check has no label or tooltip, and
"verified" is the product's whole trust claim. `CLAUDE.md` requires filtering by region; there is
only free-text search.

**Request help - what Signal would do:** state the privacy claim once, prominently, in plain
language, then get out of the way. Here it is repeated four times in four styles - four lock
bullets, a shared-computer note, an orange paragraph, and a field helper - which reads as anxiety
rather than confidence. The submit button renders disabled with no indication of which of the four
required fields is missing. There is no "what happens next" and no way back to the directory.

### Group coordinator

| Page                 | Route                        | CE  | AAA | UF  | Avg | Note                                                      |
| -------------------- | ---------------------------- | --- | --- | --- | --- | --------------------------------------------------------- |
| Dashboard            | `/dashboard`                 | 2   | 2   | 2   | 2.0 | No nav; 4 pending help requests styled as a neutral stat  |
| Help inbox           | `/inbox`                     | 2   | 2   | 2   | 2.0 | No urgency, age, or TTL on requests from people in crisis |
| Invite detail        | `/inbox/:id`                 | 1   | 1   | 1   | 1.0 | Demands a private key the product never issues (B-2)      |
| New request          | `/requests/new`              | 1   | 1   | 1   | 1.0 | Blocked for everyone (B-1)                                |
| Requests list        | `/requests`                  | 3   | 2   | 3   | 2.7 | Clear; no nav                                             |
| Request detail       | `/requests/:id`              | 3   | 2   | 3   | 2.7 |                                                           |
| Group profile        | `/profile`                   | 3   | 2   | 3   | 2.7 |                                                           |
| Request verification | `/verification/request`      | 3   | 2   | 3   | 2.7 | Unreachable from any link                                 |
| Attestations         | `/verification/attestations` | 1   | 1   | 1   | 1.0 | Always 400 (B-4)                                          |
| Group settings       | `/settings/group`            | 3   | 2   | 3   | 2.7 | No key management, no profile fields                      |

**Dashboard - eye lands on** the word "Dashboard", then a green success banner. `Pending Invites: 4`
means four people have asked this group for help, and it is rendered in the same grey card as
`Requests Submitted`. The one thing on the page with a human on the other end of it has the least
visual weight. Page content ends at 430px on an 800px viewport.

**Inbox:** these are help requests with a server-side TTL, and the UI shows neither age beyond a
date nor time remaining. A `Refresh` button sits below the list styled as a secondary action.

### Hub admin

| Page                | Route                        | CE  | AAA | UF  | Avg | Note                                                 |
| ------------------- | ---------------------------- | --- | --- | --- | --- | ---------------------------------------------------- |
| Dashboard           | `/dashboard`                 | -   | -   | -   | -   | Redirects to `/groups`; no hub dashboard exists      |
| Groups              | `/groups`                    | 3   | 2   | 3   | 2.7 | Good filters; no nav; no pagination at 12 rows       |
| Group detail        | `/groups/:id`                | 2   | 2   | 2   | 2.0 | Read-only data dump with zero actions                |
| Register group      | `/groups/new`                | 4   | 3   | 4   | 3.7 | Best form in the app                                 |
| Verification queue  | `/verification`              | 3   | 2   | 2   | 2.3 | No decision-support content on the cards             |
| Verification detail | `/verification/requests/:id` | 3   | 2   | 3   | 2.7 |                                                      |
| Funding requests    | `/requests`                  | 3   | 2   | 2   | 2.3 | No "needs you" grouping; no totals                   |
| Request detail      | `/requests/:id`              | 3   | 2   | 3   | 2.7 |                                                      |
| Reports             | `/reports`                   | 4   | 3   | 4   | 3.7 | Strongest authenticated page; all numbers, no charts |
| Hub settings        | `/settings/hub`              | 3   | 2   | 3   | 2.7 |                                                      |

**Funding requests - what Linear would do:** put the four that need a decision at the top under a
heading that says so, and let the reviewer act without leaving the list. Here 18 requests render as
one undifferentiated stream, and `Submitted` - the only status that requires the hub admin to do
anything - is a pale yellow pill at the far right edge, ~1100px from the amount that anchors each
row. Every decision costs a round trip to a detail page. There is no total requested or total
pending on the page whose subject is money.

**Verification queue:** the reviewer's job is to decide whether to trust a group. Each card offers
name, city, date, and method. Nothing to decide on, and no action on the card.

**Group detail:** a hub admin looking at a group cannot verify it, revoke it, see its funding
history, or contact it. Five read-only rows and a back link.

### Staff admin

| Page                                    | Route              | CE  | AAA | UF  | Avg | Note                                                            |
| --------------------------------------- | ------------------ | --- | --- | --- | --- | --------------------------------------------------------------- |
| Overview                                | `/admin`           | 4   | 3   | 4   | 3.7 | Sidebar, stat grid, quick action. Good                          |
| Hubs                                    | `/admin/hubs`      | 1   | 1   | 1   | 1.0 | Always 500 (B-3)                                                |
| Audit log                               | `/admin/audit-log` | 4   | 3   | 4   | 3.7 | Dense, correct table. No pagination; IDs truncated with no copy |
| Groups / Users / Verification / Funding | `/admin/*`         | 3   | 3   | 3   | 3.0 | Consistent, competent list pages                                |
| All `/admin/*/:id` detail pages         |                    | 3   | 2   | 3   | 2.7 |                                                                 |

The admin area is a different and better product than the rest of the app. Whatever pass produced
`AdminLayout` should be applied to `Layout`.

---

## Cross-cutting findings

### U-1 (CRITICAL): the authenticated app has no navigation

`frontend/src/components/layout/Layout.tsx` renders a header containing the logo, a language
switcher, a `Settings` link for owners only, the user's email, and a log-out button. There is no
nav. A coordinator can reach the inbox, new request, and profile only via three buttons on the
dashboard body; `/verification/request` and `/verification/attestations` are linked from nowhere at
all. A hub admin has no link to funding requests, the verification queue, or reports from any page.

`AdminLayout` has a full sidebar. The two coexist in one codebase.

### U-2 (HIGH): public pages have no navigation either

`PublicHeader.tsx` is a logo and a language switcher. The nav visible on the homepage lives inside
`HomePage` itself, so `/directory`, `/help`, `/privacy`, `/terms` and `/security` all render
nav-less. A community member who lands on the directory has no path to the anonymous help flow -
the other half of the product - except the footer.

### U-3 (HIGH): no mobile navigation anywhere

At 390px the homepage's inline nav disappears entirely with no hamburger or drawer. For a product
whose stated platform requirement is mobile-first with large tap targets, mobile users get strictly
less navigation than desktop users, which is already none on most pages.

### U-4 (HIGH): every page has the title "Relay"

All 42 routes. No `<title>` management. Tab switching, bookmarks, history, and browser-level search
are all unusable, and any shared link previews identically.

### U-5 (MEDIUM): hub admins have no dashboard

`DashboardPage.tsx:30` redirects `hub_admin` to `/groups`. The role whose job is reviewing and
routing money lands on a roster. Pending verifications and submitted requests - the two things
waiting on them - are two unlinked URLs away.

### U-6 (MEDIUM): global 44px tap-target rule misaligns inline links

`frontend/src/index.css:25-30` applies `min-height: 44px; min-width: 44px` to every `button`, `a`,
and `[role=button]` with no vertical centring. The `Settings` link in the authenticated header
measures 44px tall with its text pinned to the top, so it sits visibly above the adjacent email on
every authenticated page at every viewport. The intent - mobile tap targets - is right; the blanket
selector is not.

### U-7 (MEDIUM): 404 renders outside every layout

No header, no footer, no link home. A mistyped URL strands the user completely.

### U-8 (LOW): heading structure

Four pages have no `h1` (`/login`, `/onboarding`, `/requests/new`, `/inbox/:id`). Eight pages skip
`h1` straight to `h3`. Screen-reader navigation by heading is degraded on roughly a quarter of the
app.

### U-9 (LOW): `/design-system` is publicly routed

An internal component gallery on an unauthenticated route.

### U-10 (INFO): no dark mode

Zero `dark:` utilities; no `darkMode` key in `tailwind.config.js`. Recorded as a deliberate gap, not
a defect. Given the audience often browses on borrowed or low-end devices at night, it is worth a
decision rather than a default.

---

## Priority matrix

| Priority | Item                                                                | Why now                                                        |
| -------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| **P0**   | B-1 funding requests blocked                                        | Core workflow, dead for everyone, one-line root cause          |
| **P0**   | B-2 broadcast keys have no path                                     | Headline feature cannot deliver; needs design, not just a fix  |
| **P0**   | U-1 no navigation in the authenticated app                          | Lifts ~20 pages at once; blocks everything else being findable |
| **P1**   | B-3 `/admin/hubs` 500                                               | Page is permanently broken; trivial fix                        |
| **P1**   | B-4 attestation always 400                                          | A documented verification method is unreachable                |
| **P1**   | U-2 / U-3 public and mobile navigation                              | Directory and help flow cannot reach each other                |
| **P1**   | `/help` submit state and reassurance hierarchy                      | Highest-stakes page in the product                             |
| **P2**   | U-4 page titles                                                     | Cheap, affects every route                                     |
| **P2**   | Directory: region filter, density, promoted CTA                     | Named requirement in `CLAUDE.md`                               |
| **P2**   | Hub funding list: needs-action grouping and totals                  | Turns a stream into a work queue                               |
| **P2**   | U-5 hub dashboard                                                   |                                                                |
| **P2**   | B-5 rate limit default                                              |                                                                |
| **P3**   | U-6 tap-target rule, U-7 404, U-8 headings, U-9 design-system route | Small, independent                                             |

Within P0, the order is B-1, then U-1, then B-2. B-1 and U-1 are bounded and unblock testing
anything else; B-2 needs a key-custody design decision before code.

---

## What is strong

- **The admin area.** `AdminLayout`, the audit log table, and the overview page are genuinely good
  and set the bar the rest of the app should meet.
- **`/reports`.** Real aggregate reporting, sensibly grouped, no per-person data anywhere - the
  privacy constraint is honoured in the design, not just the schema.
- **`/groups/new`.** Clear labels, useful helper text ("this can be a pseudonym", "use a role-based
  email, not a personal address"), correct primary/secondary button pairing.
- **The privacy posture is visible in the product**, not only the docs. Copy consistently avoids
  asking for anything it does not need.
- **The component library exists and is used** - `Button`, `Alert`, `Badge`, `EmptyState`,
  `StatCard` are applied consistently. The raw materials for the fixes above are already here.

---

## Verification bar for remediation

- All P0 pages: minimum 3.5 average
- All P1 pages: minimum 3.0 average
- No page below 2.5 on any single axis
- Every route reachable by clicking from `/` or `/dashboard`
- Mobile parity: no page with fewer available actions than its desktop counterpart

## Method notes

- Dev servers on ports 3021 (frontend) and 8004 (backend), per the local port registry; both pinned
  in `frontend/vite.config.ts`.
- Seeded by `backend/src/db/seed-audit.ts`, added during this audit. The pre-existing `seed.ts`
  creates one hub, one group and one user, which leaves every list and queue on an empty state.
- `backend/src/config.ts` now imports `./env.js`. Without it, any entry point that does not go
  through `index.ts` - the seed scripts included - silently fell back to schema defaults and
  connected to the wrong database.

---

## Remediation - what shipped

Every finding above was fixed. Branch `fix/ux-audit-critical-bugs`, four commits.

### Functional defects

| ID  | Fix                                                                                                                                                     | Proof                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| B-1 | Verification status now resolves from the group's own hub memberships when no hub is in context, because a coordinator never has one                    | 3 tests; reverting fails all 3                                                                                           |
| B-2 | Groups derive a broadcast keypair from a coordinator passphrase (PBKDF2-HMAC-SHA256, 600k iterations, per-group salt); only the public half is uploaded | 10 endpoint tests, plus a full browser run: passphrase set, anonymous request sent, message + contact + safe word opened |
| B-3 | `hubs.id` written out in full inside the correlated subquery                                                                                            | 4 tests; reverting fails 2                                                                                               |
| B-4 | Attesting group's hubs resolved from its own membership rather than from a session field it can never have                                              | 5 tests; reverting fails 4                                                                                               |
| B-5 | Default raised 100 -> 600 requests per 15 minutes, and made configurable                                                                                | -                                                                                                                        |

The test fixture that hid B-1 and B-4 was also fixed: `createGroupCoordinatorWithSession` inserted a
`hub_members` row for a group coordinator, which no production path ever does, so every test ran
against a session shape that cannot exist. The existing 111 tests still pass without it.

### Design findings

| ID   | Fix                                                                                                                                      |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| U-1  | `Layout` and `AdminLayout` now render one `ConsoleLayout`, differing only in the items they pass. Nav is derived from role and `isOwner` |
| U-2  | `PublicHeader` carries real navigation; the directory and the help form can reach each other                                             |
| U-3  | Drawer under 1024px in the console, menu under 768px on public pages                                                                     |
| U-4  | `DocumentTitle` maps route to a translated title in one place; dynamic segments inherit their parent                                     |
| U-5  | Hub admins have a dashboard instead of a redirect to a roster                                                                            |
| U-6  | The 44px rule applies to buttons, not to every `<a>`                                                                                     |
| U-7  | 404 renders inside the public chrome with two ways out                                                                                   |
| U-8  | No heading skips remain; login, onboarding and invite detail have an h1 in every branch                                                  |
| U-9  | `/design-system` is development-only                                                                                                     |
| U-10 | No dark mode. Left as a deliberate gap - see below                                                                                       |

Plus, from the page-by-page notes: the help form's submit button is enabled and its validation
messages are reachable and scrolled to; the directory has a region filter, a 2-3 column grid, a
labelled verified badge and a real contact action; the hub funding list leads with totals and splits
awaiting from settled.

### Verification

All 42 routes recaptured at 1280x800 and 390x844 after the changes:

| Measure                                | Before | After |
| -------------------------------------- | ------ | ----- |
| Pages with console errors or 4xx/5xx   | 2      | 0     |
| Pages reachable only by typing the URL | ~20    | 0     |
| Distinct page titles                   | 1      | 30    |
| Pages skipping h1 -> h3                | 8      | 0     |
| Pages with no h1                       | 4      | 0     |
| Backend tests                          | 111    | 133   |

Scores after remediation, against the same axes:

| Page group                               | Before (avg)   | After (avg) |
| ---------------------------------------- | -------------- | ----------- |
| Public - directory                       | 2.0            | 4.0         |
| Public - request help                    | 2.0            | 3.5         |
| Public - 404                             | 1.0            | 3.5         |
| Coordinator - dashboard, inbox, requests | 2.0-2.7        | 3.5         |
| Coordinator - invite detail              | 1.0            | 3.5         |
| Coordinator - new request                | 1.0            | 3.5         |
| Coordinator - attestations               | 1.0            | 3.0         |
| Hub - dashboard                          | n/a (redirect) | 4.0         |
| Hub - funding requests                   | 2.3            | 4.0         |
| Hub - groups, verification               | 2.3-2.7        | 3.5         |
| Staff admin - hubs                       | 1.0            | 3.0         |
| Staff admin - everything else            | 3.0-3.7        | 3.5-3.7     |

Bar met: no P0 page below 3.5, no P1 page below 3.0, nothing below 2.5 on any single axis, every
route reachable by clicking, and no page with fewer actions on mobile than on desktop.

### Deliberately not done

- **Dark mode (U-10).** Still zero `dark:` utilities. Adding one is a design decision about the
  product's visual identity, not a defect fix, and doing it as part of a remediation pass would mean
  choosing a whole second palette without a brief. Worth a decision rather than a default, given the
  audience often browses on borrowed devices at night.
- **Group detail actions.** A hub admin viewing a group still cannot verify, revoke or see its
  funding history from that page. Those actions exist elsewhere; consolidating them onto the detail
  page is a workflow change, not a fix, and it should follow a decision about what a hub admin is
  meant to do from there.
- **Pagination.** Neither the groups list, the funding list nor the audit log paginates. At pilot
  volumes this is invisible; it is a real problem at scale and belongs with whatever load testing
  precedes a real pilot.
- **The duplicate titles that remain.** Detail pages inherit their parent's title, so
  `/requests/:id` reads "Funding requests". Naming the entity would need the entity loaded before
  the title is set, which means moving title-setting into the pages. Acceptable as is.
