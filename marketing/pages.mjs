/**
 * The copy for the four public marketing pages, kept apart from build.mjs so
 * that changing a sentence does not mean reading a build script.
 *
 * Two rules govern everything in this file, both inherited from the deck.
 *
 * 1. Every number is measured from the repository or the running deployment.
 *    Nothing is illustrative, rounded up, or projected. The figures on the
 *    stat rows are computed at build time by deck/counts.mjs and checked in CI
 *    by marketing/check-counts.mjs, so they cannot quietly go stale.
 *
 * 2. Nothing assumes the reader has been in the room. "Mutual aid" is defined
 *    before it is used. "Fund hub" is defined the first time it appears on
 *    each page, because a shared page is entered from a link and not in order.
 *    The words this project dropped from the deck in #69 and #72 stay dropped:
 *    no E2E, TTL, threat model, attestation, payload, onboarded, coordination
 *    layer, aggregate reporting, or arbiter. Where a fact is said from the
 *    point of view of the person it happens to, that phrasing wins.
 *
 * The uncomfortable one, and the reason /need-help leads with a warning rather
 * than a call to action: no group has joined, and a group cannot be listed
 * until a fund hub approves it. Sending someone in crisis to an empty list
 * without saying so would be the exact overstatement slide 12 of the deck
 * promises this project will not make.
 */

// ---- Small content helpers --------------------------------------------------
// These exist so a page below reads as prose and structure rather than markup.

export const hero = (o) => ({ type: 'hero', ...o });
export const band = (o) => ({ type: 'band', ...o });
export const cards = (o) => ({ type: 'cards', ...o });
export const ledger = (o) => ({ type: 'ledger', ...o });
export const steps = (o) => ({ type: 'steps', ...o });
export const stats = (o) => ({ type: 'stats', ...o });
export const note = (o) => ({ type: 'note', ...o });
export const doors = (o) => ({ type: 'doors', ...o });
export const status = (o) => ({ type: 'status', ...o });

// Repeated verbatim on every page. A reader who arrives on one page from a link
// has not read any of the others, so the honest status cannot live in one place.
export const STATUS = status({
  eyebrow: 'Where this actually stands',
  title: 'Nobody has used this yet.',
  body:
    'The software is built and running, and no group has joined. The live database holds zero ' +
    'records. A group cannot appear in the public list until a fund hub approves it, so the ' +
    'first fund to take part is what makes both the list and the anonymous requests work at ' +
    'all. Saying so plainly is deliberate: a project asking to be trusted with other ' +
    "people's safety does not get to overstate itself.",
  facts: [
    ['Paused, then restarted', 'Work stopped in February 2026 after the last planned stage shipped, and started again in August 2026 to repair the deployment and clear the known problems.'],
    ['One person built it', 'Everything described on these pages was written by one contributor. The engineering is the part that is finished. Nothing else is.'],
    ['No money is being asked for', 'Mythic Works LLC is building Relay and intends to hand it to a nonprofit, which is not formed yet. There is no donation button and no fundraising.'],
  ],
});

// ---- 1. The general page ----------------------------------------------------
// The one meant to be pasted into a feed by someone who is not in any of the
// three named audiences. It has to define mutual aid before it uses it, because
// most people arriving from a link have only ever heard the phrase in passing.

const whatIsRelay = {
  slug: 'what-is-relay',
  navLabel: 'What Relay is',
  ogKicker: 'RELAYFUNDS.ORG',
  ogHeadline: 'The money exists.\nIt cannot find the\npeople doing the work.',
  title: 'Relay: the money exists, it cannot find the people doing the work',
  description:
    "Neighbors already cover each other's rent, power bills and groceries. Larger funds already " +
    'raise money to back that. Relay connects the two without building a record of who needed help.',
  blocks: [
    hero({
      badge: 'Free and open source · Built and running · No pilot yet',
      title: 'The money exists. It cannot find the <em>people doing the work</em>.',
      ledes: [
        "In a lot of places, neighbors cover each other's costs directly. A block, a church, a school parents' group, putting money together for someone's rent, a power bill, or groceries. People who do this call it mutual aid.",
        'Separately, larger funds raise money centrally to back exactly that kind of work. Today the two sides find each other by word of mouth, or they do not find each other at all.',
        'Relay is the connection that is missing between them. It never decides who deserves help, and the money never passes through it.',
      ],
      chips: [
        ['Encrypted', 'so only the group can read it'],
        ['No accounts', 'for people asking for help'],
        ['Open source', 'nobody can take it private'],
        ['EN / ES', 'every screen, both languages'],
      ],
    }),

    band({
      eyebrow: 'Two things go wrong',
      title: 'Not a fundraising problem. A <em>finding-each-other</em> problem.',
      lede:
        'The money is not the scarce part. Three groups of people who need each other cannot safely ' +
        'meet, and each blocked path fails for a different reason.',
    }),
    cards({
      items: [
        ['A fund holds money it cannot place', 'An organization that raises money centrally - a solidarity fund, a bail fund, a foundation - has no safe way to tell which local groups are real. So it funds the ones somebody happened to introduce.'],
        ['A group knows exactly who needs what', 'The people on the block know whose power is about to be cut. Reaching the fund that would cover it means already knowing somebody who knows somebody.'],
        ['A person will not leave a trail', 'Someone in trouble will not fill in a form that keeps their name. Looking for help should not be the thing that puts them at risk.'],
      ],
    }),
    note({
      body:
        '<b>The one outside signal this project has:</b> a sitting state legislator, approached ' +
        'independently, named the absence of a safe way to find local aid as her most pressing ' +
        'need. Left unattributed here until she agrees to be named.',
    }),

    band({
      eyebrow: 'Why the obvious version is worse than nothing',
      title: 'Every ordinary solution makes people <em>easier to find</em>.',
      lede:
        'A list that logs searches. An intake form that keeps a phone number. A tracking script that ' +
        'records who visited. Each of those is standard practice, and each one manufactures a record ' +
        'that can be leaked, scraped, or lawfully demanded later.',
    }),
    cards({
      items: [
        ['Assume it will be taken', 'The starting assumption is that the database will one day be read by someone hostile. Not that it might be. That it will.'],
        ['Do not collect it in the first place', 'Information that was never collected cannot be handed over. Relay holds no records about individuals to protect, because it never takes any.'],
        ['Vouch instead of verify', 'A fund approves a group, another group vouches for it, or an established organization refers it. No ID, no membership lists, no documents, at any point.'],
      ],
    }),

    band({
      eyebrow: 'Said narrowly on purpose',
      title: 'A thin layer between funds and groups. <em>Nothing more.</em>',
    }),
    ledger({
      is: [
        'A list of local groups, each vouched for by someone, that anyone can search with no account and nothing recorded about the search',
        'A way for a group to ask a fund for money, and for the fund to answer. Never for a person to ask',
        'A way to ask nearby groups for help without saying who you are',
      ],
      not: [
        'A judge of who deserves help. Relay never makes that decision',
        'Anywhere along the path the money takes. It never passes through Relay',
        'A caseworker system, or a benefits application',
        'A database of people who needed help',
      ],
    }),

    band({
      eyebrow: 'Not a concept',
      title: 'Built, deployed, and <em>open to inspection</em>.',
      lede:
        'Anyone can read every line of this, run their own copy of it, or check any claim on this ' +
        'page against the code that makes it. The licence means nobody can ever make it private, ' +
        'including whoever ends up owning it.',
    }),
    stats({}),

    STATUS,

    doors({
      eyebrow: 'Three ways in',
      title: 'Where you fit.',
      items: [
        ['I need help', '/need-help/', 'What happens when you ask, what is kept, and what is not.'],
        ['I organize a local group', '/for-groups/', 'What joining involves, and what Relay does not get to do to your work.'],
        ['I help run a fund', '/for-funds/', 'What routing money through this looks like, and the pilot being asked for.'],
      ],
    }),
  ],
};

// ---- 2. For someone who needs help -----------------------------------------
// The page written at the lowest reading level and with the most care.
//
// It opens with a warning rather than a call to action, and that is not a
// design preference. No group has joined and none can be listed until a fund
// hub approves one, so anyone following a "find a group near you" button today
// reaches an empty list. Someone in a crisis who is told to ask and gets
// nothing back has been actively harmed by the page, not merely underserved.
// Until the first hub verifies a group, the honest version of this page
// explains what Relay will do and tells the reader to go somewhere real now.
//
// The shared-computer warning is the same one the running app shows, from
// frontend/src/locales/en/help.json.

const needHelp = {
  slug: 'need-help',
  navLabel: 'I need help',
  ogKicker: 'RELAYFUNDS.ORG',
  ogHeadline: 'Ask a local group\nfor help without\nsaying who you are.',
  title: 'Relay: ask a local group for help without saying who you are',
  description:
    'How it will work, what is kept, and what is not. Not ready yet: no groups have joined, so ' +
    'nothing sent today would reach anyone. Here is where to go instead.',
  blocks: [
    hero({
      warn: true,
      badge: 'Not working yet · Read this first',
      title: 'This cannot help you today, and we will not pretend it can.',
      ledes: [
        '<b>No groups have joined Relay yet.</b> If you sent a request right now, there would be nobody on the other end to receive it. We would rather tell you that on the first line than waste your time.',
        'If you need help today, contact a local mutual aid group, a community organization, or a place of worship near you directly. In the United States you can also dial <b>211</b>, a free phone line that points people to local help.',
        'The rest of this page explains what Relay will do once local groups have joined, so you can decide later whether it is something you would use.',
      ],
    }),

    note({
      warn: true,
      body:
        '<b>Using a shared or borrowed computer?</b> Open a private browsing window before you read ' +
        'on, so this page does not stay in the history. On most phones and computers that is called ' +
        'private, incognito, or InPrivate browsing.',
    }),

    band({
      eyebrow: 'What it will do',
      title: 'You ask. Only nearby groups can read it. <em>Relay cannot.</em>',
      lede:
        'The idea is simple. You write a message saying what you need and how someone can reach you. ' +
        'That message is locked on your own phone or computer before it is sent, and only the local ' +
        'groups working in your area are given a key. Relay stores it and cannot open it.',
    }),
    steps({
      items: [
        ['You write it', 'Pick roughly where you are and what kind of help you need, such as rent, food, or a utility bill. Write a short message. Include a phone number, an email, or any other way someone can reach you.'],
        ['It is locked before it leaves', 'Your phone or computer locks the message before sending it. Nobody at Relay can read it, then or ever. There is no account to make and no password to remember.'],
        ['You get a safe word', 'You are shown a short word to remember or write down. That is the only thing you need to keep.'],
        ['A group contacts you', 'A local group opens the message, sees how to reach you, and gets in touch directly. They will say your safe word. That is how you know the call or message is really from someone who saw your request, and not from someone pretending.'],
      ],
    }),

    band({
      eyebrow: 'What is kept, and what is not',
      title: 'The honest version, including the parts that are <em>not</em> perfect.',
    }),
    ledger({
      isLabel: 'KEPT',
      notLabel: 'NEVER',
      is: [
        'The locked message, which nobody at Relay can open, until a group confirms it or seven days pass. Then it is deleted',
        'The rough area you chose and the kind of help you asked for. These are kept unlocked, because they are how the message reaches the right groups at all',
      ],
      not: [
        'Your name, address, phone number or email. Those sit inside the locked message, which Relay cannot open',
        'Any account, because you never make one',
        'Your device address, or any cookie. Nothing that identifies you is written down when you visit',
        'Any record that you searched, or that you were helped',
      ],
    }),
    note({
      body:
        'That second kept item is a real limit and is written here rather than left out. The area and ' +
        'the kind of help have to be readable for the message to be delivered to anyone. Someone who ' +
        'took the database would learn that a person somewhere in your county asked for help with ' +
        'rent. They would not learn who, or how to reach you.',
    }),

    band({
      eyebrow: 'Who is on the other end',
      title: 'Local groups. Not a government office, and not a charity you apply to.',
      lede:
        'The groups on Relay are neighbors who put money together for each other: a block, a church, ' +
        "a school parents' group. They decide for themselves who they help. Relay does not review " +
        'you, score you, or decide whether you qualify, and it never sees the money.',
    }),

    STATUS,

    doors({
      eyebrow: 'Also here',
      title: 'The other two doors.',
      items: [
        ['I organize a local group', '/for-groups/', 'What joining involves, and what Relay does not get to do to your work.'],
        ['I help run a fund', '/for-funds/', 'What routing money through this looks like, and the pilot being asked for.'],
        ['What Relay is', '/what-is-relay/', 'The whole thing, explained from the start.'],
      ],
    }),
  ],
};

// ---- 3. For people who organize a local group ------------------------------
// This audience's first reaction to any new tool is suspicion, and the research
// in docs/deck_audience_research.md says why: "solidarity not charity" is the
// defining distinction of the movement, and a tool that positions itself as
// helping the needy reads as the thing they organized against. So the page
// leads with what Relay does not get to do, and only then with what it offers.

const forGroups = {
  slug: 'for-groups',
  navLabel: 'I organize a group',
  ogKicker: 'FOR LOCAL GROUPS',
  ogHeadline: 'Reach the money\nwithout knowing\nthe right person.',
  title: 'Relay for local groups: reach the money without knowing the right person',
  description:
    'Relay makes no decisions about your work, never touches your money, and asks for no documents. ' +
    'What it does is remove the personal introduction as the price of reaching a fund.',
  blocks: [
    hero({
      badge: 'For organizers &middot; No cost &middot; No documents &middot; Open source',
      title: 'You already know who needs what. <em>Reaching the money</em> is the broken part.',
      ledes: [
        'You know who on your block is behind on rent, whose power is about to be cut, which family stopped answering the door. That is the hard part, and it is the part that cannot be systematized.',
        'What is missing is a way to reach the funds that would cover it without already knowing somebody who knows somebody. So the money sits in one place and the knowledge sits in another.',
        'Relay exists to remove the introduction, and to do nothing else.',
      ],
      chips: [
        ['No cost', 'to take part'],
        ['No documents', 'no IDs, no membership lists'],
        ['A pseudonym', 'is an acceptable group name'],
      ],
    }),

    band({
      eyebrow: 'First, what it does not do',
      title: 'Relay decides nothing about your work.',
      lede:
        'Worth stating before anything else, because a tool arriving in this space should be judged ' +
        'against the worry that foundation structure and its rules blunt the work. That worry is ' +
        'reasonable, and this is the answer to it.',
    }),
    cards({
      items: [
        ['It does not choose who you help', 'Every decision about who gets what stays with your group. Relay has no eligibility rules, no scoring, and no view into your distributions.'],
        ['It does not touch the money', 'Funds move directly between the fund and your group. Nothing passes through Relay, and Relay takes no cut.'],
        ['It does not ask about the people you help', 'No names, no receipts, no case notes, no narratives. There is nowhere in Relay to put that information, which is the point.'],
        ['It does not report on you', 'A fund sees what it funded and when. It does not see who you served, or anything you did not send it.'],
      ],
    }),

    band({
      eyebrow: 'What joining involves',
      title: 'Four steps, and none of them is paperwork.',
    }),
    steps({
      items: [
        ['Register', 'A group name, which can be a pseudonym. The area you serve. The kinds of aid you work on, such as rent, food or utilities. One contact address, and a shared team address is what groups are asked for rather than any one person&rsquo;s. Nothing else.'],
        ['Get vouched for', 'One of three light paths: a fund approves you, another group already on Relay vouches for you, or an established organization refers you. No IDs, no membership lists, and no documents at any point.'],
        ['Ask for money', 'An amount, a category, and the region served. A written justification is optional, and the form warns you against putting personal details in it.'],
        ['See what happened', 'Submitted, approved, funds sent, acknowledged. Four states. No receipts, no narratives, and nothing about anyone who received help.'],
      ],
    }),

    band({
      eyebrow: 'The other half',
      title: 'People can also reach you <em>without saying who they are</em>.',
      lede:
        'Someone in your area can send a request for help that is locked on their own device before ' +
        'it is sent. Only groups working in that area are given a key to open it, and Relay stores it ' +
        'without being able to read it. You open it, see how to reach them, and contact them directly, ' +
        'outside Relay. They are given a short safe word, and saying it back is how they know your ' +
        'call is genuine and not from someone pretending.',
    }),
    note({
      body:
        'The limits, stated rather than glossed: the rough area and the kind of help are stored in the ' +
        'clear, because that is how a request reaches the right groups at all. Everything identifying ' +
        'sits inside the locked message. Requests are deleted once confirmed, or after seven days.',
    }),

    band({
      eyebrow: 'What you would be joining',
      title: 'Open code, and nothing to take private.',
      lede:
        'Relay is AGPL-3.0. In plain terms that means the code cannot be made private by anyone, ' +
        'including whoever ends up owning it, and anyone can inspect it or run their own copy. Every ' +
        'claim on this page can be checked against the code rather than taken on trust.',
    }),
    stats({}),

    STATUS,

    note({
      warn: true,
      body:
        '<b>What being first actually means.</b> A group cannot be listed publicly, or receive an ' +
        'anonymous request, until a fund hub has approved it, and no fund has joined yet. So a group ' +
        'signing up today is registering interest ahead of a pilot rather than switching on a working ' +
        'service, and it would be dishonest to describe it as anything else.',
    }),

    doors({
      eyebrow: 'Also here',
      title: 'The other two doors.',
      items: [
        ['I need help', '/need-help/', 'What happens when you ask, what is kept, and what is not.'],
        ['I help run a fund', '/for-funds/', 'What routing money through this looks like, and the pilot being asked for.'],
        ['What Relay is', '/what-is-relay/', 'The whole thing, explained from the start.'],
      ],
    }),
  ],
};

// ---- 4. For people who run a pooled fund -----------------------------------
// "Fund hub" is Relay's own noun for this and gets defined on first use here as
// it does everywhere else. The ask is the pilot from deck slide 13, unchanged.

const forFunds = {
  slug: 'for-funds',
  navLabel: 'I help run a fund',
  ogKicker: 'FOR FUNDS AND HUBS',
  ogHeadline: 'Fund local groups\nwithout collecting\nanything about them.',
  title: 'Relay for funds: back local groups without collecting anything about them',
  description:
    'If you raise money centrally and struggle to tell which local groups are real, this is the ' +
    'problem Relay was built for. The ask is a pilot, not money: one fund, three to five groups.',
  blocks: [
    hero({
      badge: 'For funds and hubs &middot; The ask is a pilot, not money',
      title: 'You can raise it. <em>Placing it safely</em> is the hard part.',
      ledes: [
        'If your organization raises money centrally to back local work, a solidarity fund, a bail fund, a foundation, then you already know the bottleneck. It is not the raising. It is knowing which local groups are real, and being able to satisfy yourself of that without asking them for documents that put them at risk.',
        'Today that check happens through personal introductions, which means the groups you fund are the ones somebody happened to know. Good groups without the right contact stay invisible to you.',
        'Relay is the piece that makes the introduction unnecessary, and it is deliberately nothing more than that.',
      ],
      chips: [
        ['You approve', 'the groups. Relay never does'],
        ['The money', 'never passes through Relay'],
        ['Totals only', 'never people'],
      ],
    }),

    band({
      eyebrow: 'What you would see',
      title: 'Totals by category. Groups supported. Time to funding.',
      lede:
        'You get what you need to report on the money, and nothing that would make you the holder of ' +
        'sensitive records. A per-person figure is not being withheld from you. It cannot be produced, ' +
        'because the information to produce it is never collected by anyone.',
    }),
    cards({
      items: [
        ['You decide who is real', 'Groups apply and you approve them, or another group already on Relay vouches for them, or an established organization refers them. Relay runs the process and makes none of the calls.'],
        ['Requests arrive structured', 'An amount, a category, the region served, and an optional justification that the form actively discourages from containing personal detail.'],
        ['Four states, no paperwork', 'Submitted, approved, funds sent, acknowledged. You approve, decline, or ask a clarifying question. No receipts and no case narratives to store.'],
        ['Little to be subpoenaed for', 'What exists is group-level amounts and dates, a list of groups that consented to be listed, and locked messages nobody can open. There are no records about aid recipients to hand over, because none are ever created.'],
      ],
    }),

    band({
      eyebrow: 'The ask, concretely',
      title: 'One fund. Three to five groups. <em>Thirty to forty-five days.</em>',
      lede:
        'Nobody is asking you for money. Relay is not fundraising, and there is nothing to donate to: ' +
        'the nonprofit intended to hold this has not been formed. The ask is a pilot.',
    }),
    cards({
      items: [
        ['You provide', 'One fund willing to route real requests through the workflow, introductions to three to five local groups, and honest feedback when it does not work.'],
        ['Relay provides', 'The software, help getting groups set up, support throughout, and someone to run the pilot. No cost to anyone taking part.'],
        ['Either side can stop', 'Taking part is opt-in and can be ended by any party at any time, for any reason. That is written into the proposal rather than implied.'],
      ],
    }),
    steps({
      numbered: true,
      heading: 'It succeeded if',
      items: [
        ['A group connected to a fund without a personal introduction', ''],
        ['Someone asked for help without identifying themselves', ''],
        ['A group reached that person, verified by safe word', ''],
        ['Funds moved faster than they did before', ''],
        ['Participants say it felt safer than the tools it replaced', ''],
        ['Nobody asked for recipient data, because nothing needed it', ''],
      ],
    }),

    band({
      eyebrow: 'Before you decide',
      title: 'Everything here can be checked <em>rather than believed</em>.',
      lede:
        'The code is public and AGPL-3.0, which means it cannot be made private by anyone, including ' +
        'whoever ends up owning it. Every claim on this page has code behind it that you, or your own ' +
        'technical people, can read.',
    }),
    stats({}),

    STATUS,

    doors({
      eyebrow: 'Also here',
      title: 'The other two doors.',
      items: [
        ['I organize a local group', '/for-groups/', 'What joining involves, and what Relay does not get to do to your work.'],
        ['I need help', '/need-help/', 'What happens when you ask, what is kept, and what is not.'],
        ['What Relay is', '/what-is-relay/', 'The whole thing, explained from the start.'],
      ],
    }),
  ],
};

export const PAGES = [whatIsRelay, needHelp, forGroups, forFunds];
