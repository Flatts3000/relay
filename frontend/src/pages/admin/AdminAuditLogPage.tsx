import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { faClipboardList } from '@fortawesome/free-solid-svg-icons';
import { getAdminAuditLog } from '../../api/admin';
import { Alert, Select, Pagination, EmptyState, Skeleton } from '../../components/ui';
import type { AdminAuditEntry, PaginatedResponse } from '../../api/types';

export function AdminAuditLogPage() {
  const { t } = useTranslation('admin');
  const [data, setData] = useState<PaginatedResponse<AdminAuditEntry> | null>(null);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        setData(
          await getAdminAuditLog(page, 25, {
            action: action || undefined,
            entityType: entityType || undefined,
          })
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit log');
      } finally {
        setLoading(false);
      }
    })();
  }, [action, entityType, page]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const actionOptions = [
    'create',
    'update',
    'delete',
    'login',
    'logout',
    'verify',
    'approve',
    'decline',
    'send_funds',
    'acknowledge',
  ].map((a) => ({ value: a, label: a.replace(/_/g, ' ') }));

  const entityTypeOptions = [
    'user',
    'group',
    'funding_request',
    'verification_request',
    'peer_attestation',
  ].map((et) => ({ value: et, label: et.replace(/_/g, ' ') }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('auditLog.title')}</h1>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="w-48">
          <Select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            options={actionOptions}
            placeholder={t('auditLog.allActions')}
          />
        </div>
        <div className="w-48">
          <Select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            options={entityTypeOptions}
            placeholder={t('auditLog.allEntityTypes')}
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
                <Skeleton className="h-5 w-32" variant="text" />
                <Skeleton className="h-5 flex-1" variant="text" />
                <Skeleton className="h-5 w-20" variant="text" />
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
                      {t('auditLog.timestamp')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('auditLog.user')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('auditLog.action')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('auditLog.entityType')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('auditLog.entityId')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.data.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.userEmail ?? t('common.na')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {entry.action.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {entry.entityType.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 font-mono text-xs">
                        {entry.entityId ? entry.entityId.slice(0, 8) + '...' : t('common.na')}
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
        <EmptyState icon={faClipboardList} title={t('auditLog.empty')} />
      )}
    </div>
  );
}
