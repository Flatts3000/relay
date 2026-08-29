import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faXmark } from '@fortawesome/free-solid-svg-icons';
import { LanguageSwitcher } from '../ui';

const links = [
  { key: 'requestHelp', path: '/help' },
  { key: 'directory', path: '/directory' },
  { key: 'security', path: '/security' },
] as const;

/**
 * Header for every unauthenticated page.
 *
 * It carries real navigation because it previously carried none: a logo and a
 * language switcher, with the only nav in the app living inside HomePage itself.
 * Someone who arrived on the directory could not reach the anonymous help flow,
 * and someone on the help form could not go back and browse groups instead -
 * the two halves of the product, mutually unreachable. On mobile there was
 * nothing at all, on a product whose stated platform is mobile-first.
 */
export function PublicHeader() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const linkClass = (path: string) =>
    `px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
      location.pathname === path
        ? 'text-primary-700 bg-primary-50'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
    }`;

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 shadow-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16 gap-2">
          <Link to="/" className="flex items-center shrink-0">
            <img src="/logo.png" alt={t('appName')} className="h-7" />
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label={t('navigation.primary')}>
            {links.map((link) => (
              <Link
                key={link.key}
                to={link.path}
                className={linkClass(link.path)}
                aria-current={location.pathname === link.path ? 'page' : undefined}
              >
                {t(`navigation.${link.key}`)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              to="/login"
              className="hidden md:inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50"
            >
              {t('navigation.login')}
            </Link>
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? t('navigation.closeMenu') : t('navigation.openMenu')}
            >
              <FontAwesomeIcon icon={menuOpen ? faXmark : faBars} className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <nav
          className="md:hidden border-t border-gray-200 bg-white px-4 py-2 space-y-1"
          aria-label={t('navigation.primary')}
        >
          {links.map((link) => (
            <Link
              key={link.key}
              to={link.path}
              onClick={() => setMenuOpen(false)}
              className={`block ${linkClass(link.path)}`}
              aria-current={location.pathname === link.path ? 'page' : undefined}
            >
              {t(`navigation.${link.key}`)}
            </Link>
          ))}
          <Link
            to="/login"
            onClick={() => setMenuOpen(false)}
            className={`block ${linkClass('/login')}`}
          >
            {t('navigation.login')}
          </Link>
        </nav>
      )}
    </header>
  );
}
