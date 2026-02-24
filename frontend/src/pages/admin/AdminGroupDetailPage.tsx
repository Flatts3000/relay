import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAdminGroup } from '../../api/admin';
import { Alert, Badge, Skeleton } from '../../components/ui';
import type { AdminGroupDetail } from '../../api/types';

export function AdminGroupDetailPage() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<AdminGroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setGroup(await getAdminGroup(id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load group');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div>
        <Skeleton className="h-5 w-24 mb-4" variant="text" />
        <Skeleton className="h-8 w-48 mb-6" variant="text" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (error) return <Alert type="error">{error}</Alert>;
  if (!group) return null;

  const statusVariant = (s: string) =>
    s === 'verified' ? 'success' : s === 'revoked' ? 'error' : 'warning';

  return (
    <div>
      <Link
        to="/admin/groups"
        className="text-sm text-primary-600 hover:underline mb-4 inline-block"
      >
        &larr; {t('groups.title')}
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
        <Badge variant={statusVariant(group.verificationStatus)}>{group.verificationStatus}</Badge>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">{t('groups.hub')}</dt>
            <dd>
              <Link to={`/admin/hubs/${group.hubId}`} className="text-primary-600 hover:underline">
                {group.hubName}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('groups.serviceArea')}</dt>
            <dd className="text-gray-900">{group.serviceArea}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('groups.contactEmail')}</dt>
            <dd className="text-gray-900">{group.contactEmail}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('groups.coordinator')}</dt>
            <dd className="text-gray-900">{group.coordinatorEmail ?? t('common.na')}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('groups.aidCategories')}</dt>
            <dd className="flex flex-wrap gap-1 mt-1">
              {group.aidCategories.map((c) => (
                <Badge key={c} variant="default">
                  {tc(`aidCategories.${c}`)}
                </Badge>
              ))}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('groups.fundingRequests')}</dt>
            <dd className="text-gray-900">{group.fundingRequestCount}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('groups.createdAt')}</dt>
            <dd className="text-gray-900">{new Date(group.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
