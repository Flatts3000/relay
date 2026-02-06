# Help Page Refinement Plan

> **Design system alignment:** This document uses the design system tokens and components defined in `docs/design_system_plan.md` and implemented in `tailwind.config.js`. All color references use token names (`primary-*`, `accent-teal-*`, `accent-amber-*`), and all reusable UI references use design system components (`PublicHeader`, `PublicFooter`, `IconCircle`, `Container`, `Button`, `Input`, `Alert`, `Badge`, `Divider`).

## Current State

The `/help` route renders `CreateMailboxPage.tsx` — a bare form page with no header, no logo, no footer, and no navigation. It drops the user into a gray `min-h-screen` with a form card and two colored alert boxes. There are no links to privacy, terms, or back to the home page.

This is a problem because `/help` is now the **primary CTA destination** from the home page hero. It's the first page a person in crisis lands on, and it looks like a different application entirely.

---

## Design Goals

1. **Continuity** — The help page should feel like part of the same site as the home page, not a detached utility screen.
2. **Trust** — A person in crisis needs to trust this page immediately. Familiar branding (logo, consistent header) and visible privacy/legal links build that trust.
3. **Simplicity** — The page must remain focused and uncluttered. This person may be stressed, on a phone, on slow internet. No distractions.
4. **Safety** — Reinforce that this is anonymous. The privacy guarantees should feel prominent, not like fine print.

---

## Decisions

### 1. Shared Header (minimal variant)

**Decision:** Use the `<PublicHeader />` component (already built in `components/layout/PublicHeader.tsx`). Logo on left, `<LanguageSwitcher />` on right. No navigation links.

```
[Logo]                                    [Globe v English]
─────────────────────────────────────────────────────────────
```

- Glassmorphism style: `bg-white/80 backdrop-blur-lg border-b border-gray-200/60 shadow-sm`
- Logo links back to `/`
- Language switcher so the user can switch to Spanish immediately
- No nav links — the page is a single-purpose flow

**Why no nav links:** The individual path is: arrive → create mailbox → get passphrase → leave. Adding nav links (For Organizations, Safety, Contact) would be noise. A "Back to home" logo click is sufficient.

**Implementation:** Import and render `<PublicHeader />` — no custom markup needed.

### 2. Shared Footer (minimal variant)

**Decision:** Use the `<PublicFooter />` component (already built in `components/layout/PublicFooter.tsx`). Logo + tagline on left, privacy/terms links + attribution on right.

```
─────────────────────────────────────────────────────────────
[Logo] — Coordination for mutual aid        Privacy · Terms · Built by...
```

- Privacy and Terms link to `/legal#privacy` and `/legal#terms`
- `bg-gray-50 border-t border-gray-200` — consistent with design system neutral palette
- Translation keys already added: `common:footer.privacy`, `common:footer.terms`

**Implementation:** Import and render `<PublicFooter />` — no custom markup needed.

### 3. Privacy & Terms Pages

**Decision:** Create a single `/legal` page with two sections (Privacy and Terms), linked as `/legal#privacy` and `/legal#terms`. This avoids creating two nearly-empty pages.

**Privacy section contents (speculative):**

- What Relay collects (nothing from individuals, group-level only for orgs)
- What Relay cannot see (E2E encrypted messages)
- Data retention (7-day auto-delete for mailboxes)
- No cookies, no analytics, no IP logging on anonymous routes
- Subpoena canary / statement: "If subpoenaed, Relay can only produce encrypted blobs it cannot decrypt"

**Terms section contents (speculative):**

- This is a coordination tool, not a benefits platform
- No guarantees of response or funding
- Passphrase is the user's sole responsibility — no recovery
- Groups are independent; Relay doesn't control their actions
- Acceptable use (no abuse of anonymous mailbox system)

**Note:** These are scaffolds. Actual legal language needs review. The important thing is the pages exist and are linked.

### 4. Page Layout Refinement

**Decision:** Restructure the form page for better visual hierarchy and trust, using design system components throughout.

**Current layout:**

```
[Title]
[Description]
[Green privacy box — bg-green-50 border card]
[Existing mailbox warning?]
[Error?]
[Form card with fields + yellow warning card]
[Submit button]
```

**Proposed layout:**

```
[<PublicHeader />]

[<IconCircle icon={faShieldHalved} size="lg" color="primary" />]
[Title: "Request Help Anonymously" — font-heading text-2xl]
[Subtitle: description text — text-gray-600]

[Privacy guarantees — inline, not boxed]
  faLock · No account required
  faLock · No tracking
  faLock · End-to-end encrypted
  faLock · Auto-deletes after 7 days

[Shared computer warning — text-sm text-gray-500]

[Existing mailbox warning — <Alert type="warning"> if applicable]

[Form — single subtle container: bg-gray-50 rounded-lg p-6]
  Region: <Input /> component
  Category: <select> with primary-500 focus ring
  Privacy warning (inline text-sm text-accent-amber-800, not boxed)
  <Button type="submit"> component

[<PublicFooter />]
```

**Key changes:**

- Remove the `bg-green-50 border border-green-200 rounded-lg` privacy card — use the de-carded pattern from the home page (inline items with `faLock` icons, floating on the page background)
- Remove the `bg-yellow-50 border border-yellow-200 rounded-lg` warning card — integrate as inline `text-sm text-accent-amber-800` helper text below the form fields
- Keep the form container with `bg-gray-50 rounded-lg p-6` (forms benefit from containment — same pattern as home page contact form, no border needed)
- Add `<IconCircle icon={faShieldHalved} size="lg" color="primary" />` above the title
- Use `font-heading` on heading elements
- All focus rings use `primary-500`
- Use `<Container narrow>` for max-width + centered padding

### 5. Background Treatment

**Decision:** Use `bg-gradient-to-b from-primary-50/40 to-white` (same as home hero) instead of flat `bg-gray-50`. This creates visual continuity with the home page the user just came from. Uses the `primary-50` design token.

### 6. Shared Layout Components (already built)

**Status:** Complete. Both components were built during the design system implementation (Phase 2).

- `<PublicHeader />` (`components/layout/PublicHeader.tsx`) — logo + `<LanguageSwitcher />`, sticky glassmorphism header
- `<PublicFooter />` (`components/layout/PublicFooter.tsx`) — logo + tagline + privacy/terms links + attribution

Both are exported from `components/layout/index.ts`. The home page keeps its own header (which has scroll navigation), but uses the same visual language.

### 7. Bot Protection (honeypot + time gate)

**Decision:** No CAPTCHA or Turnstile. Third-party challenge services contact external servers from the user's browser, leaking IP addresses to a third party that could be subpoenaed. This violates the project's privacy constraints for anonymous routes.

Instead, use two lightweight, zero-privacy-cost techniques:

**Honeypot field** — A visually hidden form field (`aria-hidden`, off-screen via CSS). Real users never see or fill it. Bots auto-fill all fields. Server rejects submissions where the honeypot has a value.

```tsx
<input
  name="website"
  tabIndex={-1}
  autoComplete="off"
  className="absolute -left-[9999px]"
  aria-hidden="true"
/>
```

- Frontend: add hidden field to the form (not an `<Input />` component — this is intentionally raw HTML to avoid design system styling)
- Backend: reject if `website` field is non-empty (400, generic error — don't reveal why)

**Time gate** — Record `Date.now()` on page mount. Reject submissions that arrive less than 2 seconds after mount. No human fills in a region + category dropdown in under 2 seconds.

- Frontend: capture mount timestamp in a `useRef`, include elapsed time in the request body
- Backend: reject if elapsed time < 2000ms (400, generic error)

Both are invisible to real users, require no third-party scripts, and stop the vast majority of automated submissions. Server-side rate limiting (already in place on the API) handles the rest.

### 8. Returning User Entry Point

**Problem:** `/help` is creation-only. A person who created a mailbox days ago will naturally navigate back to `/help` — it's the link they remember. There's no "I already have a passphrase" path on the page. The translation keys already exist (`help:needHelp` and `help:checkMessages`) but the page doesn't use them.

**Decision:** The `/help` page opens with two choices before showing any form:

```
[I need help]          [Check my messages]
```

- Both rendered as `<Button variant="secondary">` side-by-side, selected state uses `<Button variant="primary">`
- "I need help" reveals the mailbox creation form (current behavior)
- "Check my messages" prompts for a passphrase, then navigates to `/help/mailbox/:id`
- One tap to choose, zero friction added for new users
- If localStorage already has a mailbox, the "Check my messages" option can show a `<Badge variant="info">` indicator

Implementation: a simple two-button split at the top of the page, with the selected flow rendering below. No routing change — both flows live on `/help`.

### 9. Shared Computer Warning

**Problem:** The target audience may be on a library or shelter computer. After mailbox creation, the private key lives in `localStorage`. Another person using the same browser could access their mailbox.

**Decision:** Add a single line of text near the form — not a modal, not a blocker, just awareness:

> Using a shared computer? Use a private browsing window.

- Placed below the privacy guarantees, before the form
- Styled as subdued helper text (`text-sm text-gray-500`), not an alert box
- No action required from the user — just information

---

## Files to Create/Modify

| File                                              | Action            | Purpose                                                                                                                                                    |
| ------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend/src/components/layout/PublicHeader.tsx` | **Already built** | Minimal header with logo + `<LanguageSwitcher />`                                                                                                          |
| `frontend/src/components/layout/PublicFooter.tsx` | **Already built** | Footer with privacy/terms links + attribution                                                                                                              |
| `frontend/src/pages/CreateMailboxPage.tsx`        | **Modify**        | Add `<PublicHeader />` / `<PublicFooter />`, de-card privacy/warning boxes, use `<IconCircle />`, `<Container narrow>`, `font-heading`, `primary-*` tokens |
| `frontend/src/pages/ViewMailboxPage.tsx`          | **Modify**        | Add `<PublicHeader />` / `<PublicFooter />`, migrate to design system tokens                                                                               |
| `frontend/src/pages/LegalPage.tsx`                | **Create**        | Privacy policy + terms of service, uses `<PublicHeader />` / `<PublicFooter />`, `<Container narrow>`, `font-heading`                                      |
| `frontend/src/App.tsx`                            | **Modify**        | Add `/legal` route                                                                                                                                         |
| `frontend/src/locales/en/common.json`             | **Already done**  | `footer.privacy` and `footer.terms` keys added during design system implementation                                                                         |
| `frontend/src/locales/es/common.json`             | **Already done**  | Spanish translations added during design system implementation                                                                                             |
| `frontend/src/locales/en/help.json`               | **Modify**        | Add returning user flow keys, shared computer warning text                                                                                                 |
| `frontend/src/locales/es/help.json`               | **Modify**        | Spanish translations for new help keys                                                                                                                     |

---

## Out of Scope

- Mobile hamburger menu (not needed — no nav links on help pages)
- Actual legal review of privacy/terms content
- Changes to authenticated pages (dashboard, etc.)
- Passphrase recovery (by design — see CLAUDE.md)

---

## Verification

1. `npm run typecheck` — no errors
2. `npm run build:frontend` — builds cleanly
3. `/help` has `<PublicHeader />`, `<PublicFooter />`, and `<IconCircle />` section icon
4. `/help/mailbox/:id` has the same chrome (`<PublicHeader />` + `<PublicFooter />`)
5. `/legal` renders with privacy and terms sections using `<Container narrow>` and `font-heading`
6. Privacy/terms links (`/legal#privacy`, `/legal#terms`) scroll to correct anchors
7. Logo click navigates back to `/`
8. No card wrappers on privacy list or warning text (de-carded pattern)
9. Form container uses `bg-gray-50 rounded-lg p-6` — only card on the page
10. All focus rings use `primary-500` token
11. Headings use `font-heading` class
12. Background gradient uses `primary-50` token
13. Mobile: everything stacks cleanly
14. Tab through: focus states work on all interactive elements (44px touch targets preserved)
15. Honeypot field is invisible and `aria-hidden`
16. Returning user toggle works (two-button split renders correct flow)
