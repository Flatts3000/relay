import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  faGauge,
  faEnvelope,
  faDollarSign,
  faUserGroup,
  faShieldHalved,
  faHandshakeAngle,
  faGear,
  faChartColumn,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts';
import { ConsoleLayout, type ConsoleNavItem } from './ConsoleLayout';

interface LayoutProps {
  children: ReactNode;
}

/**
 * The signed-in shell for group coordinators and hub admins.
 *
 * The nav is derived from the role rather than hardcoded, so a page only appears
 * for someone whose ProtectedRoute would actually let them in. Anything gated on
 * `isOwner` follows the same rule, which is why settings is conditional here
 * rather than filtered inside the shell.
 */
export function Layout({ children }: LayoutProps) {
  const { t } = useTranslation('common');
  const { user } = useAuth();

  const navItems: ConsoleNavItem[] = [];

  if (user?.role === 'group_coordinator') {
    navItems.push(
      { key: 'dashboard', path: '/dashboard', label: t('navigation.dashboard'), icon: faGauge },
      { key: 'inbox', path: '/inbox', label: t('navigation.helpInbox'), icon: faEnvelope },
      { key: 'requests', path: '/requests', label: t('navigation.funding'), icon: faDollarSign },
      { key: 'profile', path: '/profile', label: t('navigation.groupProfile'), icon: faUserGroup },
      {
        key: 'verification',
        path: '/verification/request',
        label: t('navigation.verification'),
        icon: faShieldHalved,
      },
      {
        key: 'attestations',
        path: '/verification/attestations',
        label: t('navigation.attestations'),
        icon: faHandshakeAngle,
      }
    );
    if (user.isOwner) {
      navItems.push({
        key: 'settings',
        path: '/settings/group',
        label: t('navigation.settings'),
        icon: faGear,
      });
    }
  } else if (user?.role === 'hub_admin') {
    navItems.push(
      { key: 'dashboard', path: '/dashboard', label: t('navigation.dashboard'), icon: faGauge },
      { key: 'groups', path: '/groups', label: t('navigation.groups'), icon: faUserGroup },
      {
        key: 'verification',
        path: '/verification',
        label: t('navigation.verificationQueue'),
        icon: faShieldHalved,
      },
      { key: 'requests', path: '/requests', label: t('navigation.funding'), icon: faDollarSign },
      { key: 'reports', path: '/reports', label: t('navigation.reports'), icon: faChartColumn }
    );
    if (user.isOwner) {
      navItems.push({
        key: 'settings',
        path: '/settings/hub',
        label: t('navigation.settings'),
        icon: faGear,
      });
    }
  }

  return <ConsoleLayout navItems={navItems}>{children}</ConsoleLayout>;
}
