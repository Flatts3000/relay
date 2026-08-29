import { type ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faXmark } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts';
import { ToastProvider } from '../../contexts/ToastContext';
import { Button, LanguageSwitcher } from '../ui';

export interface ConsoleNavItem {
  key: string;
  path: string;
  label: string;
  icon: IconDefinition;
  /** Match the path exactly rather than by prefix. For index routes like /admin. */
  exact?: boolean;
}

interface ConsoleLayoutProps {
  children: ReactNode;
  navItems: ConsoleNavItem[];
  /** Small badge beside the logo, e.g. "Admin". */
  badge?: string;
}

/**
 * The shell for every signed-in surface.
 *
 * This exists because the app previously had two of them. The staff admin area
 * had a full sidebar; the coordinator and hub admin areas had a header holding a
 * logo, a language switcher and a log-out button, and nothing else. Routes that
 * worked perfectly well - request verification, peer attestations, reports, the
 * verification queue - were reachable only by typing the URL, because nothing
 * linked to them from anywhere. Sharing one shell means a page added to any role
 * is navigable by construction.
 */
export function ConsoleLayout({ children, navItems, badge }: ConsoleLayoutProps) {
  const { t } = useTranslation('common');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (item: ConsoleNavItem) =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);

  const roleLabel = (role: string) => {
    if (role === 'hub_admin') return t('roles.hubAdmin');
    if (role === 'staff_admin') return t('roles.staffAdmin');
    return t('roles.groupCoordinator');
  };

  const sidebar = (
    <nav className="flex flex-col h-full" aria-label={t('navigation.primary')}>
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 min-h-[44px]">
          <img src="/logo.png" alt={t('appName')} className="h-7 brightness-0 invert" />
          {badge && (
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              {badge}
            </span>
          )}
        </Link>
        <button
          type="button"
          className="lg:hidden p-2 -mr-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={() => setSidebarOpen(false)}
          aria-label={t('navigation.closeMenu')}
        >
          <FontAwesomeIcon icon={faXmark} className="w-4" />
        </button>
      </div>

      <div className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.key}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <FontAwesomeIcon icon={item.icon} className="w-4 text-center" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-700 space-y-3">
        <div className="text-xs text-gray-400 truncate" title={user?.email}>
          {user?.email}
        </div>
        {user && <div className="text-xs text-gray-500">{roleLabel(user.role)}</div>}
        <Button variant="secondary" onClick={handleLogout} className="w-full text-sm">
          {t('navigation.logout')}
        </Button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-gray-900 text-white transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 lg:px-6 shrink-0">
          <button
            type="button"
            className="lg:hidden mr-3 p-2 rounded-lg text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setSidebarOpen(true)}
            aria-label={t('navigation.openMenu')}
          >
            <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <LanguageSwitcher />
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
    </div>
  );
}
