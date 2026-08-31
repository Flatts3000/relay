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
 * The routes a crawler should index, each with its own description.
 *
 * Everything absent from this map is either disallowed in `robots.txt` because
 * it redirects to `/login`, or is the not-found view. Both get `noindex` below
 * rather than a description.
 */
const publicDescriptions: Record<string, string> = {
  '/': 'meta.home',
  '/directory': 'meta.directory',
  '/privacy': 'meta.privacy',
  '/security': 'meta.security',
  '/terms': 'meta.terms',
};

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
    // WCAG 3.1.1. i18n.language can carry a region suffix ("es-MX"); the
    // attribute is happy with either, and the base tag is what matters.
    document.documentElement.setAttribute('lang', i18n.language);
  }, [i18n.language]);

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

    const descriptionKey = publicDescriptions[canonicalPath];
    const isPublic = descriptionKey !== undefined;
    const description = t(isPublic ? descriptionKey : 'meta.notFound');

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

    // Anything not in publicDescriptions is either an authenticated route that
    // redirects to /login, or the not-found view reached through App's `*`
    // route. Neither should be indexed, and the not-found case matters most:
    // the SPA fallback returns 200 for every unmatched extensionless path, so
    // without this a typo becomes an indexable page containing the app shell.
    const robots = document.head.querySelector('meta[name="robots"]');
    if (isPublic) {
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
