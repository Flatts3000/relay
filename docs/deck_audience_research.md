# Who a Relay deck is actually for, and what moves them

Research pass, 2026-08-29, for rebuilding `deck/relay-deck.html`.

The short version: the standard nonprofit deck is built on a mechanism Relay
deliberately destroyed, Relay is not a charity and should not pitch as one, and
it is aiming at the wrong funder market.

---

## 1. The structural problem nobody can design around

The strongest known driver of individual giving is the **identifiable victim
effect**: people give more, and more readily, to one named person than to
statistics about many. It is one of the most replicated findings in the field.

Relay cannot use it. It does not know who it helped. That is not an oversight to
work around later - it is the product. Contact details live inside an encrypted
payload, the ciphertext is destroyed within seven days, and there is no record of
who received what. A "meet Maria, she needed rent" slide is not merely missing;
building the capacity to write one would mean abandoning the design.

So a Relay deck starts one full lever down from every other cause competing for
the same attention, and no amount of copywriting recovers it.

**The available substitute is unitization.** The same literature finds that a
group presented as a single unit - a family, a village - triggers close to the
same response as one person. Relay has an identifiable unit that costs nothing to
disclose: **the group**.

> Powderhorn Neighbors is eleven people and a spreadsheet. They know who on their
> block is behind on rent. What they do not have is a way to reach the fund that
> would cover it without knowing someone who knows someone.

That is a protagonist, it is emotionally legible, and it discloses nothing about
anyone seeking aid. Every human moment in the deck should sit with organizers and
coordinators, never with recipients.

**The second substitute is the threat.** Relay's premise is that mutual aid funds
get surveilled and prosecuted. That is documented, not hypothetical, and naming it
costs no privacy at all - see section 3.

---

## 2. Relay is not a 501(c)(3), and the deck currently implies otherwise

Verified in the repository: Relay is built by **Mythic Works LLC** and licensed
**AGPL-3.0**. There is no charitable entity anywhere in the codebase or docs.

That has hard consequences:

- **An LLC cannot receive tax-deductible donations.** Any "donate" ask is a
  transfer to a private company, and sophisticated donors will notice.
- **Most private foundations cannot grant to it** without expenditure
  responsibility, which many simply decline to take on.
- Some funders in the relevant market genuinely do not care - see section 5 - but
  the general-philanthropy path is closed until this is resolved.

Three routes, in rough order of speed:

| Route                                                 | Speed                | Cost                                      |
| ----------------------------------------------------- | -------------------- | ----------------------------------------- |
| **Fiscal sponsorship** by an existing 501(c)(3)       | weeks                | 5-10% of funds, and a sponsor with a say  |
| **Form a 501(c)(3)**                                  | months, plus IRS lag | filing costs, a board, ongoing compliance |
| **Target funders who fund companies and individuals** | now                  | narrower pool, but a strong fit here      |

This has to be settled before a deck with an ask goes anywhere. It is currently
the single largest blocker between the deck and money.

---

## 3. The urgency is real and it is documented

Mutual aid funds are under active attack, which makes Relay's threat model
concrete rather than speculative. From _Nonprofit Quarterly_'s 2026 survey of the
landscape, plus contemporaneous reporting:

- **Organizers have been prosecuted.** Three Atlanta Solidarity Fund
  organizers - Marlon Kautz, Adele Maclean, Savannah Patterson - were arrested in
  May 2023 and charged with charity fraud and money laundering for what NPQ
  characterises as routine nonprofit reimbursements. The money laundering charges
  were dropped in September 2024; racketeering charges under a 61-defendant RICO
  indictment remain. **State the status precisely or not at all.**
- **Payment rails are a surveillance layer.** IRS reporting thresholds on
  money-sharing apps put a record behind ordinary transfers between neighbours.
- **Co-optation is a named fear.** Organizers actively worry about philanthropy
  and 501(c)(3) structure defanging the work through compliance and
  professionalisation.

NPQ's own recommendations to mutual aid funds include **decentralised organizing
to reduce surveillance vulnerability** and **parallel structures where visibility
is a risk**. That is, almost precisely, Relay's design brief - written
independently, by the sector, for itself.

This is the strongest available replacement for the missing beneficiary story. It
is emotionally charged, verifiable, and about people who chose to be public.

---

## 4. The framing trap: do not pitch this as charity

"**Solidarity, not charity**" is the defining slogan of the movement Relay
serves. The distinction is not decorative. Charity is understood as top-down,
paternalistic, and structurally tied to what organizers call the nonprofit
industrial complex; mutual aid is horizontal and reciprocal.

A deck that positions Relay as _helping the needy_ will read to the groups it
depends on as exactly the thing they organised to avoid. And the groups are not a
side audience - without them there is no product.

**The framing that survives contact with both audiences:** Relay is
_infrastructure for solidarity_. It does not decide who deserves aid, does not
touch distribution, and does not sit between a group and the people it serves.
Distribution decisions stay local; Relay only removes the requirement that
somebody already knows somebody.

That framing is also literally true of the product, which is why it holds up.

---

## 5. Relay is aiming at the wrong funder market

It presents as a human-services charity. It is much closer to a **public-interest
digital security tool**, and that is a distinct, better-fitting funding market:

| Funder                                                                  | Why it fits                                                                                                                                             |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Open Technology Fund** - Internet Freedom Fund                        | Funds digital security tooling, $10k-$900k; explicitly funds technology development and security work, and funds entities beyond 501(c)(3)s             |
| **NLnet** (NGI open calls)                                              | Small-to-mid grants for open technology and privacy-preserving infrastructure; funds individuals and companies; AGPL is a positive signal               |
| **Internet Society Foundation** - Common Good Cyber Fund                | Multi-year grants up to $300k for nonprofits protecting vulnerable communities' cybersecurity; 2026 round prioritises ecosystem building and regranting |
| **Digital Defense Fund** and adjacent reproductive-justice tech funders | Threat model overlaps almost exactly: people avoiding digital trails because the trail is the danger                                                    |

What this market values happens to be what Relay already has and a
human-services funder would not care about: an articulated threat model, a
copyleft licence preventing proprietary capture, an independent cryptography
review, a public issue tracker, and reproducible builds. **The current deck's
"under subpoena" and "what exists" slides are its strongest assets in this
market and its weakest in the other.**

---

## 6. Overhead will be the first objection, and Relay is unusually exposed

Donors report tolerating roughly 19% overhead while believing charities spend
28%; experimental work finds real tolerance closer to 35%. Meanwhile Indiana
University, Stanford and Bridgespan have all found no correlation between low
overhead and effectiveness, and a 2022 study found cutting overhead too far makes
outcomes _worse_.

None of that helps Relay, because by naive accounting **Relay is approximately
100% overhead**. It does not feed anyone. It buys hosting and engineering time.
Every dollar looks like admin.

This must be met head-on rather than hoped past. The honest reframing:

> The software is the program. There is no separate charitable activity to fund -
> a hosted, maintained, audited coordination layer is the entire intervention,
> and it costs what infrastructure costs.

Pair it with a concrete, itemised use of funds. Precision is the antidote here:
research consistently ties perceived operational efficiency and transparency to
donor trust, and vagueness reads as evasion on exactly this point.

---

## 7. Three audiences, three asks - not one deck

Standard nonprofit-deck guidance converges on 10-15 slides: mission, problem with
verifiable data, theory of change, program, outcomes, financials, team, and a
specific ask with an itemised use of funds. That is the right skeleton, but the
emphasis differs sharply by audience, and one deck cannot serve all three.

**Institutional funders** want a theory of change, evidence, a named threat
model, sustainability beyond the grant, and a budget. They will forgive the
absence of traction if the pilot design is rigorous. They will not forgive a
missing entity or a vague ask.

**Individual donors** run on emotion and social proof. Testimonials on a donation
page lift conversion 15-20%; 32% of donors name social media as their top
inspiration. Relay's problem is that its most shareable asset - a story about
someone it helped - is the one thing it will never have. The group-as-protagonist
substitute has to carry this entirely.

**Contributors and partners** are moved by the societal issue, by who owns the
project, and by career and craft. Civic-tech research finds recruitment fails on
_scoping_, not enthusiasm: people need small, bounded first tasks, not an
invitation to a mission. A deck aimed at contributors should end on a
well-labelled good-first-issue list, not a call to arms.

---

## 8. What to change in the current deck

The existing twelve slides are structurally sound and unusually honest. What is
missing is almost entirely emotional and entity-level, not factual.

1. **Add a group-as-protagonist slide, early.** One named group, what their week
   looks like, what breaks. This is the deck's only route to an emotional
   register, and it costs no privacy.
2. **Move the threat forward and make it concrete.** Prosecutions, RICO charges,
   payment-app reporting. Cite precisely. This is the "why now" the deck lacks.
3. **Reframe from charity to solidarity infrastructure.** Say plainly that Relay
   does not decide who deserves help and never touches distribution.
4. **Resolve the entity, then write the ask.** Until then the ask slide stays a
   marked placeholder - which is the correct behaviour, not a gap.
5. **Add an itemised use of funds** and pre-empt the overhead objection in the
   same breath.
6. **Add a theory of change.** Funders expect the activities-to-outcomes chain
   drawn explicitly, and Relay's is unusually clean: remove the introduction
   requirement, and more groups reach more funds faster.
7. **Split contributor recruitment out** into its own short deck or a page, ending
   in bounded first tasks.
8. **Keep the "nobody has used this yet" slide.** In this funder market candour
   about stage is a credibility asset, and the alternative is being caught.

---

## Sources

- [The Psychology of Charitable Donations to Disaster Victims and Beyond](https://www.researchgate.net/publication/267267336_The_Psychology_of_Charitable_Donations_to_Disaster_Victims_and_Beyond)
- [Revisiting and Rethinking the Identifiable Victim Effect](https://mgto.org/wp-content/uploads/2023/10/Maier-etal-2023-Collabra-Small-etal-2007-replication-extension-print.pdf)
- [Behavioral Economics in Charitable Giving: Motivations and Barriers](https://gc-bs.org/articles/behavioral-economics-in-charitable-giving-motivations-and-barriers/)
- [Protecting Solidarity: Countering Attacks on Mutual Aid Funds - Nonprofit Quarterly](https://nonprofitquarterly.org/protecting-solidarity-countering-attacks-on-mutual-aid-funds/)
- [Cop City Bail Fund Arrests Aim to Suppress Free Speech - The Appeal](https://theappeal.org/cop-city-bail-fund-arrests-atlanta-solidarity-fund/)
- [Georgia AG drops money laundering charges against Atlanta Solidarity Fund - Mainline](https://www.mainlineatl.com/georgia-drops-charges-against-atlanta-solidarity-fund-rico-cop-city/)
- [How Philanthropy and Mutual Aid Became Such Strange Bedfellows - Inside Philanthropy](https://www.insidephilanthropy.com/home/2021-4-28-how-philanthropy-and-mutual-aid-became-such-strange-bedfellows)
- [Solidarity, not charity: reconceptualising the radicality of mutual aid](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9347405/)
- [How High Is Too High? An Experimental Analysis of Donors' Aversion to Nonprofit Overhead](https://journals.sagepub.com/doi/10.1177/08997640241254079)
- [New Study Shows Donors Have Little Idea About Charity Overhead - AFP](https://afpglobal.org/new-study-shows-donors-have-little-idea-about-charity-overhead)
- [The overhead myth: crash course to fundraising transparency - Candid](https://candid.org/blogs/the-overhead-myth-crash-course-to-fundraising-transparency/)
- [Open Technology Fund](https://en.wikipedia.org/wiki/Open_Technology_Fund)
- [Common Good Cyber Fund - Internet Society Foundation](https://www.isocfoundation.org/grant-programme/common-good-cyber-fund/)
- [NLnet: 67 Open Technology Projects awarded NGI grants](https://nlnet.nl/news/2026/20260616-67-new-projects.html)
- [Contradicting Motivations in Civic Tech Software Development](https://arxiv.org/pdf/2302.03469)
- [The 2025 Nonprofit Content Playbook - CauseCircle](https://causecircle.org/blog/the-2025-nonprofit-content-playbook-10-ways-to-build-trust-and-raise-more-funds/)
- [Key Elements to Include in a Nonprofit Pitch Deck - SlideGenius](https://www.slidegenius.com/cm-faq-question/what-are-the-key-elements-to-include-in-a-pitch-deck-for-a-nonprofit-organization)
- [How to Make a Nonprofit Pitch Deck for Donors - Storydoc](https://www.storydoc.com/blog/nonprofit-pitch-deck-examples)
