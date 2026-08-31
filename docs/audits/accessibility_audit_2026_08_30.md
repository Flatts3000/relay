# Accessibility audit, 2026-08-30

**Scope:** every public surface of relayfunds.org. Six application routes (`/`,
`/directory`, `/login`, `/privacy`, `/security`, `/terms`) and the four static
marketing pages added in #78.

**Bar:** WCAG 2.1 AA, plus the "large tap targets" rule in `CLAUDE.md`, which is
stricter than AA and is treated here as a project requirement rather than a
suggestion.

**Method.** axe-core 4 driven by Playwright at 1280x900 and 390x760, over
`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `best-practice`. Then a second
pass for the things axe structurally cannot check: language declaration, tap
target geometry, keyboard focus visibility, reflow at 320px, and skip links.
Application routes were served by the dev server against the live API with a
seeded database (12 groups, 1 hub); the four static pages were served by the
real `deploy/nginx.prod.conf` against the production build.

> **One methodology note, because it changed the results.** The first run pointed
> every URL at the dev server. Vite's SPA fallback returns `index.html` for
> `/what-is-relay/` and friends, so that run measured the React app four times
> and reported it as the marketing pages. Anything auditing these static pages
> has to go through nginx, not vite.

---

## Remediation status

Every finding was fixed in the same branch as this audit. Re-verified after the
fixes: **zero axe violations across all ten pages at both viewports**, where the
first run had ten failing nodes.

|                                                             | Status                                                                                                                                                                                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **A-1** `<html lang>` ignores the switcher                  | **Fixed.** `DocumentTitle` sets it from `i18n.language`. Verified: switching to Spanish moves `lang` from `en-US` to `es` while the heading becomes "Ayuda mutua, conectada."                                                              |
| **A-2** `/login` has no `main` landmark                     | **Fixed.** Both return paths, including the loading state, are wrapped in `<main id="main-content">`.                                                                                                                                      |
| **A-3** skip link on one route of six                       | **Fixed.** Moved into `PublicHeader`, so every page rendering the shared chrome has one, and each `<main>` gained the matching id. `/login` deliberately has none: it renders no repeated navigation block, so there is nothing to bypass. |
| **A-4** header nav below 44px                               | **Fixed.** `inline-flex` + `min-h-[44px]` on the nav links and the sign-in link.                                                                                                                                                           |
| **A-5** masthead logo link 50x28                            | **Fixed.** `min-h-[44px]`. The finding's original wording was wrong about the cause and has been corrected in place.                                                                                                                       |
| **A-6**, **A-7** contrast and landmarks on the static pages | **Fixed** in this pass, as described below.                                                                                                                                                                                                |

---

## Result

| Surface                                                         | axe violations   | Notes                                 |
| --------------------------------------------------------------- | ---------------- | ------------------------------------- |
| `/`                                                             | 0                |                                       |
| `/directory`                                                    | 0                |                                       |
| **`/login`**                                                    | **2 (10 nodes)** | A-1, A-2                              |
| `/privacy`, `/security`, `/terms`                               | 0                |                                       |
| `/what-is-relay/`, `/need-help/`, `/for-groups/`, `/for-funds/` | 0                | after A-6 and A-7, fixed in this pass |

Reflow at 320px: clean on all ten pages, no horizontal scrolling anywhere.
Keyboard focus visibility: every one of the first twelve tab stops on every page
paints an outline or a ring. No images anywhere are missing `alt`.

That is a good baseline, and most of what follows is narrow.

---

## HIGH

### A-1: The language switcher changes the content but not the language declaration

**File:** `frontend/src/i18n/` and `frontend/index.html`
**WCAG:** 3.1.1 Language of Page (Level A)

Measured on `/`, switching to Spanish:

```
before: { lang: "en", heading: "Mutual aid, connected." }
after : { lang: "en", heading: "Ayuda mutua, conectada." }
```

The page becomes Spanish and `<html lang>` stays `en`. A screen reader keeps its
English voice and English pronunciation rules and reads Spanish text through
them, which ranges from hard to unintelligible. It also mis-signals the page to
translation tooling and to search engines.

**Why this is the top finding rather than a minor one.** Relay is bilingual by
design, and the Spanish audience is not incidental: `docs/problem_brief.md` and
the deck both put undocumented residents at the center of who this is for. This
defect lands entirely on that group, and only on that group, so it is invisible
to anyone testing in English.

**Remediation:**

1. Subscribe to i18next's `languageChanged` event and set
   `document.documentElement.lang` from it. One `useEffect` in the root, or an
   `i18n.on('languageChanged', ...)` at init.
2. Set `lang` on first paint too, not only on change, so a session that starts
   in Spanish is correct before any interaction.
3. Verify by switching language and reading `document.documentElement.lang`.

---

## MEDIUM

### A-2: `/login` has no `main` landmark and content outside all landmarks

**File:** `frontend/src/pages/LoginPage.tsx`
**WCAG:** 1.3.1 Info and Relationships (Level A); axe `landmark-one-main`, `region`

`/login` is the only route with no `<main>`. Four nodes, including a `select`,
sit outside every landmark. Screen reader users navigating by landmark, which is
the normal way to skip a header, have nothing to jump to and must traverse the
page linearly.

Every other application route already renders inside a landmark, so this is a
single page out of step rather than a systemic gap.

**Remediation:** wrap the page body in `<main id="main-content">`, matching what
`HomePage.tsx` already does, and confirm axe reports zero on `/login`.

### A-3: The skip link exists on one route out of six

**File:** `frontend/src/components/layout/` (the public and app layouts)
**WCAG:** 2.4.1 Bypass Blocks (Level A)

| Route                                                     | Skip link                           |
| --------------------------------------------------------- | ----------------------------------- |
| `/`                                                       | yes, `#main-content`, target exists |
| `/directory`, `/login`, `/privacy`, `/security`, `/terms` | **none**                            |
| all four marketing pages                                  | yes, `#main`, target exists         |

`HomePage.tsx` implements it correctly and nothing else reuses it. A keyboard or
switch user on `/directory` tabs through the entire header on every page load.

**Remediation:** lift the skip link out of `HomePage.tsx` into the shared public
layout so every route inherits one, and give each route's `<main>` the matching
id. It is the same three lines already written, moved up.

### A-4: Header navigation is below the tap target size the project requires

**File:** `frontend/src/components/layout/PublicHeader.tsx`

Measured on `/directory`, `/privacy`, `/security`, `/terms`:

| Link         | Size   |
| ------------ | ------ |
| Request help | 111x36 |
| Find a group | 108x36 |
| Safety       | 67x36  |
| Sign in      | 69x36  |

36px tall. That clears WCAG 2.5.8 AA (24px) and fails WCAG 2.5.5 AAA (44px),
and it fails `CLAUDE.md`, which says the platform is "mobile-responsive with
large tap targets" without qualifying it. The Platform Requirements section also
rules out hover and keyboard-only interaction, which makes touch the assumed
input and the target size load-bearing rather than cosmetic.

The marketing pages were at 38px and are now 44px (A-6), so the two surfaces
currently disagree about the same rule.

**Remediation:** `min-height: 44px` on the header nav links, as
`marketing/build.mjs` now does. Padding rather than font size, so nothing reflows.

### A-5: The home page masthead logo link is 50x28

**File:** `frontend/src/pages/HomePage.tsx`

The link measures 50x28, under the tap target floor on both axes.

Identified while fixing it, and the first reading of this finding was wrong:
it has no text content, but it is not unlabeled. It is the masthead logo, and
its accessible name comes from the `alt` on the image inside it, which is why
axe did not raise `link-name`. The only defect is the size, from `h-7` on the
image with no minimum on the link.

**Remediation:** `min-h-[44px]` on the link. No label change is needed.

---

## Fixed in this pass

Both were introduced by #78 and are corrected in the same branch as this audit.

### A-6: `IS` / `KEPT` chips failed contrast at 3.59:1

**File:** `marketing/build.mjs`, `.ledger .yes`
**WCAG:** 1.4.3 Contrast (Minimum) (Level AA). **Severity: serious.**

Teal `#0d9488` on `#f0fdfa` at 11px measured **3.59:1** against a 4.5:1
requirement. Five nodes across `/what-is-relay/` and `/need-help/`.

It matters more than a normal contrast miss because of where it sits: the chip
is the label that distinguishes what Relay **is** from what it is **not**, and
on `/need-help/` what is **kept** from what is **never** kept. A reader who
cannot resolve the chip cannot tell the two halves of that table apart, and on
`/need-help/` the two halves are a privacy claim.

Fixed by moving to `#0f766e`, which is teal-700 in
`frontend/tailwind.config.js` and measures **5.25:1**. An existing brand token,
not a new color. The `NOT` / `NEVER` chip was already passing at 5.91:1.

### A-7: Page header sat outside every landmark

**File:** `marketing/build.mjs`

The masthead was a `<div class="top">`, so the logo link belonged to no
landmark. Now a `<header>` element, which is the banner landmark, with
`<nav aria-label="Relay pages">` inside it. Tap targets in that nav went 38px to
44px and the footer link column 23px to 44px, the latter having been below even
the 24px AA floor.

All four pages now report zero axe violations at both viewports.

---

## A note on one non-finding

The tap target script reports the marketing skip link as 121x28. That is the
element measured while hidden off-screen. Focused, which is the only state a
user ever sees it in, it measures 153x52. Recorded here so a future run does not
spend time on it.

## Not covered

Screen reader testing with an actual screen reader (NVDA, JAWS, VoiceOver).
Everything above is automated measurement plus DOM inspection, which catches
roughly a third to a half of real barriers. The signed-in application
(dashboard, funding requests, verification queue, admin) was not audited: it is
behind authentication and out of scope for a public-surface pass. The anonymous
broadcast submission flow was not exercised end to end, and it is the highest
consequence flow in the product; it should be next.
