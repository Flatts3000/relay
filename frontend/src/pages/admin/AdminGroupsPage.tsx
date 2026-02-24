import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { faUserGroup } from '@fortawesome/free-solid-svg-icons';
import { getAdminGroups } from '../../api/admin';
import { Alert, Input, Badge, Select, Pagination, EmptyState, Skeleton } from '../../components/ui';
import type { AdminGroup, PaginatedResponse, VerificationStatus } from '../../api/types';

export function AdminGroupsPage() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [data, setData] = useState<PaginatedResponse<AdminGroup> | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<VerificationStatus | ''>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        setData(await getAdminGroups(search || undefined, status || undefined, undefined, page));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load groups');
      } finally {
        setLoading(false);
      }
    })();
  }, [search, status, page]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const statusVariant = (s: string) =>
    s === 'verified' ? 'success' : s === 'revoked' ? 'error' : 'warning';

  const statusOptions = [
    { value: 'pending', label: tc('verificationStatus.pending') },
    { value: 'verified', label: tc('verificationStatus.verified') },
    { value: 'revoked', label: tc('verificationStatus.revoked') },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('groups.title')}</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="max-w-sm flex-1">
          <Input
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="w-48">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as VerificationStatus | '');
              setPage(1);
            }}
            options={statusOptions}
            placeholder={t('groups.allStatuses')}
          />
        </div>
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
                <Skeleton className="h-5 w-24" variant="text" />
                <Skeleton className="h-5 w-24" variant="text" />
                <Skeleton className="h-5 w-20" variant="text" />
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
                      {t('groups.name')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('groups.hub')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('groups.serviceArea')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('groups.status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('groups.createdAt')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.data.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/groups/${g.id}`}
                          className="text-primary-600 hover:underline font-medium"
                        >
                          {g.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <Link to={`/admin/hubs/${g.hubId}`} className="hover:underline">
                          {g.hubName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{g.serviceArea}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(g.verificationStatus)}>
                          {g.verificationStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(g.createdAt).toLocaleDateString()}
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
        <EmptyState icon={faUserGroup} title={t('groups.empty')} />
      )}
    </div>
  );
}
