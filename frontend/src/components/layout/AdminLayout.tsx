import { type ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGauge,
  faBuilding,
  faUserGroup,
  faUsers,
  faShieldHalved,
  faDollarSign,
  faClipboardList,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts';
import { ToastProvider } from '../../contexts/ToastContext';
import { Button, LanguageSwitcher } from '../ui';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems: Array<{ key: string; path: string; exact?: boolean; icon: IconDefinition }> = [
  { key: 'overview', path: '/admin', exact: true, icon: faGauge },
  { key: 'hubs', path: '/admin/hubs', icon: faBuilding },
  { key: 'groups', path: '/admin/groups', icon: faUserGroup },
  { key: 'users', path: '/admin/users', icon: faUsers },
  { key: 'verification', path: '/admin/verification', icon: faShieldHalved },
  { key: 'funding', path: '/admin/funding', icon: faDollarSign },
  { key: 'auditLog', path: '/admin/audit-log', icon: faClipboardList },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const sidebar = (
    <nav className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700">
        <Link to="/" className="flex items-center gap-2">
          <img src="/logo.png" alt={tc('appName')} className="h-7 brightness-0 invert" />
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Admin</span>
        </Link>
      </div>

      <div className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path, item.exact);
          return (
            <Link
              key={item.key}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-600 text-white border-l-3 border-primary-300'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <FontAwesomeIcon icon={item.icon} className="w-4 text-center" />
              {t(`nav.${item.key}`)}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-700 space-y-3">
        <div className="text-xs text-gray-400 truncate">{user?.email}</div>
        <Button variant="secondary" onClick={handleLogout} className="w-full text-sm">
          {tc('navigation.logout')}
        </Button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-gray-900 text-white transform transition-transform lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 h-14 flex items-center px-4 lg:px-6 shrink-0">
          <button
            type="button"
            className="lg:hidden mr-3 p-2 rounded-lg text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <div className="flex-1" />
          <LanguageSwitcher />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
    </div>
  );
}
