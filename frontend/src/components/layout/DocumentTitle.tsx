import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
 * Sets the document title from the current route.
 *
 * Every one of the 42 routes previously rendered `<title>Relay</title>`, which
 * makes tab switching, bookmarks and history search useless and gives every
 * shared link the same preview. Doing it centrally rather than per page means a
 * new route cannot silently ship without one, and dynamic segments inherit their
 * parent's title instead of falling through to the bare app name.
 *
 * Titles are looked up in the common namespace, so they follow the user's
 * language like the rest of the interface.
 */
export function DocumentTitle() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation('common');

  useEffect(() => {
    const appName = t('appName');
    const match = routeTitles.find(
      ([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (pathname === '/') {
      document.title = appName;
      return;
    }

    // Anything unmatched fell through App's `*` route, so it is the not-found
    // page. Every real route has an entry above.
    document.title = `${match ? t(match[1]) : t('pageNotFound')} - ${appName}`;
  }, [pathname, t, i18n.language]);

  return null;
}
