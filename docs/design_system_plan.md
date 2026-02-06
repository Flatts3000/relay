# Design System Plan

## Why

The app currently uses Tailwind's default theme with no customization. Every color, font, and spacing value is ad-hoc — hardcoded utility classes scattered across 20+ page files. This produces a generic look and makes consistency impossible to enforce. A design system solves this by defining tokens once and referencing them everywhere.

The end result is a `/design-system` route that serves as living documentation — every token, component, and pattern rendered on a single page for internal reference.

---

## Current State

| Layer           | Status                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| Colors          | Default Tailwind palette. Primary is `blue-600`. No custom brand colors.                              |
| Typography      | System font stack (`system-ui, -apple-system, ...`). No heading font. No type scale.                  |
| Spacing         | Tailwind defaults, used inconsistently (`p-4`, `p-6`, `p-8` without rationale).                       |
| Border radius   | Mix of `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full`.                       |
| Shadows         | Mix of `shadow-sm`, `shadow-md`, `shadow-lg` without hierarchy.                                       |
| Components      | 5 UI components (Button, Input, Alert, CheckboxGroup, LanguageSwitcher). No formal API documentation. |
| Tailwind config | Empty `extend: {}` — zero customization.                                                              |
| CSS             | Single `index.css` with Tailwind directives + global focus/touch-target rules.                        |

---

## Design Tokens

Design tokens are the atomic values that define the visual language. They live in `tailwind.config.js` under `theme.extend` and map to CSS custom properties where needed.

### Color Palette

The current blue-600 primary reads as "generic SaaS." Relay is a mutual aid coordination tool — it should feel trustworthy, warm, and community-oriented. The palette shifts from pure blue toward **teal-indigo** for the primary and introduces warm neutrals.

#### Brand Colors

| Token         | Value     | Usage                               |
| ------------- | --------- | ----------------------------------- |
| `primary-50`  | `#f0f7ff` | Primary tinted backgrounds          |
| `primary-100` | `#dbeafe` | Hover backgrounds, light fills      |
| `primary-200` | `#b4d3f5` | Borders, dividers                   |
| `primary-300` | `#7bb3e8` | Decorative accents                  |
| `primary-400` | `#4a90d9` | Icons, secondary text               |
| `primary-500` | `#2e6eb5` | —                                   |
| `primary-600` | `#1d5a9e` | Primary buttons, links, focus rings |
| `primary-700` | `#164a84` | Hover state for primary             |
| `primary-800` | `#113b6a` | —                                   |
| `primary-900` | `#0c2d52` | Dark mode primary text              |

_Note: Exact hex values are starting points. Final values should be validated for WCAG AA contrast (4.5:1 for text, 3:1 for UI elements) using a tool like Accessible Colors or Stark._

#### Warm Neutrals

Replace Tailwind's cool gray with a warmer stone/zinc tone that feels less clinical:

| Token         | Usage                                     |
| ------------- | ----------------------------------------- |
| `neutral-50`  | Page backgrounds                          |
| `neutral-100` | Card backgrounds, subtle fills            |
| `neutral-200` | Borders, dividers                         |
| `neutral-300` | Disabled states, placeholder text borders |
| `neutral-400` | Placeholder text                          |
| `neutral-500` | Secondary text                            |
| `neutral-600` | Body text                                 |
| `neutral-700` | Headings, strong text                     |
| `neutral-800` | Dark backgrounds (safety section)         |
| `neutral-900` | Darkest background, high-contrast text    |

Map these to Tailwind's `gray` key in the config so existing `text-gray-600` classes automatically use the warm palette without find-and-replace.

#### Semantic Colors

| Token     | Background   | Text          | Border        | Usage                 |
| --------- | ------------ | ------------- | ------------- | --------------------- |
| `success` | `green-50`   | `green-800`   | `green-200`   | Alerts, confirmations |
| `error`   | `red-50`     | `red-800`     | `red-200`     | Errors, validation    |
| `warning` | `amber-50`   | `amber-800`   | `amber-200`   | Warnings, cautions    |
| `info`    | `primary-50` | `primary-800` | `primary-200` | Informational notices |

#### Accent Colors

| Token          | Value           | Usage                                     |
| -------------- | --------------- | ----------------------------------------- |
| `accent-teal`  | teal-500 range  | Group/community elements, "for groups" UI |
| `accent-amber` | amber-400 range | Pilot badge, tips, highlights             |

### Typography

#### Font Families

| Token          | Font      | Fallback                | Usage                                |
| -------------- | --------- | ----------------------- | ------------------------------------ |
| `font-heading` | **Inter** | `system-ui, sans-serif` | Headings (h1–h4), nav, buttons       |
| `font-body`    | **Inter** | `system-ui, sans-serif` | Body text, form labels, descriptions |

_Why Inter:_ Open source, designed for screens, excellent legibility at small sizes, strong weight range (400–700), good multilingual support (Latin + extended). A single font family for both heading and body keeps the bundle small and the design cohesive. Personality comes from weight contrast and size, not font pairing.

_Alternative considered:_ Separate heading font (e.g., DM Sans, Plus Jakarta Sans). Rejected — adds load time, complexity, and a second FOIT/FOUT risk. One family is sufficient for a utility-focused app.

**Loading strategy:** Google Fonts via `<link>` in `index.html` with `display=swap`. Preconnect to `fonts.googleapis.com` and `fonts.gstatic.com`. Load weights 400, 500, 600, 700.

#### Type Scale

Based on a 1.25 ratio (Major Third), anchored at 16px body:

| Token       | Size            | Weight | Line Height | Letter Spacing | Usage                            |
| ----------- | --------------- | ------ | ----------- | -------------- | -------------------------------- |
| `text-xs`   | 12px / 0.75rem  | 400    | 1.5         | 0.02em         | Captions, helper text            |
| `text-sm`   | 14px / 0.875rem | 400    | 1.5         | 0              | Secondary text, labels           |
| `text-base` | 16px / 1rem     | 400    | 1.6         | 0              | Body text                        |
| `text-lg`   | 18px / 1.125rem | 500    | 1.5         | 0              | Lead paragraphs, subtitles       |
| `text-xl`   | 20px / 1.25rem  | 600    | 1.4         | -0.01em        | Section subheads (h4)            |
| `text-2xl`  | 24px / 1.5rem   | 600    | 1.3         | -0.015em       | Section titles (h3)              |
| `text-3xl`  | 30px / 1.875rem | 700    | 1.2         | -0.02em        | Page titles (h2)                 |
| `text-4xl`  | 36px / 2.25rem  | 700    | 1.15        | -0.02em        | Hero headings (h1)               |
| `text-5xl`  | 48px / 3rem     | 700    | 1.1         | -0.025em       | Hero headings large (h1 desktop) |

Negative letter-spacing on large headings tightens them visually; positive on small text improves legibility.

### Spacing Scale

Standardize on Tailwind's default 4px base but define semantic tokens for consistent section/component spacing:

| Token                     | Value                            | Usage                                         |
| ------------------------- | -------------------------------- | --------------------------------------------- |
| `space-section-y`         | `py-16 sm:py-24`                 | Vertical padding between major sections       |
| `space-section-y-compact` | `py-12 sm:py-16`                 | Compact sections (What Is/Not, Pilot)         |
| `space-content-gap`       | `gap-6` or `gap-8`               | Space between content blocks within a section |
| `space-stack-sm`          | `space-y-2`                      | Tight stacking (list items, form helper text) |
| `space-stack-md`          | `space-y-4`                      | Medium stacking (form fields)                 |
| `space-stack-lg`          | `space-y-6`                      | Loose stacking (section content blocks)       |
| `space-container`         | `max-w-5xl mx-auto px-4 sm:px-6` | Page container                                |
| `space-container-narrow`  | `max-w-2xl mx-auto px-4 sm:px-6` | Narrow content (forms, legal)                 |

### Border Radius

Standardize to three tiers:

| Token             | Value  | Usage                                 |
| ----------------- | ------ | ------------------------------------- |
| `rounded-sm`      | 6px    | Small elements (badges, chips)        |
| `rounded-DEFAULT` | 8px    | Buttons, inputs, alerts, cards        |
| `rounded-lg`      | 12px   | Larger containers, form wrappers      |
| `rounded-full`    | 9999px | Circular avatars, icon circles, pills |

Remove `rounded-md`, `rounded-xl`, `rounded-2xl` from active use. Three tiers + full is enough.

### Shadows

Three elevation levels:

| Token       | Value                         | Usage                                |
| ----------- | ----------------------------- | ------------------------------------ |
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)`  | Subtle depth (header, cards at rest) |
| `shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` | Interactive hover states             |
| `shadow-lg` | `0 8px 24px rgba(0,0,0,0.1)`  | Modals, dropdowns, elevated UI       |

### Motion

| Token             | Value                          | Usage                                      |
| ----------------- | ------------------------------ | ------------------------------------------ |
| `duration-fast`   | `100ms`                        | Micro-interactions (hover color)           |
| `duration-normal` | `200ms`                        | Standard transitions (button press, focus) |
| `duration-slow`   | `300ms`                        | Layout shifts, reveals                     |
| `ease-DEFAULT`    | `cubic-bezier(0.4, 0, 0.2, 1)` | General purpose                            |
| `ease-in`         | `cubic-bezier(0.4, 0, 1, 1)`   | Elements exiting                           |
| `ease-out`        | `cubic-bezier(0, 0, 0.2, 1)`   | Elements entering                          |

---

## Component Inventory

### Existing (refine)

| Component            | Changes Needed                                                         |
| -------------------- | ---------------------------------------------------------------------- |
| **Button**           | Map variants to token colors. Add `ghost` variant (text-only, no bg).  |
| **Input**            | Map to tokens. Add `textarea` support or extract `Textarea` component. |
| **Alert**            | Map to semantic color tokens. Add optional `onDismiss` close action.   |
| **CheckboxGroup**    | Map to tokens. No API changes.                                         |
| **LanguageSwitcher** | Already updated with globe icon. No changes.                           |

### New (build for design system page)

| Component        | Description                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Badge**        | Small inline label (e.g., pilot badge, status badges). Variants: `default`, `success`, `warning`, `error`.                   |
| **Divider**      | Horizontal rule with optional gradient. Replaces ad-hoc `<div className="h-px bg-gradient-...">`.                            |
| **Container**    | Semantic wrapper applying `space-container` or `space-container-narrow`. Replaces repeated `max-w-5xl mx-auto px-4 sm:px-6`. |
| **PublicHeader** | Minimal header (logo + language switcher) for anonymous pages.                                                               |
| **PublicFooter** | Minimal footer (logo + tagline + privacy/terms links).                                                                       |
| **IconCircle**   | Reusable icon-in-circle pattern used throughout the home page. Props: `icon`, `size`, `color`.                               |

### Not Building

- No modal/dialog (not needed for pilot)
- No toast/notification system (alerts are sufficient)
- No table component (reports page can use plain HTML tables)
- No dropdown/menu (only the language `<select>` exists)

---

## The `/design-system` Page

### Purpose

Living documentation for internal developers and designers. Shows every token rendered, every component in all its states, and usage guidance. This is not a public-facing page — it's a development tool.

### Route

`/design-system` — only rendered in development (gate behind `import.meta.env.DEV` or leave ungated for now since there's no sensitive content).

### Page Structure

```
/design-system
├── Header (anchor nav to each section)
├── 1. Colors
│   ├── Brand palette (all primary shades with hex + token name)
│   ├── Neutral palette (all neutral shades)
│   ├── Semantic colors (success/error/warning/info as rendered Alert examples)
│   └── Accent colors
├── 2. Typography
│   ├── Font family specimen (heading + body)
│   ├── Type scale (each size rendered with token name, size, weight)
│   └── Text color usage
├── 3. Spacing
│   ├── Base scale (visual blocks at each spacing value)
│   └── Semantic spacing tokens
├── 4. Borders & Radius
│   ├── Radius tiers (rendered boxes)
│   └── Border styles
├── 5. Shadows
│   └── Elevation tiers (rendered boxes)
├── 6. Components
│   ├── Button (all variants × all sizes × states: default, hover, focus, disabled, loading)
│   ├── Input (default, focus, error, disabled, with/without label)
│   ├── Alert (all 4 types)
│   ├── Badge (all variants)
│   ├── CheckboxGroup (default, with error)
│   ├── IconCircle (sizes and colors)
│   ├── Divider (solid, gradient)
│   └── LanguageSwitcher
├── 7. Layout
│   ├── Container widths (standard, narrow)
│   ├── Breakpoint reference
│   └── Section spacing
├── 8. Icons
│   └── All FontAwesome icons in use (rendered grid with names)
└── Footer
```

### Design of the Page Itself

The design system page should be clean and utilitarian:

- White background, no section tinting
- Left-aligned content in a wide container (`max-w-6xl`)
- Each section has a clear heading, description, and rendered examples
- Color swatches are rendered as rows of colored boxes with hex/token labels
- Typography specimens show the actual rendered text at each scale
- Component examples show all variants side by side
- Code snippets (usage examples) shown in a `<pre>` block next to each component

---

## Implementation Plan

### Phase 1: Tokens in Tailwind Config

**Files:**

- `frontend/tailwind.config.js` — extend theme with custom colors, fonts, radius, shadows
- `frontend/src/index.css` — add `@font-face` or Google Fonts import
- `frontend/index.html` — add `<link>` preconnect for Google Fonts

**Work:**

1. Add `colors.primary` scale (50–900) to tailwind config
2. Override `colors.gray` with warm neutral scale
3. Add `fontFamily.heading` and `fontFamily.body` pointing to Inter
4. Add custom `borderRadius` values (sm, DEFAULT, lg)
5. Add custom `boxShadow` values (sm, md, lg)
6. Add custom `transitionDuration` values (fast, normal, slow)
7. Load Inter from Google Fonts in `index.html`
8. Update `index.css` font-family to reference the new token

### Phase 2: New Utility Components

**Files to create:**

- `frontend/src/components/ui/Badge.tsx`
- `frontend/src/components/ui/Divider.tsx`
- `frontend/src/components/ui/Container.tsx`
- `frontend/src/components/ui/IconCircle.tsx`
- `frontend/src/components/layout/PublicHeader.tsx`
- `frontend/src/components/layout/PublicFooter.tsx`

**Work:**

1. Build each component using the new token classes
2. Export from `components/ui/index.ts` barrel file
3. Each component is small (< 50 lines)

### Phase 3: Refine Existing Components

**Files to modify:**

- `frontend/src/components/ui/Button.tsx` — swap hardcoded blue-600 → primary-600, add `ghost` variant
- `frontend/src/components/ui/Input.tsx` — swap to token colors
- `frontend/src/components/ui/Alert.tsx` — swap to semantic color tokens
- `frontend/src/components/ui/CheckboxGroup.tsx` — swap to token colors

**Work:**

1. Replace all hardcoded Tailwind color classes with token-based equivalents
2. Add ghost variant to Button
3. Verify all components still render correctly

### Phase 4: Design System Page

**Files to create:**

- `frontend/src/pages/DesignSystemPage.tsx` — the full design system documentation page

**Files to modify:**

- `frontend/src/App.tsx` — add `/design-system` route

**Work:**

1. Build the page as a single long-scroll document with anchor navigation
2. Each section renders live components and token swatches
3. Add anchor-based navigation at the top
4. Gate behind `import.meta.env.DEV` if desired (optional)

### Phase 5: Migrate Pages to Token Classes

**Files to modify:**

- `frontend/src/pages/HomePage.tsx`
- `frontend/src/pages/CreateMailboxPage.tsx`
- `frontend/src/pages/ViewMailboxPage.tsx`
- `frontend/src/pages/LoginPage.tsx`
- All other page files as needed

**Work:**

1. Replace hardcoded color classes (`blue-600` → `primary-600`, `gray-*` → neutral equivalents)
2. Standardize border radius usage to the three tiers
3. Standardize spacing to semantic tokens where applicable
4. Replace ad-hoc dividers with `<Divider />` component
5. Replace repeated container patterns with `<Container />` or `<Container narrow />`
6. Replace icon-in-circle patterns with `<IconCircle />`

This phase can be done incrementally, page by page.

---

## What's NOT Changing

- Tailwind as the styling framework (no CSS-in-JS, no Styled Components)
- FontAwesome as the icon library
- react-i18next for internationalization
- Component file locations (`components/ui/`)
- Any backend code
- Any application logic or routing (except adding the `/design-system` route)
- WCAG AA compliance requirements (44px touch targets, focus rings, contrast ratios)

---

## Verification

1. `npm run typecheck` — no errors after token migration
2. `npm run build:frontend` — builds cleanly
3. `/design-system` renders all sections with live components
4. All existing pages render correctly with new tokens (visual regression check)
5. Contrast ratios validated: primary-600 on white >= 4.5:1, primary-700 on white >= 4.5:1
6. Inter font loads correctly (check Network tab, verify no FOIT)
7. Mobile: design system page is scrollable and readable on small screens
