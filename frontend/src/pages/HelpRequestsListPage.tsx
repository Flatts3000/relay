import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getHelpRequests } from '../api/help-requests';
import { Alert } from '../components/ui';
import type { HelpRequest, AidCategory } from '../api/types';

const AID_CATEGORIES: AidCategory[] = ['rent', 'food', 'utilities', 'other'];

/**
 * Help requests list page for group coordinators.
 * Shows open mailboxes in the group's service area.
 */
export function HelpRequestsListPage() {
  const { t } = useTranslation(['help', 'common']);
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AidCategory | ''>('');

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await getHelpRequests({
        category: categoryFilter || undefined,
      });
      setRequests(result.requests);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('help:errors.loadRequestsFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, t]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('help:list.title')}</h1>
          <p className="text-gray-600">
            {total} {t('help:list.requestCount', { count: total })}
          </p>
        </div>
      </div>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as AidCategory | '')}
          className="px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">{t('help:list.allCategories')}</option>
          {AID_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {t(`common:aidCategories.${cat}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600">{t('help:list.noRequests')}</p>
          <p className="text-gray-500 mt-2 text-sm">{t('help:list.noRequestsDescription')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Link
              key={request.mailboxId}
              to={`/help-requests/${request.mailboxId}`}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:border-primary-300 hover:shadow transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 mb-2">
                    {t(`common:aidCategories.${request.helpCategory}`)}
                  </span>
                  <p className="text-gray-600">{request.region}</p>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(request.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Privacy reminder */}
      <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-medium text-green-800 mb-2">{t('help:list.privacyTitle')}</h3>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• {t('help:list.privacy1')}</li>
          <li>• {t('help:list.privacy2')}</li>
          <li>• {t('help:list.privacy3')}</li>
        </ul>
      </div>
    </div>
  );
}
