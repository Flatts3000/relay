import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { faUserGroup } from '@fortawesome/free-solid-svg-icons';
import { getAdminHub } from '../../api/admin';
import { Alert, Badge, Skeleton, EmptyState } from '../../components/ui';
import type { AdminHubDetail } from '../../api/types';

export function AdminHubDetailPage() {
  const { t } = useTranslation('admin');
  const { id } = useParams<{ id: string }>();
  const [hub, setHub] = useState<AdminHubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setHub(await getAdminHub(id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load hub');
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
        <Skeleton className="h-[200px] mb-6" />
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  if (error) return <Alert type="error">{error}</Alert>;
  if (!hub) return null;

  const statusVariant = (s: string) =>
    s === 'verified' ? 'success' : s === 'revoked' ? 'error' : 'warning';

  return (
    <div>
      <Link to="/admin/hubs" className="text-sm text-primary-600 hover:underline mb-4 inline-block">
        &larr; {t('hubs.title')}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{hub.name}</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">{t('hubs.contactEmail')}</dt>
            <dd className="text-gray-900">{hub.contactEmail}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('hubs.userCount')}</dt>
            <dd className="text-gray-900">{hub.userCount}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('hubs.createdAt')}</dt>
            <dd className="text-gray-900">{new Date(hub.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        {t('hubs.groups')} ({hub.groups.length})
      </h2>

      {hub.groups.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('groups.name')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('groups.serviceArea')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('groups.status')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {hub.groups.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/admin/groups/${g.id}`}
                        className="text-primary-600 hover:underline font-medium"
                      >
                        {g.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{g.serviceArea}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(g.verificationStatus)}>
                        {g.verificationStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon={faUserGroup} title={t('groups.empty')} />
      )}
    </div>
  );
}
