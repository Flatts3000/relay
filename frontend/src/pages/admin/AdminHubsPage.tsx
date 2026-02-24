import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { faBuilding } from '@fortawesome/free-solid-svg-icons';
import { getAdminHubs } from '../../api/admin';
import { Alert, Input, Pagination, EmptyState, Skeleton } from '../../components/ui';
import type { AdminHub, PaginatedResponse } from '../../api/types';

export function AdminHubsPage() {
  const { t } = useTranslation('admin');
  const [data, setData] = useState<PaginatedResponse<AdminHub> | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        setData(await getAdminHubs(search || undefined, page));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load hubs');
      } finally {
        setLoading(false);
      }
    })();
  }, [search, page]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('hubs.title')}</h1>

      <div className="mb-4 max-w-sm">
        <Input
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-4 flex gap-4">
                <Skeleton className="h-5 flex-1" variant="text" />
                <Skeleton className="h-5 w-32" variant="text" />
                <Skeleton className="h-5 w-12" variant="text" />
                <Skeleton className="h-5 w-24" variant="text" />
              </div>
            ))}
          </div>
        </div>
      ) : data && data.data.length > 0 ? (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('hubs.name')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('hubs.contactEmail')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('hubs.groups')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('hubs.createdAt')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.data.map((hub) => (
                    <tr key={hub.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/hubs/${hub.id}`}
                          className="text-primary-600 hover:underline font-medium"
                        >
                          {hub.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{hub.contactEmail}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{hub.groupCount}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(hub.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            total={data.total}
            limit={data.limit}
            onPageChange={setPage}
          />
        </>
      ) : (
        <EmptyState icon={faBuilding} title={t('hubs.empty')} />
      )}
    </div>
  );
}
