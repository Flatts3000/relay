# Relay partner and funder deck

`relay-deck.html` is a single self-contained file: fonts and screenshots are
base64-embedded, there are no external requests, and it works offline. Open it in
a browser, or send it to someone as an attachment.

Arrow keys, space, click the left and right thirds, or swipe. The URL hash tracks
the slide, so `#7` links straight to a slide.

## Rebuilding

```bash
npm i sharp          # not a repo dependency; only the deck needs it
node deck/build.mjs
```

Screenshots come from `docs/audit_screenshots/ux_audit/`, which is **gitignored** -
those are regenerated from a seeded local database rather than committed. On a
fresh clone the build still succeeds and warns about each missing image; the
affected slides simply render without them. To get them back, seed a local
database and run a capture pass over the routes (see `docs/ux_audit_results.md`).

Without `sharp` the build embeds the PNGs unoptimised, which works but produces a
file several times larger.

## The rule this deck is written under

**Every number in it is measured from the repository or the running deployment.**
Nothing is illustrative, rounded up, or projected.

Where a fact is not yet known - the funding ask, who to contact - it is marked
with a dashed amber `.todo` chip rather than filled in with something plausible.
Those chips are meant to be seen, and to be replaced before the deck is sent.

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

| Claim                                     | Source                                                                                                                                |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 37 routes across four roles               | route paths in `frontend/src/App.tsx`, excluding the 404 and the dev-only design system; cross-checked against the page components    |
| 187 automated tests                       | 148 backend + 39 frontend, from `npm test`                                                                                            |
| Checks on every change                    | the job list in `.github/workflows/ci.yml`                                                                                            |
| Zero records in production                | `select count(*)` against the production database, 2026-08-29                                                                         |
| Paused February 2026, resumed August 2026 | commit history                                                                                                                        |
| Cryptography independently reviewed       | stated by the project owner; the reviewer, date and scope are still unrecorded ([#14](https://github.com/Flatts3000/relay/issues/14)) |

Re-check these before sending. The test counts and route count in particular
drift with every merge, and a deck that is quietly six weeks stale is its own
kind of inaccuracy.

## Editing

Slides are template literals in the `slides` array in `build.mjs`, in order. Each
carries a `data-name` used for the section label in the footer. Add or reorder
freely - the counter, progress bar and navigation all derive from the array
length.
