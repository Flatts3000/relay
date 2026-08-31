# Social launch kit

Post copy for the four pages built by `marketing/build.mjs`. Written 2026-08-30.

Everything here follows the same rule the pages and the deck do: **no claim that
is not true today.** That constrains the posts more than it constrains most
launch copy, because the honest headline is that nothing has run yet. Posts that
imply a working service would be found out in one click, by an audience whose
entire reason for caution is being lied to by institutions.

## Read this before posting anything

**`/need-help/` should not be promoted to people who need help.** Not yet. The
page exists so the link is safe when someone finds it, and it opens by saying it
cannot help them today and pointing at 211. Posting it as though it were a
working service would send people in a crisis to an empty list.

Share it only in the context of "here is what is being built, tell me if the
framing is wrong" - to organizers, not to people in need. Flip this when the
first fund hub has verified the first groups, and rewrite the page's opening at
the same time.

**The order that makes sense.** `/for-funds/` is the only one whose ask is
currently actionable, because one fund unlocks everything else. `/for-groups/`
is second. `/what-is-relay/` is the general share. `/need-help/` is last and is
not a campaign.

---

## Bluesky and Mastodon

Short, no hashtag stuffing, link on its own line so the card renders.

**The general one**

> Neighbors already cover each other's rent and power bills. Larger funds already
> raise money to back that work. The two mostly cannot find each other, and the
> obvious fix - a directory, an intake form - makes people easier to find by
> exactly the wrong people.
>
> Relay is the version that collects nothing.
>
> https://relayfunds.org/what-is-relay/

**For funds and hubs**

> If you run a pooled fund, you already know the bottleneck is not raising the
> money. It is telling which local groups are real without asking them for
> documents that put them at risk.
>
> Looking for one fund to pilot this. Not asking for money - there is nothing to
> donate to.
>
> https://relayfunds.org/for-funds/

**For organizers**

> Built for mutual aid groups, and the first thing on the page is the list of
> things it does not get to do: not choose who you help, not touch the money, not
> ask about the people you help. There is nowhere in it to put that.
>
> Tell me where this is wrong.
>
> https://relayfunds.org/for-groups/

**For the privacy and open-source crowd** (the most likely to reshare)

> Threat model: assume the database will be read by someone hostile. Not that it
> might be. That it will.
>
> So there is no individual account, no cookie, no IP in anything stored, and
> help requests are sealed in the browser. Served with a subpoena it produces
> blobs nobody can open. AGPL-3.0, every claim checkable.
>
> https://relayfunds.org/what-is-relay/

## LinkedIn

Longer, and the honest status does more work here than it costs.

> **The money exists. It cannot find the people doing the work.**
>
> In a lot of places neighbors cover each other's costs directly - a block, a
> church, a school parents' group putting money together for someone's rent or
> power bill. Separately, larger funds raise money centrally to back exactly that.
> The two sides find each other by word of mouth, or not at all.
>
> The obvious fix makes things worse. A directory that logs searches, an intake
> form that keeps a phone number, a tracking script recording who visited: each is
> standard practice, and each manufactures a record that can be leaked, scraped or
> lawfully demanded. In 2023 three Atlanta Solidarity Fund organizers were arrested
> over what Nonprofit Quarterly describes as routine nonprofit reimbursements.
>
> So I built the version that collects nothing. Groups are vouched for rather than
> documented. People can ask for help without an account, in a message sealed on
> their own device that the server cannot open. The money never passes through it,
> and it never decides who deserves help.
>
> Where it actually stands: built, deployed, open source, and **nobody has used it
> yet.** No group has joined and the live database holds zero records. A group
> cannot be listed until a fund approves it, so one fund is what unlocks the whole
> thing.
>
> That is the ask. One fund, three to five groups, thirty to forty-five days. No
> cost to anyone, and no money is being requested - there is nothing to donate to.
>
> https://relayfunds.org/for-funds/

## The one-line version, for passing along

> Relay connects local mutual aid groups to the funds that back them, without
> building a database of who needed help. Built and open source, no pilot yet,
> looking for one fund to try it: https://relayfunds.org/for-funds/

## Reddit and forums

Communities here punish anything that reads as marketing, and reward the
disclosure. Lead with the status, never bury it.

> **Built a thing for mutual aid funding coordination. Nobody has used it. Tell
> me what is wrong with it.**
>
> [two paragraphs of the problem, then:] It is AGPL-3.0 and deployed, and I am
> one person, so the engineering is the finished part and nothing else is. The
> cryptography has been independently reviewed once; the application around it
> has not, and that is where this kind of design usually fails.

---

## Alt text for the share cards

Required, not optional. Part of this audience uses screen readers, and a
platform that strips the card leaves the alt text as the only description.

| Card                  | Alt text                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `relay-*.png`         | Dark blue card reading "Mutual aid, connected." above relayfunds.org, marked open source, no pilot yet. |
| `what-is-relay-*.png` | Dark blue card reading "The money exists. It cannot find the people doing the work."                    |
| `need-help-*.png`     | Dark blue card reading "Ask a local group for help without saying who you are."                         |
| `for-groups-*.png`    | Dark blue card reading "Reach the money without knowing the right person."                              |
| `for-funds-*.png`     | Dark blue card reading "Fund local groups without collecting anything about them."                      |

## Things not to say

Each of these is a claim the pages deliberately do not make, and the deck was
corrected for making a version of some of them.

- **Anything implying groups are available now.** They are not. Zero.
- **"Anonymous" without qualification.** The rough region and the aid category
  are stored in the clear so a request can be delivered at all. Both pages say
  so. A post that promises more than the page delivers gets caught by anyone who
  reads the page.
- **"Independently audited."** The cryptography was reviewed once by an expert
  and the write-up does not exist in the repository (issue #14). The application
  around it has not been reviewed at all.
- **A named beneficiary, or any story about a person helped.** Relay cannot know
  who it helped, by design. Inventing one to make a post land would abandon the
  thing being announced. Every human moment belongs to organizers.
- **A donation ask.** There is no nonprofit yet and nothing to donate to.
- **Naming the legislator** referenced on `/what-is-relay/` until she agrees.
