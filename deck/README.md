# Relay partner and funder deck

Served at **relayfunds.org/deck**, and a single self-contained file: fonts and
screenshots are base64-embedded, there are no external requests, and it works
offline. Open `frontend/public/deck/index.html` directly, or send it as an
attachment.

## How it is served, and why it is not in robots.txt

The build writes into `frontend/public/deck/index.html`. Vite copies `public/`
verbatim, so the deck ships with the frontend build and needs no separate deploy.

It is public but kept out of search results by `X-Robots-Tag: noindex, nofollow,
noarchive`, set on the `/deck` location in `deploy/nginx.prod.conf`, plus the
matching `<meta name="robots">` already in the document.

**It is deliberately not disallowed in `robots.txt`, and that is not an
oversight.** A `Disallow` stops a crawler fetching the page, which means it never
sees the `noindex` - and the URL can still be indexed from an external link, with
no snippet. Allowing the fetch and serving `noindex` is what actually keeps it
out. Listing it would also advertise the path to anyone reading `robots.txt`.

`robots.txt` does now exist, which it did not before, and disallows the
signed-in routes. Those all redirect to `/login` for an anonymous request, so
crawling them spends budget on redirect chains and indexes nothing.

Arrow keys, space, click the left and right thirds, or swipe. The URL hash tracks
the slide, so `#7` links straight to a slide.

## Design

The deck takes its palette, type and shape from `frontend/tailwind.config.js`
rather than inventing its own: the primary blue ramp, the teal and amber
accents, Inter for headings and body, JetBrains Mono for labels and figures, the
6/8/12px radii and the three shadows. Surfaces are the app's own - `#f9fafb`
ground, white cards, `#e5e7eb` rules.

It used to be a dark deck with headlines set in Instrument Serif, on the
reasoning that the product blue disappears against a dark ground. That was true
and the conclusion was backwards: the fix was to stop using a dark ground. Two
things fell out of the change. The embedded screenshots are of the light app, so
they now sit flush in their frames instead of glowing out of a dark page, and
the deck stopped being the only Relay surface set in a typeface Relay does not
use.

### Why the shell is plain document flow

The slides are ordinary blocks. There is no `position:fixed` container, no
absolutely positioned slides, no mask overlay and no nested scroller, and only
one slide is ever painted - the incoming slide animates itself rather than
crossfading against the outgoing one.

That is deliberate and worth keeping. The earlier shell had all five, and on iOS
the combination ghosted: the browser retained a stale tile of the slide and
painted the relaid-out copy over it, so a single slide appeared twice at two
different offsets, its own lede running underneath its own heading and card. It
did not reproduce in desktop Chromium or WebKit, which is what a compositing bug
looks like from the outside. If a future change wants a fancier transition, it
needs testing on a real iOS device, not just in a headless browser.

## Rebuilding

```bash
npm i sharp --no-save   # not a repo dependency; only the deck needs it
node deck/build.mjs     # writes frontend/public/deck/index.html
```

Use `--no-save` so `sharp` does not end up in `package.json`. There is one copy
of the artifact, in `frontend/public/deck/`; a second in `deck/` would double 1.1
MB of base64 in every clone.

Screenshots come from `docs/audit_screenshots/ux_audit/`, which is **gitignored** -
those are regenerated from a seeded local database rather than committed. On a
fresh clone the build still succeeds and warns about each missing image; the
affected slides simply render without them. To get them back, seed a local
database and run a capture pass over the routes (see `docs/ux_audit_results.md`).

Without `sharp` the build embeds the PNGs unoptimised, which works but produces a
file roughly twice the size.

**Do not commit a rebuild made without the screenshots or without `sharp`.** The
committed `frontend/public/deck/index.html` is a 1.1 MB generated artifact
that now ships to production, and its diff is a
single line of base64 that nobody can review. A rebuild on a fresh clone silently
drops all six screenshots; a rebuild without `sharp` silently doubles the file.
Either one looks like a normal commit and is invisible in review. Check the build
output before committing:

```
image KB: { home: 209, help: 50, directory: 75, reports: 66, queue: 126, verification: 39 }
wrote frontend/public/deck/index.html: 1130 KB, 15 slides  ->  served at /deck
```

Zeroes in `image KB`, or a total far above ~1.2 MB, mean the artifact is wrong.

## The rule this deck is written under

**Every number in it is measured from the repository or the running deployment.**
Nothing is illustrative, rounded up, or projected.

Where a fact is not yet known it is marked with a dashed amber `.todo` chip
rather than filled in with something plausible. Those chips are meant to be seen,
and to be replaced before the deck is sent. **There are currently none** - the
last one, the contact, was filled in on 2026-08-29.

One thing deliberately left out rather than written for him: a first-person line
on why Jason built this. That is the single strongest addition available to a
co-founder deck, and it is not something anyone else can draft without inventing
a motive.

This matters more here than it would elsewhere. The deck goes to people deciding
whether to trust the project with the safety of undocumented residents and people
fleeing violence. One invented figure discovered later would end that
conversation, and deserve to.

That is also why slide 12 says plainly that no pilot has run and nobody has used
the product, why slide 10 names the metadata Relay does store in the clear
instead of leaving the encryption claim unqualified, and why slide 14 states that the nonprofit is only intended. For this audience the credibility comes from the
disclosure, not in spite of it.

## Who it is aimed at, and why it reads the way it does

Rebuilt on `../docs/deck_audience_research.md`. Three findings shaped it:

**The identifiable victim effect is unavailable.** The strongest driver of
individual giving is one named person, and Relay cannot produce one - it does not
know who it helped, by design. The substitute the research supports is
unitization: a group presented as a single unit works nearly as well. Hence slide
2, where the protagonist is a group of organizers. Every human moment in the deck
sits with organizers, never recipients.

**It is not a charity and must not pitch as one.** "Solidarity not charity" is
the defining distinction of the movement Relay serves; a deck positioning it as
helping the needy reads to the groups it depends on as the thing they organised
against. The framing throughout is infrastructure for solidarity - Relay decides
nothing and touches no distribution.

**It is not fundraising.** Decided 2026-08-29: no money is being sought until
there is a pilot to point at and a 501(c)(3) to receive it. That removed the
costs slide and the ask entirely, and it is stated on the title badge, because a
deck that opens with "nobody is asking you for money" disarms the entity
question, the overhead objection and the related-party question in one line. The
single ask is an introduction to a hub.

When fundraising does start, the natural market is public-interest technology
rather than human services - the threat model, copyleft licence, independent
cryptography review and public issue tracker are what OTF, NLnet and the Common
Good Cyber Fund select on. That is noted on the last slide as future context, not
as an ask.

Slide 2's group is explicitly illustrative and labelled as such on the slide. It
is drawn from `docs/problem_brief.md`, not from a real group - Relay has none
yet, and naming a fictional one would be the same failure as inventing a
statistic.

## Current facts, and where they came from

| Claim                                     | Source                                                                                                                                                                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| screens across four roles                 | counted at build time by `deck/counts.mjs` from route paths in `frontend/src/App.tsx`, excluding the 404 and anything behind `import.meta.env.DEV`                                                                          |
| automated tests                           | counted at build time by `deck/counts.mjs` - `it(`/`test(` declarations that actually run, so `.skip` and `.todo` are excluded                                                                                              |
| Open issue count on slide 14              | counted at build time via `gh issue list`; the slide drops the number entirely if `gh` is missing or unauthenticated                                                                                                        |
| automated checks on every change          | counted at build time by `deck/counts.mjs` from the job definitions in `.github/workflows/ci.yml`. `gh pr checks` reports 12 runs, because CodeQL and the container scan each emit two - the job count is the stable figure |
| Zero records in production                | `select count(*)` against the production database, 2026-08-29                                                                                                                                                               |
| Paused February 2026, resumed August 2026 | commit history                                                                                                                                                                                                              |
| Cryptography independently reviewed       | stated by the project owner; the reviewer, date and scope are still unrecorded ([#14](https://github.com/Flatts3000/relay/issues/14))                                                                                       |

Those three figures are no longer written by hand. They are derived from the
repository every time the deck is built, and `node deck/check-counts.mjs` runs in
CI to fail the build if the committed deck disagrees with the tree - which is
what used to happen silently, and is how "187 automated tests" went out while the
repository held 188.

The check compares figures rather than rebuilding and diffing bytes: the build
fetches webfonts from Google and re-encodes screenshots with sharp, so a byte
comparison would fail on a font revision or a sharp upgrade without either
saying anything about accuracy.

The open-issue count on slide 14 is fetched live at build time and is not
checked, because it legitimately changes without the repository changing. Rebuild
before sending if that number matters to the conversation.

## Editing

Slides are template literals in the `slides` array in `build.mjs`, in order. Each
carries a `data-name` used for the section label in the footer. Add or reorder
freely - the counter, progress bar and navigation all derive from the array
length.
