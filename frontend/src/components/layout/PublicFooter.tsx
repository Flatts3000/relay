import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function PublicFooter() {
  const { t } = useTranslation(['common', 'home']);

  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <img src="/logo.png" alt={t('common:appName')} className="h-5" />
            <span aria-hidden="true">&mdash;</span>
            <span>{t('home:footer.tagline')}</span>
          </div>
          <p className="text-gray-500">
            <Link to="/privacy" className="hover:text-gray-900">
              {t('common:footer.privacy')}
            </Link>
            <span className="text-gray-300" aria-hidden="true">
              {' '}
              &middot;{' '}
            </span>
            <Link to="/security" className="hover:text-gray-900">
              {t('common:footer.security')}
            </Link>
            <span className="text-gray-300" aria-hidden="true">
              {' '}
              &middot;{' '}
            </span>
            <Link to="/terms" className="hover:text-gray-900">
              {t('common:footer.terms')}
            </Link>
            <span className="text-gray-300" aria-hidden="true">
              {' '}
              &middot;{' '}
            </span>
            <span>
              {t('home:footer.builtBy')}{' '}
              <a
                href="https://mythicworks.net"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-gray-900"
              >
                {t('home:footer.builtByName')}
              </a>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
