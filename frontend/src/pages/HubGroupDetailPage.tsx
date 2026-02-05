import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getGroup } from '../api/groups';
import { Alert } from '../components/ui';
import type { Group } from '../api/types';

export function HubGroupDetailPage() {
  const { t } = useTranslation(['groups', 'common']);
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGroup = async () => {
      if (!id) return;

      setIsLoading(true);
      setError('');

      try {
        const { group } = await getGroup(id);
        setGroup(group);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('groups:failedToLoadGroup'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroup();
  }, [id, t]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert type="error">{error}</Alert>
        <div className="mt-4">
          <Link
            to="/groups"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('groups:backToGroups')}
          </Link>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">{t('groups:groupNotFound')}</h2>
        <div className="mt-4">
          <Link
            to="/groups"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t('groups:backToGroups')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          to="/groups"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          &larr; {t('groups:backToGroups')}
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
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

        <dl className="divide-y divide-gray-200">
          <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">{t('groups:details.serviceArea')}</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {group.serviceArea}
            </dd>
          </div>

          <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">{t('groups:details.aidCategories')}</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <div className="flex flex-wrap gap-2">
                {group.aidCategories.map((category) => (
                  <span
                    key={category}
                    className="px-2 py-1 bg-gray-100 rounded text-sm"
                  >
                    {t(`common:aidCategories.${category}`)}
                  </span>
                ))}
              </div>
            </dd>
          </div>

          <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">{t('groups:details.contactEmail')}</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <a
                href={`mailto:${group.contactEmail}`}
                className="text-blue-600 hover:text-blue-700"
              >
                {group.contactEmail}
              </a>
            </dd>
          </div>

          <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">{t('groups:details.registered')}</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {new Date(group.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </div>

          <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">{t('groups:details.lastUpdated')}</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {new Date(group.updatedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </div>
        </dl>
      </div>

      {/* Placeholder for verification actions - to be implemented in Phase 3 */}
      {group.verificationStatus === 'pending' && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800">
            {t('groups:verificationPending')}
          </h3>
          <p className="mt-1 text-sm text-yellow-700">
            {t('groups:verificationPendingNote')}
          </p>
        </div>
      )}
    </div>
  );
}
