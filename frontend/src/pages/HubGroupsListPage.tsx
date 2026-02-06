import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getGroups } from '../api/groups';
import { Alert, Input } from '../components/ui';
import type { Group, VerificationStatus, AidCategory } from '../api/types';

export function HubGroupsListPage() {
  const { t } = useTranslation(['groups', 'common']);
  const [groups, setGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<AidCategory | ''>('');

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await getGroups({
        verificationStatus: statusFilter || undefined,
        aidCategory: categoryFilter || undefined,
        search: search || undefined,
      });
      setGroups(result.groups);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('groups:failedToLoadGroups'));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter, search, t]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadGroups();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('groups:title')}</h1>
          <p className="text-gray-600">{t('groups:registeredGroups', { count: total })}</p>
        </div>
        <Link
          to="/groups/new"
          className="inline-flex items-center justify-center px-4 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors min-h-[44px]"
        >
          {t('groups:registerNewGroup')}
        </Link>
      </div>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder={t('groups:filters.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as VerificationStatus | '')}
            className="px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('groups:filters.allStatuses')}</option>
            <option value="pending">{t('common:verificationStatus.pending')}</option>
            <option value="verified">{t('common:verificationStatus.verified')}</option>
            <option value="revoked">{t('common:verificationStatus.revoked')}</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as AidCategory | '')}
            className="px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('groups:filters.allCategories')}</option>
            <option value="rent">{t('common:aidCategories.rent')}</option>
            <option value="food">{t('common:aidCategories.food')}</option>
            <option value="utilities">{t('common:aidCategories.utilities')}</option>
            <option value="other">{t('common:aidCategories.other')}</option>
          </select>
          <button
            type="submit"
            className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors min-h-[44px]"
          >
            {t('common:search')}
          </button>
        </form>
      </div>

      {/* Groups List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600">{t('groups:noGroupsFound')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:border-primary-300 hover:shadow transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{group.name}</h3>
                  <p className="text-gray-600">{group.serviceArea}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    group.verificationStatus === 'verified'
                      ? 'bg-green-100 text-green-800'
                      : group.verificationStatus === 'revoked'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {t(`common:verificationStatus.${group.verificationStatus}`)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.aidCategories.map((category) => (
                  <span
                    key={category}
                    className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-700"
                  >
                    {t(`common:aidCategories.${category}`)}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
