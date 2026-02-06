import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../ui';

export function PublicHeader() {
  const { t } = useTranslation('common');

  return (
    <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 shadow-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt={t('common:appName')} className="h-7" />
          </Link>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
