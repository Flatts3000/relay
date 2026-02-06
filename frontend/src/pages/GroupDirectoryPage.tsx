import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import { PublicHeader, PublicFooter } from '../components/layout';
import { IconCircle } from '../components/ui';

/**
 * Public group directory placeholder page.
 * No authentication, no tracking, no cookies.
 * The full directory implementation (FR-8) is a separate task.
 */
export function GroupDirectoryPage() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />

      <main className="flex-1 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <IconCircle icon={faMagnifyingGlass} size="lg" color="primary" className="mx-auto mb-6" />
          <h1 className="text-2xl sm:text-3xl font-bold font-heading text-gray-900 mb-3">
            {t('directory.title')}
          </h1>
          <p className="text-lg text-gray-600 mb-8">{t('directory.description')}</p>

          <div className="bg-gray-50 rounded-xl p-8 sm:p-12">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="text-4xl text-gray-300 mb-4" />
            <p className="text-gray-500">{t('directory.comingSoon')}</p>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
