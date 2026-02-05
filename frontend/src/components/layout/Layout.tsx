import { type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts';
import { Button, LanguageSwitcher } from '../ui';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleLabel = (role: string) => {
    return role === 'hub_admin'
      ? t('roles.hubAdmin')
      : t('roles.groupCoordinator');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-xl font-bold text-gray-900">
              {t('appName')}
            </Link>

            <div className="flex items-center gap-4">
              <LanguageSwitcher />

              {isAuthenticated && user && (
                <>
                  <span className="text-sm text-gray-600 hidden sm:inline">
                    {user.email} ({getRoleLabel(user.role)})
                  </span>
                  <Button variant="secondary" size="sm" onClick={handleLogout}>
                    {t('navigation.logout')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
