import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons';
import { getAdminVerification, approveVerification, denyVerification } from '../../api/admin';
import {
  Alert,
  Badge,
  Button,
  Select,
  Pagination,
  EmptyState,
  Skeleton,
  ConfirmModal,
  Modal,
} from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import type {
  AdminVerificationRequest,
  PaginatedResponse,
  VerificationRequestStatus,
} from '../../api/types';

export function AdminVerificationPage() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = useState<PaginatedResponse<AdminVerificationRequest> | null>(null);
  const [status, setStatus] = useState<VerificationRequestStatus | ''>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Action modals
  const [approveTarget, setApproveTarget] = useState<string | null>(null);
  const [denyTarget, setDenyTarget] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getAdminVerification(status || undefined, page));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load verification requests');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const statusVariant = (s: string) =>
    s === 'approved' ? 'success' : s === 'denied' ? 'error' : 'warning';

  const handleApprove = async () => {
    if (!approveTarget) return;
    setActionLoading(true);
    try {
      await approveVerification(approveTarget);
      showToast(t('verification.approvedSuccess'), 'success');
      setApproveTarget(null);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to approve', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!denyTarget || !denyReason.trim()) return;
    setActionLoading(true);
    try {
      await denyVerification(denyTarget, denyReason.trim());
      showToast(t('verification.deniedSuccess'), 'success');
      setDenyTarget(null);
      setDenyReason('');
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to deny', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'denied', label: 'Denied' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('verification.title')}</h1>

      <div className="mb-4 max-w-xs">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as VerificationRequestStatus | '');
            setPage(1);
          }}
          options={statusOptions}
          placeholder={t('verification.allStatuses')}
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
                <Skeleton className="h-5 w-24" variant="text" />
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
                      {t('verification.group')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('verification.method')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('verification.status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('verification.createdAt')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('verification.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.data.map((v) => (
                    <tr
                      key={v.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/admin/verification/${v.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.groupName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {v.method.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(v.status)}>{v.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(v.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {v.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => setApproveTarget(v.id)}>
                              {t('verification.approve')}
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => setDenyTarget(v.id)}>
                              {t('verification.deny')}
                            </Button>
                          </div>
                        )}
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
        <EmptyState icon={faShieldHalved} title={t('verification.empty')} />
      )}

      {/* Approve modal */}
      <ConfirmModal
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={handleApprove}
        title={t('verification.confirmApprove')}
        message={t('verification.confirmApproveMessage')}
        confirmLabel={t('verification.approve')}
        isLoading={actionLoading}
      />

      {/* Deny modal */}
      <Modal
        open={!!denyTarget}
        onClose={() => {
          setDenyTarget(null);
          setDenyReason('');
        }}
        title={t('verification.deny')}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t('verification.denyReasonLabel')}</p>
          <textarea
            value={denyReason}
            onChange={(e) => setDenyReason(e.target.value)}
            placeholder={t('verification.denyReasonPlaceholder')}
            className="w-full min-h-[100px] px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDenyTarget(null);
                setDenyReason('');
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDeny}
              isLoading={actionLoading}
              disabled={!denyReason.trim()}
            >
              {t('verification.deny')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
