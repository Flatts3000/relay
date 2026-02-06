# User Personas

## Overview

Relay serves four distinct actor types. Each has different goals, fears, technical comfort levels, and relationships to the system. These personas should guide every design and development decision.

---

## 1. Maria — Individual Resident Seeking Help

**Role:** Anonymous help seeker

**Background:** Maria is a 34-year-old mother of two living in Hennepin County, MN. She works part-time as a home health aide. Her hours were cut last month and she's $800 short on rent, due in nine days. She's undocumented. She heard from a neighbor that there might be a website where you can ask for help without giving your name.

**Goals:**

- Find a local group that can help with rent — fast
- Do this without creating any record that ties back to her identity
- Understand what's happening at each step without needing to read a lot of English

**Fears:**

- That entering information online creates a trail ICE or landlords could access
- That she'll need to make an account, provide an email, or show ID
- That she won't understand the passphrase system or will lose the paper she writes it on
- That no one will respond

**Tech profile:**

- Uses an Android phone (not a computer) on a prepaid plan
- Comfortable with WhatsApp and Facebook but not with "official" websites
- May be on a shared or borrowed device
- Unreliable internet — pages need to load fast and work on slow connections

**How she uses Relay:**

1. Visits the site from her phone, taps "I need help"
2. Sees a passphrase generated for her, writes it on a piece of paper
3. Selects "Rent" and picks "Hennepin County, MN" from the autocomplete
4. Comes back two days later, enters her passphrase, finds an encrypted message from a local group with a phone number to call
5. Calls the group directly. Relay is no longer involved.

**What success looks like for Maria:**

- She never had to give her name, email, or phone number to the website
- She found help within days, not weeks
- If someone subpoenaed Relay, there would be nothing connecting her to the request

**Design implications:**

- Mobile-first, large tap targets, minimal text
- Bilingual (English/Spanish) at every step
- No accounts, no cookies, no tracking on anonymous routes
- Passphrase UX must be dead simple — clear instructions, copy button, strong visual emphasis on "write this down"
- The autocomplete for region must work on slow connections (static dataset, no API calls)

---

## 2. DeShawn — Group Coordinator

**Role:** Group coordinator (authenticated user)

**Background:** DeShawn is a 41-year-old community organizer who runs a mutual aid group out of his church in North Minneapolis. The group has about 15 active volunteers and serves roughly 50 families a month with food, utilities assistance, and occasional rent help. He's been doing this work for three years. He knows everyone on his block but has no relationship with the bigger statewide funds.

**Goals:**

- Get his group connected to a fund hub so they can access larger pools of money for rent emergencies
- See anonymous help requests from people in his service area and respond quickly
- Submit funding requests on behalf of his group's work without drowning in paperwork
- Track whether a funding request was approved and when money is coming

**Fears:**

- That this becomes another compliance tool that treats his group like a grant applicant
- That verification will require paperwork his informal group can't produce
- That he'll be asked to report on individual recipients (he refuses on principle)
- That the system will be slow or confusing for his less tech-savvy volunteers

**Tech profile:**

- Uses a laptop and phone interchangeably
- Comfortable with email, Google Docs, and basic web apps
- Not a developer — needs things to be obvious, not clever
- Checks the platform a few times a week, not constantly

**How he uses Relay:**

1. Registers his group with a pseudonymous name, service area (North Minneapolis, MN), and a role-based email
2. Gets verified through peer attestation (two other groups vouch for his)
3. Sees anonymous help requests matching his area — "Rent, Hennepin County, MN"
4. Sends an encrypted reply with his group's contact info
5. Submits funding requests to the hub: "$2,400 for rent assistance, urgent, North Minneapolis"
6. Checks dashboard to see if the request was approved

**What success looks like for DeShawn:**

- His group got connected to a hub without needing a personal introduction
- He can respond to people in need without knowing who they are
- Funding requests are simple — no narratives about individual families
- He never has to report on who received help

**Design implications:**

- Dashboard should surface what matters: open help requests, pending funding requests, verification status
- Funding request form must be fast — a few fields, not a grant application
- Encrypted reply flow must be simple — he's not thinking about cryptography, he just wants to send his phone number
- Verification should feel like community trust, not bureaucratic approval

---

## 3. Angela — Hub Administrator

**Role:** Hub admin (authenticated user)

**Background:** Angela is the operations director for a statewide mutual aid fund in Minnesota. The fund raises $200K–$400K per year through community donations and redistributes it to local groups. She currently manages relationships with about 20 groups through email, spreadsheets, and quarterly check-ins. She knows she's missing groups that could use the money.

**Goals:**

- Discover and connect with more local groups, especially in underserved areas
- Review and approve funding requests efficiently without micromanaging groups
- Have confidence that funds are going to real, functioning groups (but not through invasive verification)
- Produce aggregate reports for the fund's board and donors — totals by category, number of groups supported, average time to funding

**Fears:**

- That the system will surface individual recipient data she doesn't want to see or be responsible for
- That groups will submit fraudulent requests (low probability but high consequence)
- That she'll lose the personal relationships that make mutual aid work
- That reporting will be too granular and create pressure to surveil

**Tech profile:**

- Comfortable with web apps, spreadsheets, and basic data tools
- Uses a laptop primarily
- Wants things that save time, not add process
- Checks the platform daily during active cycles

**How she uses Relay:**

1. Logs in and sees a list of registered groups with their service areas, categories, and verification status
2. Reviews new verification requests — approves groups vouched for by existing trusted groups
3. Reviews incoming funding requests: amount, category, urgency, region
4. Approves or declines requests, optionally asks clarifying questions at the group level
5. Marks funds as sent when the transfer is made
6. Pulls aggregate reports for board meetings: total funds by category, groups supported, time-to-funding

**What success looks like for Angela:**

- She connected with 5 new groups she didn't know existed
- Funding requests take minutes to review, not days of back-and-forth
- She never sees a single recipient's name or personal details
- Her board report shows impact without surveillance

**Design implications:**

- Group list with filters (status, category, service area) — not a wall of cards
- Funding request queue should feel like a lightweight inbox, not a grant review system
- Aggregate reports only — no drill-down to individual level
- Verification workflow should be approvals and attestations, not document review

---

## 4. Pastor James — Verifier / Sponsor

**Role:** Verifier (implicit role, not a separate account type)

**Background:** Pastor James leads a congregation in South Minneapolis that has been supporting mutual aid efforts for years. He doesn't run a group himself, but he knows which groups are real because they use his church's kitchen, his parking lot for food distributions, and his network for volunteer recruitment. He's the kind of person everyone calls when they need to know "is this group legit?"

**Goals:**

- Vouch for groups he knows without taking on liability
- Do this quickly — he has a congregation to run
- Understand exactly what his attestation means (and what it doesn't)

**Fears:**

- That vouching creates legal exposure for him or his church
- That the process will be time-consuming or require him to fill out forms
- That his attestation will be misrepresented as a formal endorsement

**Tech profile:**

- Uses his phone for most things
- Comfortable with email and basic web forms
- Low patience for complicated interfaces

**How he uses Relay:**

- Receives a request (through the platform or out-of-band) to attest for a group
- Reviews the group's name and service area — recognizes them
- Submits a simple attestation: "I can confirm this group is active in my community"
- Done. No ongoing obligation.

**What success looks like for Pastor James:**

- The whole thing took 5 minutes
- He didn't have to create an account or produce documents
- His name isn't publicly attached to the group in the system
- He feels like he helped without taking on risk

**Design implications:**

- Attestation flow must be minimal — one screen, one action
- Clear language about what attestation means and doesn't mean
- No ongoing monitoring or reporting obligations
- Works on mobile

---

## 5. Tomás — Community Member Looking for a Group

**Role:** Public visitor (no account, no passphrase)

**Background:** Tomás is a 28-year-old renter in St. Paul. He's not in crisis right now, but things are tight and getting tighter. His coworker mentioned that there's a mutual aid group in his neighborhood that helps people with utilities and groceries — "something called Eastside Solidarity, I think." He wants to find them. He's also curious whether there are other groups nearby. He doesn't want to fill out a form or create an anonymous mailbox — he just wants to find the group and contact them directly.

**Goals:**

- Find a specific group he heard about, or discover groups that serve his area
- See what kind of help they offer (rent, food, utilities)
- Get their contact information so he can reach out directly
- Do all of this without creating an account or providing any personal information

**Fears:**

- That finding help means entering his information into a system
- That browsing a directory will be tracked or logged
- That the groups listed are outdated or inactive
- That he'll have to explain his situation to a website before he can even find a phone number

**Tech profile:**

- Uses his phone for everything
- Comfortable searching the web, but won't download an app or create an account for a one-time lookup
- English is his second language — he can read it fine but prefers simple, clear text

**How he uses Relay:**

1. Searches "mutual aid St. Paul" or follows a link his coworker texted him
2. Lands on a public group directory page
3. Types his city or county into a search/filter
4. Sees a list of verified groups serving his area — name, aid categories, and a way to contact them
5. Finds Eastside Solidarity, sees they help with utilities
6. Contacts them directly using the info listed. Done.

**What success looks like for Tomás:**

- He found the group in under a minute
- He never created an account, entered an email, or clicked through a passphrase flow
- No cookies, no tracking, no record of his visit
- He also discovered two other groups he didn't know about

**Design implications:**

- Public group directory — browsable and searchable without authentication
- No tracking, analytics, or cookies on the directory page (same privacy guarantees as anonymous routes)
- Directory shows only what groups have opted to make public: name, service area, aid categories, contact method
- Search/filter by region (using the same autocomplete dataset) and aid category
- Must be fast on mobile, low bandwidth — static or pre-rendered where possible
- Clear visual distinction between the directory (browse groups) and the help request flow (anonymous mailbox) — these are different paths for different needs
- Bilingual support

---

## Anti-Persona: The System We Refuse to Build For

**"DataView Admin"** — a hypothetical user who wants to:

- See which individuals requested help
- Cross-reference requests by location or timing to identify people
- Export recipient-level data for compliance or reporting
- Track browsing patterns of anonymous users
- Require individuals to verify their identity before receiving help

This user does not exist in Relay. The system is designed so that even if someone with these goals gained access, the data simply isn't there. Messages are encrypted. Individuals are anonymous. Mailboxes are ephemeral. There is nothing to surveil.

---

## Summary Table

| Persona      | Role                 | Auth              | Primary Action                           | Biggest Fear                              |
| ------------ | -------------------- | ----------------- | ---------------------------------------- | ----------------------------------------- |
| Maria        | Individual in crisis | None (passphrase) | Request help anonymously                 | Creating a traceable record               |
| Tomás        | Community member     | None              | Find and contact a local group           | Being tracked for browsing a directory    |
| DeShawn      | Group Coordinator    | Email login       | Respond to requests, submit funding asks | Being treated like a grant applicant      |
| Angela       | Hub Admin            | Email login       | Review groups, approve funding           | Seeing individual data she shouldn't have |
| Pastor James | Verifier             | Minimal           | Vouch for a group                        | Legal exposure from attestation           |
