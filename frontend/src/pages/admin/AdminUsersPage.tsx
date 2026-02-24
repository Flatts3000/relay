import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { faUsers } from '@fortawesome/free-solid-svg-icons';
import { getAdminUsers } from '../../api/admin';
import { Alert, Input, Badge, Select, Pagination, EmptyState, Skeleton } from '../../components/ui';
import type { AdminUser, PaginatedResponse, UserRole } from '../../api/types';

export function AdminUsersPage() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const [data, setData] = useState<PaginatedResponse<AdminUser> | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        setData(await getAdminUsers(search || undefined, role || undefined, page));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    })();
  }, [search, role, page]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const roleBadge = (r: string) => {
    if (r === 'staff_admin') return 'error' as const;
    if (r === 'hub_admin') return 'info' as const;
    return 'default' as const;
  };

  const roleLabel = (r: string) => {
    if (r === 'hub_admin') return tc('roles.hubAdmin');
    if (r === 'group_coordinator') return tc('roles.groupCoordinator');
    if (r === 'staff_admin') return tc('roles.staffAdmin');
    return r;
  };

  const roleOptions = [
    { value: 'hub_admin', label: tc('roles.hubAdmin') },
    { value: 'group_coordinator', label: tc('roles.groupCoordinator') },
    { value: 'staff_admin', label: tc('roles.staffAdmin') },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('users.title')}</h1>

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
            value={role}
            onChange={(e) => {
              setRole(e.target.value as UserRole | '');
              setPage(1);
            }}
            options={roleOptions}
            placeholder={t('users.allRoles')}
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
                <Skeleton className="h-5 w-20" variant="text" />
                <Skeleton className="h-5 w-24" variant="text" />
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
                      {t('users.email')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('users.role')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('users.hub')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('users.group')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('users.lastLogin')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.data.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/users/${u.id}`}
                          className="text-primary-600 hover:underline font-medium"
                        >
                          {u.email}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={roleBadge(u.role)}>{roleLabel(u.role)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {u.hubName ?? t('common.na')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {u.groupName ?? t('common.na')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleDateString()
                          : t('common.never')}
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
        <EmptyState icon={faUsers} title={t('users.empty')} />
      )}
    </div>
  );
}
