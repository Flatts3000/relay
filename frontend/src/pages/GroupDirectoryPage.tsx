import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { PublicHeader, PublicFooter } from '../components/layout';
import { Alert, RegionAutocomplete } from '../components/ui';
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
  const [regionFilter, setRegionFilter] = useState('');

  // Debounced, because loadDirectory depends on `search` and the effect below
  // re-fires on every change: without this, typing "brooklyn mutual aid" is
  // nineteen requests to a rate-limited public endpoint, and a few searches
  // would lock the visitor out of the directory entirely.
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadDirectory = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const results = await fetchPublicDirectory(
        debouncedSearch || undefined,
        categoryFilter || undefined,
        regionFilter || undefined
      );
      setEntries(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somethingWentWrong'));
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, categoryFilter, regionFilter, t]);

  useEffect(() => {
    loadDirectory();
  }, [loadDirectory]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicHeader />

      <main className="flex-1 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-bold font-heading text-gray-900 mb-2">
              {t('directory.title')}
            </h1>
            <p className="text-lg text-gray-600">{t('directory.description')}</p>
          </div>

          {/* Region is its own control rather than folded into the free-text
              search. Browsing by area is how this directory is meant to be
              used, and one box that also matches group names returns a group in
              another county because its name happens to contain the word
              typed. */}
          <div className="grid gap-3 sm:grid-cols-3 mb-6">
            <RegionAutocomplete
              value={regionFilter}
              onChange={setRegionFilter}
              label={t('directory.regionLabel')}
              placeholder={t('directory.regionPlaceholder')}
            />
            <div>
              <label
                htmlFor="directory-category"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t('directory.categoryLabel')}
              </label>
              <select
                id="directory-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 min-h-[44px] rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t('directory.allCategories')}</option>
                {AID_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`aidCategories.${cat}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="directory-search"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t('directory.searchLabel')}
              </label>
              <input
                id="directory-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('directory.searchPlaceholder')}
                className="w-full px-4 min-h-[44px] rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
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
            <div className="text-center py-12 bg-gray-50 rounded-xl px-6">
              <p className="text-gray-700 mb-2 font-medium">
                {search || categoryFilter || regionFilter
                  ? t('directory.noGroupsFound')
                  : t('directory.noGroupsYet')}
              </p>
              {/* An empty result is the moment someone most needs the other way
                  through the product, not a dead end. */}
              <p className="text-sm text-gray-600 mb-4">{t('directory.emptyHelp')}</p>
              <Link
                to="/help"
                className="inline-flex items-center justify-center px-4 py-3 min-h-[44px] rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
              >
                {t('directory.emptyAction')}
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
                {t('directory.groupCount', { count: entries.length })}
              </p>

              {/* Two and three columns rather than one long ribbon: eight
                  results used to fill two thousand pixels, so finding the
                  nearest group meant scrolling past every other one. */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex flex-col"
                  >
                    <h2 className="text-base font-semibold text-gray-900">{entry.name}</h2>
                    <p className="text-sm text-gray-600 mt-0.5">{entry.serviceArea}</p>

                    {/* Labelled, not a bare tick carrying a title attribute.
                        Verification is this directory's entire trust claim, and
                        an icon that only explains itself on hover explains
                        itself to nobody on a phone. */}
                    <p className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 mt-2">
                      <FontAwesomeIcon icon={faCheckCircle} aria-hidden="true" />
                      {t('directory.verifiedBadge')}
                    </p>

                    <div className="flex flex-wrap gap-1.5 my-3">
                      {entry.aidCategories.map((cat) => (
                        <span
                          key={cat}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                        >
                          {t(`aidCategories.${cat}`)}
                        </span>
                      ))}
                    </div>

                    {/* The only action on the page, so it looks like one. */}
                    <a
                      href={`mailto:${entry.contactEmail}`}
                      className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                      <FontAwesomeIcon icon={faEnvelope} aria-hidden="true" />
                      {t('directory.contactEmail')}
                    </a>
                  </div>
                ))}
              </div>

              {/* Bridges the two halves of the product: someone who browses and
                  finds nothing that fits had no way from here to the anonymous
                  request. */}
              <div className="mt-10 rounded-xl bg-gray-50 border border-gray-200 p-6 text-center">
                <p className="text-gray-700 font-medium mb-1">{t('directory.ctaTitle')}</p>
                <p className="text-sm text-gray-600 mb-4">{t('directory.ctaDescription')}</p>
                <Link
                  to="/help"
                  className="inline-flex items-center justify-center px-4 py-3 min-h-[44px] rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
                >
                  {t('directory.emptyAction')}
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
