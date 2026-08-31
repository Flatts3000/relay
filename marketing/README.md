# The public marketing pages

Four static pages, built into `frontend/public/` and served from the root of
relayfunds.org:

| URL               | Written for                          |
| ----------------- | ------------------------------------ |
| `/what-is-relay/` | Anyone. The one to paste into a feed |
| `/need-help/`     | A person who needs help              |
| `/for-groups/`    | Someone who organizes a local group  |
| `/for-funds/`     | Someone who helps run a pooled fund  |

Each carries its own Open Graph and Twitter Card tags and its own 1200x630 share
card, so a link pasted into Bluesky, Mastodon, Signal, LinkedIn or a group chat
renders as something other than a bare URL. Before this existed, no page on the
site had a single Open Graph tag, including the site root.

## Rebuilding

```bash
npm i sharp --no-save   # not a repo dependency; only the share cards need it
node marketing/build.mjs
```

Unlike the deck, `sharp` is **required** rather than optional. The deck degrades
to a larger file without it; these pages would degrade to having no preview
image, which is the one thing they exist to fix, so the build stops instead.

The build writes:

- `frontend/public/<slug>/index.html` for each of the four pages
- `frontend/public/share/<slug>-<hash>.png`, the share cards
- `frontend/public/fonts/*.woff2`, fetched once and cached across rebuilds
- `frontend/public/sitemap.xml`
- the share-card URLs inside the marked block in `frontend/index.html`

Vite copies `public/` verbatim, so all of it ships with the frontend build and
needs no separate deploy step.

## Why the fonts are files here and base64 in the deck

The deck inlines its fonts because it has to work offline as an email
attachment. These pages are fetched over the web, so the four faces are real
files served from this origin and cached across all four pages.

That is not only a size decision. `frontend/index.html` links
`fonts.googleapis.com`, which hands a third party the address of every visitor
to the app. `CLAUDE.md` rules out tracking who browses the public directory, and
a webfont request is tracking whether or not anyone intended it as any. These
pages make no third-party requests at all, which matters most on `/need-help/`.

**The app itself still has this problem.** Fixing it means pointing
`frontend/index.html` at `/fonts/` the way these pages do, and fetching the 500
weight the app also uses. That is a change to the application rather than to
these pages, so it is not made here.

## The share cards

Rendered from SVG by `sharp` at build time rather than designed by hand, so a
copy change cannot leave a card advertising the old headline.

The filenames carry a content hash on purpose. nginx serves `.png` from this
tree with `Cache-Control: public, immutable, max-age=31536000`, so a card edited
under a stable name would keep showing the old image in every crawler and CDN
that had already fetched it. The build deletes a page's previous card when it
writes a new one.

The typeface is whatever the build machine resolves from
`Inter, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif`. librsvg does not
read the `woff2` files the build fetches, so this is Inter only if Inter is
installed locally, and a close system sans otherwise. **Open the PNGs before
committing them** rather than assuming.

## Serving

They are ordinary directories with an `index.html`, served by the SPA fallback
in `deploy/nginx.prod.conf`. Two things there are load-bearing:

- `absolute_redirect off` at the server level, **in both configs**. A request for
  `/for-groups` redirects to `/for-groups/` before it is served, and nginx sits
  behind Caddy, which terminates TLS. Without this, nginx emits
  `http://relayfunds.org/...`, downgrading the scheme and costing a second hop
  back through Caddy's HTTPS redirect. Verified in a real nginx container, not
  reasoned about.

  It is set in `deploy/nginx.prod.conf` **and** in `frontend/nginx.conf`, which
  is the copy baked into the image and the one the root `docker-compose.yml`
  runs with no bind mount. Production mounts the former over the latter, so the
  second copy never serves a real visitor - but the two must not disagree, or
  the behavior vanishes silently if the mount is ever dropped. That file's own
  header says so, and commit f01ac7e exists because this pair drifted before.

- **No `X-Robots-Tag`.** This is the opposite of `/deck`, which is deliberately
  kept out of search results. These pages are meant to be indexed, and they are
  listed in `sitemap.xml`, which `robots.txt` now points at.

## The rules the copy is written under

Both are inherited from the deck, and `pages.mjs` restates them at the top.

**Every number is measured from the repository or the running deployment.**
Nothing is illustrative, rounded up, or projected. The figures on the stat rows
are computed by `deck/counts.mjs` at build time and compared against the
committed pages by `marketing/check-counts.mjs`, which CI runs. Verified by
tampering a committed page down to 188: the check fails, names the page and the
discrepancy, and prints the rebuild command.

**Nothing assumes the reader has been in the room.** Mutual aid is defined
before it is used. A fund hub is defined the first time it appears on each page,
separately, because a shared page is entered from a link rather than read in
order. The vocabulary dropped from the deck in #69 and #72 stays dropped.

### The one that constrains the product, not just the writing

**`/need-help/` opens with a warning instead of a call to action.** No group has
joined, and a group cannot be listed until a fund hub approves it, so anyone
following a "find a group near you" button today reaches an empty list. Someone
in a crisis who is told to ask and gets nothing back has been actively harmed by
the page, not merely underserved. Until the first hub verifies a group, the page
says so on its first line and points at 211 instead.

That inversion should be undone the moment the first groups are live, and not
before. `/for-groups/` carries the matching disclosure: signing up today is
registering interest ahead of a pilot, not switching on a working service.

## Changing the copy

Edit `pages.mjs` and rebuild. `build.mjs` is mechanics: fonts, CSS, block
rendering, cards, sitemap. No copy lives in it.

A plain-language pass changes meaning by default unless each line is checked
against what it replaced. That is not a hypothetical: the readability pass in
#72 introduced four separate accuracy regressions into the deck, including one
on the slide whose entire purpose was that the threat model is precisely
sourced. Check the claim, not just the sentence.
