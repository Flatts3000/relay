# Home Page Design Decisions

How research from `designing_mutual_aid_landing_page.md` informed our home page design. Each section starts with what the research says, then documents the decision we made in response.

All bracketed citations (e.g. [1][2]) refer to the sources table in the research document.

---

## 1) Audience Segmentation

**What research says:**

- Organize content by user goal, not internal structure. Use audience-specific sections so visitors can "self-select the journey they need" [1][2]
- Treat the homepage as a "launchpad" that orients users and points them deeper — concise cards or sections per audience, not everything on one page [4][5]
- A successful example: God's Love We Deliver uses three distinct entry buttons ("Get Meals," "Donate," "Volunteer") so visitors aren't overwhelmed [2]

**Decision:** Structure the page as a dual-funnel. Relay has two primary audiences with fundamentally different needs: individuals in crisis (who need anonymous help fast) and organizations (who need coordination tooling). Each gets equal weight and a dedicated section.

**What this means for the build:**

- Hero presents two equal CTAs — "I Need Help" and "For Organizations" — that scroll to dedicated sections
- Individual path (`#individual`) is a self-contained funnel: explanation, how-it-works, privacy guarantees, CTA to `/help`
- Organization path (`#organizations`) is a self-contained funnel: explanation, hub/group sub-cards, how-it-works, CTA to contact
- The individual path comes first on the page because a person in crisis is scanning faster and has less patience than an organization evaluating a tool

---

## 2) Headlines and Messaging

**What research says:**

- Social-impact sites need an "identifiable mission that is prominently featured" [6][7]
- Visitors must instantly "understand the purpose of the page" — explain _what_ the platform is and _how_ it works in plain terms [9]
- For individuals in crisis, tone must be _clear, welcoming, and stigma-free_ [8]
- For organizations, emphasize collaboration and impact [8]
- Avoid jargon, anything clinical or salesy [8][15]

**Decision:** Lead with a short, plain-language headline that signals both audiences and says nothing about "platforms" or "networks." The subtitle should mention privacy because that's Relay's differentiator.

**What this means for the build:**

- Headline: "Mutual aid, connected." — three words, no jargon
- Subtitle: "Whether you need help or you're part of a group providing it, Relay is built to protect your privacy." — speaks to both audiences, names the value proposition
- Individual section uses empathetic language: "Need Help?", "Connect with local mutual aid groups anonymously"
- Organization section uses collaborative language: "Fund hubs and mutual aid groups", "moving resources faster"

---

## 3) Privacy as Primary Narrative

**What research says:**

- Privacy is typically buried in footers — for a tool like Relay, that's a mistake. The differentiator is safety by design [10][18]
- "Tell users what's happening to their data in plain language" [10]
- State no-tracking, no-cookies posture explicitly: "no tracking cookies are placed on your device...no third-party tracking scripts are used" [19]
- Offer guest or one-time access codes instead of account sign-ups [18]
- Collect only what's strictly necessary — for a crisis user, ideally no data at all [18]
- Link to a clear, concise privacy statement using plain language, not legalese [10]

**Decision:** Privacy is not a section — it's a thread running through the entire page. Every audience section includes privacy messaging in context. There is also a dedicated Safety section that consolidates the full privacy posture.

**What this means for the build:**

- Hero subtitle mentions privacy
- Individual path includes inline privacy guarantees: "No account or sign-up required", "No name, email, or phone number collected", "Messages are encrypted — only you can read them", "Your mailbox auto-deletes after 7 days"
- Individual path has a dedicated "Your privacy is protected" box with specific commitments
- Safety by Design section (`#safety`) consolidates the full posture with per-audience columns
- Language is plain and concrete ("We never ask for your name, address, or ID") not legalistic

---

## 4) Per-Audience Safety Messaging

**What research says:**

- Audience-specific content sections, not one-size-fits-all messaging [1][2]
- Individuals care about anonymity: "No email. No tracking. Ever." [per-audience summary table]
- Organizations care about data minimization, compliance, secure platform [per-audience summary table]
- Mutual aid security guidance: teach safe usage patterns as both trust-building and operational protection [17]

**Decision:** Split safety messaging into two columns because individuals and organizations have different threat models. Add practical organizer tips as a third element.

**What this means for the build:**

- "For people seeking help" column: no account, anonymous encrypted messaging, auto-deletion, no analytics
- "For organizations" column: group-level data only, role-based emails, aggregate reporting, data minimization
- Organizer tips: "Use Signal for sensitive details", "Don't include personal info in requests" — concrete, actionable, not abstract

---

## 5) Calls to Action

**What research says:**

- Use concise, action-driven CTAs tailored to each user — avoid vague CTAs like "Submit" or "Learn More" [1]
- A homepage should "only feature 1–3 calls to action" [3]
- Put main CTAs in the hero and repeat them in each relevant section [3][14]
- Match CTA language to user intent [1]
- For crisis users, be clear, welcoming, stigma-free [8]

**Decision:** Two CTAs in the hero (one per audience), one CTA per section. Low-pressure language that matches Relay's trust posture — no SaaS language ("Sign up", "Get started free", "Join the network").

**What this means for the build:**

- Hero: "I Need Help" (primary/blue) + "For Organizations" (outline/secondary)
- Individual section: "Get Help Anonymously" — empathetic, action-oriented
- Organization section: "Get in Touch" — invitational, not transactional
- CTAs are large (`min-h-[52px]`), high-contrast, and repeated where the user would naturally want to act

---

## 6) Trust Building

**What research says:**

- For mutual aid, skepticism is healthy — proactively reduce fear [10][19]
- Include "What we do / What we don't do" in plain language [10]
- Show the team: a "Who We Are" section "really helps newcomers to trust your group" [20]
- Trust signals: clear team info, real contact path, partner logos, security badges [13][20]
- Pilot/restraint language signals maturity, not weakness [13]
- Outcome emphasis: highlight impact stats when available (anonymous, aggregate only) [21]

**Decision:** Build trust through transparency and restraint rather than polish. Proactively name what Relay is and is not. Show real team attribution. Use pilot status as a trust signal, not a disclaimer.

**What this means for the build:**

- "What Relay Is / What Relay Is Not" section with explicit bullet lists
- Pilot status badge with concrete scope: "1 fund hub, 3-5 mutual aid groups, 30-45 day pilot period"
- Footer: "Built by Mythic Works LLC" with link — real team, not anonymous
- Formspree contact form — real, working contact path

**Not yet implemented (blocked on pilot progress):**

- Partner logos / "Supported by" section — pending pilot partnerships
- Outcome metrics — pending pilot data
- "Why we built this" origin narrative

---

## 7) Audience-Specific How-It-Works Flows

**What research says:**

- Process overviews should be simple step diagrams, not paragraphs — reduce cognitive load [9][12]
- Each audience pathway should get its own explanation [1][4]
- The homepage should orient, not explain everything — keep flows brief [4][5]

**Decision:** Replace the original single 3-step organization-only flow with two separate flows embedded in their respective audience sections. The individual flow needs more steps (4) because the passphrase-based encrypted mailbox concept requires more explanation than the org workflow.

**What this means for the build:**

- Individual: 4 steps — Create a mailbox → Choose area and need → Groups reach out → Connect directly
- Organization: 3 steps — Groups join → Groups request funding → Hubs route funds
- Each step is a card with a numbered circle, title, and one-sentence description
- Visual differentiation: blue circles for individual path, dark circles for organization path

---

## 8) Navigation

**What research says:**

- Reduce navigation so visitors don't wander [14]
- Use simple anchored sections instead of a full nav bar [14]
- Limit menu options to match audience pathways [2][3]

**Decision:** Four nav items only, all anchor links to on-page sections. Nav items match the two audience funnels plus the two shared sections visitors are most likely to seek.

**What this means for the build:**

- Desktop: Need Help | For Organizations | Safety | Contact + LanguageSwitcher
- Mobile: LanguageSwitcher only — the page is designed to scroll naturally
- No separate pages, no dropdowns, no hamburger menu

---

## 9) Accessibility and Mobile

**What research says:**

- Mutual aid tools must be "WCAG-compliant and usable" — the audience is broad and often stressed/time-constrained [17]
- Most users will be on phones — use a vertical, scrollable design [11]
- Make buttons large/tappable and avoid hover-only features [11]
- High color contrast, resizable fonts, clear focus indicators, semantic HTML [11][17]
- Alt text on all visuals [11]

**Decision:** Mobile-first, accessible by default. These are not enhancements — they are baseline requirements given Relay's audience.

**What this means for the build:**

- All CTAs use `min-h-[52px]` (exceeds 44px touch target minimum)
- Responsive grids stack to single column on mobile (`grid md:grid-cols-2`, `grid lg:grid-cols-4`)
- High-contrast color pairs: gray-900/white, white/gray-900, blue-600/white
- Semantic HTML: `<header>`, `<nav>`, `<section>`, `<footer>`
- No hover-only interactions anywhere on the page
- Language toggle visible on all screen sizes

---

## 10) Bilingual Support

**What research says:**

- Accessibility includes non-English speakers [11][17]
- Use inclusive phrasing — "you" when addressing the user, "we" to build community [16]

**Decision:** Full EN/ES bilingual support from launch. The communities Relay serves include Spanish-speaking populations — language access is a safety requirement, not a post-launch enhancement.

**What this means for the build:**

- All page content translated via `react-i18next` with `home` namespace
- Both locales have identical key structures — no missing or placeholder translations
- ES translations are human-quality, not machine-generated
- LanguageSwitcher component in header on all screen sizes

---

## 11) Visual Design

**What research says:**

- Choose a calm, trustworthy color palette (blues, greens) [12]
- Use icons or color blocks to differentiate audience sections [1]
- Minimize distractions to keep focus [12]
- Trust signals: security badges, SSL indicators, data privacy cues [13]

**Decision:** Clean, minimal visual design. Use color to differentiate the two audience paths rather than icons (for now). Blue for the individual path (warmth, trust), neutral grays for the organization path (professionalism, restraint).

**What this means for the build:**

- Individual section: `bg-blue-50` background, `bg-blue-600` step circles, `border-blue-100` cards
- Organization section: white background, `bg-gray-900` step circles, `border-gray-200` cards
- Safety section: `bg-gray-900` dark theme to create visual weight and separation
- No hero images, illustrations, or decorative elements — content-first, fast-loading

**Not yet implemented:**

- Icons per audience section to aid visual scanning (research [1] recommends this)
- Partner logos or trust badges (pending partnerships)

---

## Current Page Structure

1. **Header** — Logo + nav (Need Help | For Organizations | Safety | Contact) + LanguageSwitcher
2. **Hero** — Dual CTAs scrolling to respective sections
3. **Individual Path** (`#individual`) — Title, subtitle, features, 4-step how-it-works, privacy guarantees, CTA to `/help`
4. **Organization Path** (`#organizations`) — Title, subtitle, hub/group sub-cards, 3-step how-it-works, CTA to contact
5. **Safety by Design** (`#safety`) — Per-audience safety columns + organizer tips
6. **What This Is / What This Is Not** — Two-card trust-building layout
7. **Pilot Status** (`#pilot`) — Badge, scope, timeline
8. **Contact Form** (`#contact`) — Formspree integration
9. **Footer** — Tagline, privacy policy link, attribution

---

## Open Questions for Future Iterations

- **Partner logos / trust signals:** Research strongly recommends third-party logos and social proof [13][20] — add once pilot partnerships are confirmed
- **Outcome metrics:** Research recommends impact stats for fund hubs and groups [21] — add after pilot produces aggregate data
- **"Why we built this" narrative:** Research says "About Us" helps newcomers trust [20] — consider a short origin story
- **Icons per section:** Research recommends visual guides per audience [1] — add icons to aid scanning
- **Search/discovery for individuals:** Research suggests a location-based search or map [per-audience summary] — individual path currently links to `/help`, consider enriching later
- **Security badges near forms:** Research recommends SSL/security cues near form elements [13] — low priority given HTTPS is default
