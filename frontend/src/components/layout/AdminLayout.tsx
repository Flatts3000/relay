import { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  faGauge,
  faBuilding,
  faUserGroup,
  faUsers,
  faShieldHalved,
  faDollarSign,
  faClipboardList,
} from '@fortawesome/free-solid-svg-icons';
import { ConsoleLayout, type ConsoleNavItem } from './ConsoleLayout';

interface AdminLayoutProps {
  children: ReactNode;
}

/** The signed-in shell for staff admins. Same shell as every other role. */
export function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useTranslation('admin');

  const navItems: ConsoleNavItem[] = [
    { key: 'overview', path: '/admin', label: t('nav.overview'), icon: faGauge, exact: true },
    { key: 'hubs', path: '/admin/hubs', label: t('nav.hubs'), icon: faBuilding },
    { key: 'groups', path: '/admin/groups', label: t('nav.groups'), icon: faUserGroup },
    { key: 'users', path: '/admin/users', label: t('nav.users'), icon: faUsers },
    {
      key: 'verification',
      path: '/admin/verification',
      label: t('nav.verification'),
      icon: faShieldHalved,
    },
    { key: 'funding', path: '/admin/funding', label: t('nav.funding'), icon: faDollarSign },
    {
      key: 'auditLog',
      path: '/admin/audit-log',
      label: t('nav.auditLog'),
      icon: faClipboardList,
    },
  ];

  return (
    <ConsoleLayout navItems={navItems} badge="Admin">
      {children}
    </ConsoleLayout>
  );
}
