import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { PublicHeader, PublicFooter } from '../components/layout';
import { Alert } from '../components/ui';
import { fetchPublicDirectory } from '../api/directory';
import { AID_CATEGORIES } from '../api/types';
import type { PublicDirectoryEntry } from '../api/types';

/**
 * Public group directory page.
 * No authentication, no tracking, no cookies.
 * Browsable by anyone — searchable by name/area, filterable by category.
 */
export function GroupDirectoryPage() {
  const { t } = useTranslation('common');

  const [entries, setEntries] = useState<PublicDirectoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const loadDirectory = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const results = await fetchPublicDirectory(search || undefined, categoryFilter || undefined);
      setEntries(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somethingWentWrong'));
    } finally {
      setIsLoading(false);
    }
  }, [search, categoryFilter, t]);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-gray-900 mb-2">
              {t('directory.title')}
            </h1>
            <p className="text-lg text-gray-600">{t('directory.description')}</p>
          </div>

          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('directory.searchPlaceholder')}
              className="flex-1 px-4 min-h-[44px] rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 min-h-[44px] rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">{t('directory.allCategories')}</option>
              {AID_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`aidCategories.${cat}`)}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <Alert type="error" className="mb-6">
              {error}
            </Alert>
          )}

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-500">
                {search || categoryFilter
                  ? t('directory.noGroupsFound')
                  : t('directory.noGroupsYet')}
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                {t('directory.groupCount', { count: entries.length })}
              </p>

              <div className="grid gap-4">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                          {entry.name}
                          <FontAwesomeIcon
                            icon={faCheckCircle}
                            className="text-green-500 text-sm"
                            title={t('verificationStatus.verified')}
                          />
                        </h3>
                        <p className="text-gray-600">{entry.serviceArea}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {entry.aidCategories.map((cat) => (
                        <span
                          key={cat}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                        >
                          {t(`aidCategories.${cat}`)}
                        </span>
                      ))}
                    </div>

                    <a
                      href={`mailto:${entry.contactEmail}`}
                      className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                    >
                      <FontAwesomeIcon icon={faEnvelope} />
                      {t('directory.contactEmail')}
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
