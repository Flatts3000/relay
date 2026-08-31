import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ORIGIN = 'https://relayfunds.org';

/**
 * Ordered longest-prefix-first so `/verification/attestations` is matched before
 * `/verification`, and `/requests/new` before `/requests`.
 */
const routeTitles: Array<[string, string]> = [
  ['/verification/attestations', 'navigation.attestations'],
  ['/verification/requests', 'navigation.verificationQueue'],
  ['/verification/request', 'navigation.verification'],
  ['/verification', 'navigation.verificationQueue'],
  ['/admin/audit-log', 'navigation.auditLog'],
  ['/admin/verification', 'navigation.verificationQueue'],
  ['/admin/funding', 'navigation.funding'],
  ['/admin/groups', 'navigation.groups'],
  ['/admin/users', 'navigation.users'],
  ['/admin/hubs', 'navigation.hubs'],
  ['/admin', 'navigation.adminOverview'],
  ['/settings/group', 'navigation.settings'],
  ['/settings/hub', 'navigation.settings'],
  ['/requests/new', 'navigation.newRequest'],
  ['/requests', 'navigation.funding'],
  ['/groups/new', 'navigation.registerGroup'],
  ['/groups', 'navigation.groups'],
  ['/inbox', 'navigation.helpInbox'],
  ['/dashboard', 'navigation.dashboard'],
  ['/directory', 'navigation.directory'],
  ['/profile', 'navigation.groupProfile'],
  ['/reports', 'navigation.reports'],
  ['/onboarding', 'navigation.onboarding'],
  ['/privacy', 'navigation.privacy'],
  ['/security', 'navigation.security'],
  ['/terms', 'navigation.terms'],
  ['/login', 'navigation.login'],
  ['/help', 'navigation.requestHelp'],
  ['/design-system', 'navigation.designSystem'],
];

/**
 * Every route that is a real page, with its own description.
 *
 * Being a real page and being indexable are different questions, and conflating
 * them put `noindex` and "That page does not exist" on `/help` - the anonymous
 * help broadcast, the one public surface built for someone in a crisis, and not
 * disallowed in `robots.txt`. It is a working page that simply should not be
 * indexed. Anything absent from this map is the not-found view.
 */
const routeDescriptions: Record<string, string> = {
  '/': 'meta.home',
  '/directory': 'meta.directory',
  '/help': 'meta.help',
  '/privacy': 'meta.privacy',
  '/security': 'meta.security',
  '/terms': 'meta.terms',
  '/login': 'meta.login',
};

/**
 * Real pages that should still not appear in search results.
 *
 * `/login` is already disallowed in `robots.txt`. `/help` is deliberately not:
 * someone searching for a way to ask for help should be able to find it, and
 * the page itself stores nothing about the visit.
 */
const noIndex = new Set(['/login']);

/** Create the tag if it is missing, then set its content. */
function setMeta(selector: string, create: () => HTMLElement, content: string) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Sets the document title, the per-route metadata, and the language attribute.
 *
 * **Title.** Every one of the 42 routes previously rendered `<title>Relay</title>`,
 * which makes tab switching, bookmarks and history search useless. Doing it
 * centrally rather than per page means a new route cannot silently ship without
 * one, and dynamic segments inherit their parent's title.
 *
 * **Canonical and og:url.** `frontend/index.html` is one template for every
 * route and carries a hardcoded `og:url` of the origin, so `/directory`,
 * `/privacy`, `/security` and `/terms` each told crawlers their canonical
 * identity was the home page. `/security` is 828 words of unique content that
 * could not rank because it declared itself a duplicate. Both tags are now
 * rewritten per route.
 *
 * The ceiling is worth knowing: this runs in the browser, so Google sees it
 * (it renders JavaScript) and most social unfurlers do not (they do not). The
 * four pages under `marketing/` are static precisely so their tags survive that.
 *
 * **Language.** `<html lang>` stayed `en` when the interface switched to
 * Spanish, so a screen reader read Spanish content with an English voice and
 * English pronunciation rules. That defect landed only on the Spanish-speaking
 * audience this project exists to serve, which is why it survived so long.
 */
export function DocumentTitle() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation('common');

  useEffect(() => {
    // WCAG 3.1.1, and resolvedLanguage rather than language on purpose. There is
    // no supportedLngs in the i18n config, so the detector sets `language` to
    // the raw navigator value: a visitor with a fr-FR browser would get English
    // copy from fallbackLng under lang="fr-FR", which is a worse failure than
    // the hardcoded "en" this replaced. resolvedLanguage walks the fallback
    // chain and reports the language actually rendered.
    document.documentElement.setAttribute('lang', i18n.resolvedLanguage ?? i18n.language);
  }, [i18n.resolvedLanguage, i18n.language]);

  useEffect(() => {
    const appName = t('appName');
    const match = routeTitles.find(
      ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    // "Relay" alone is five characters and competes with relay races and relay
    // switches. The home page has 661 words and deserves a title describing them.
    document.title =
      pathname === '/'
        ? t('meta.homeTitle')
        : `${match ? t(match[1]) : t('pageNotFound')} - ${appName}`;

    // Trailing slashes are normalised away, because nginx serves /directory and
    // /directory/ as two 200s with identical content. Emitting each one's own
    // path as its canonical would preserve the duplicate instead of resolving
    // it. The root keeps its slash; the four static pages are real directories
    // and are not routed through here at all.
    //
    // The lookup below uses the normalised path too. Keying it off the raw one
    // would give /directory/ a noindex while /directory got a description -
    // the same duplicate handled two opposite ways.
    const canonicalPath =
      pathname !== '/' && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

    const descriptionKey = routeDescriptions[canonicalPath];
    const isKnownPage = descriptionKey !== undefined;
    const indexable = isKnownPage && !noIndex.has(canonicalPath);
    const description = t(isKnownPage ? descriptionKey : 'meta.notFound');

    setMeta(
      'meta[name="description"]',
      () => {
        const el = document.createElement('meta');
        el.setAttribute('name', 'description');
        return el;
      },
      description
    );

    const url = `${ORIGIN}${canonicalPath}`;
    setLink('canonical', url);
    for (const [sel, attr, name] of [
      ['meta[property="og:url"]', 'property', 'og:url'],
      ['meta[property="og:title"]', 'property', 'og:title'],
      ['meta[property="og:description"]', 'property', 'og:description'],
      ['meta[name="twitter:title"]', 'name', 'twitter:title'],
      ['meta[name="twitter:description"]', 'name', 'twitter:description'],
    ] as const) {
      const value =
        name === 'og:url' ? url : name.endsWith('description') ? description : document.title;
      setMeta(
        sel,
        () => {
          const el = document.createElement('meta');
          el.setAttribute(attr, name);
          return el;
        },
        value
      );
    }

    // Anything unknown here is the not-found view reached through App's `*`
    // route, and that case matters most: the SPA fallback returns 200 for every
    // unmatched extensionless path, so without this a typo becomes an indexable
    // page containing the app shell. Authenticated routes are also unknown here
    // and are already disallowed in robots.txt.
    const robots = document.head.querySelector('meta[name="robots"]');
    if (indexable) {
      robots?.remove();
    } else {
      setMeta(
        'meta[name="robots"]',
        () => {
          const el = document.createElement('meta');
          el.setAttribute('name', 'robots');
          return el;
        },
        'noindex, follow'
      );
    }
  }, [pathname, t, i18n.language]);

  return null;
}
