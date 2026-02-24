import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { faDollarSign } from '@fortawesome/free-solid-svg-icons';
import {
  getAdminFundingRequests,
  approveFundingRequest,
  declineFundingRequest,
  markFundsSent,
  acknowledgeFunding,
} from '../../api/admin';
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
import type { AdminFundingRequest, PaginatedResponse, RequestStatus } from '../../api/types';

export function AdminFundingPage() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = useState<PaginatedResponse<AdminFundingRequest> | null>(null);
  const [status, setStatus] = useState<RequestStatus | ''>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Action state
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    type: 'approve' | 'sendFunds' | 'acknowledge';
  } | null>(null);
  const [declineTarget, setDeclineTarget] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getAdminFundingRequests(status || undefined, undefined, page));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load funding requests');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const statusVariant = (s: string) => {
    switch (s) {
      case 'approved':
      case 'funds_sent':
      case 'acknowledged':
        return 'success' as const;
      case 'declined':
        return 'error' as const;
      default:
        return 'warning' as const;
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction.type === 'approve') {
        await approveFundingRequest(confirmAction.id);
        showToast(t('funding.approvedSuccess'), 'success');
      } else if (confirmAction.type === 'sendFunds') {
        await markFundsSent(confirmAction.id);
        showToast(t('funding.fundsSentSuccess'), 'success');
      } else {
        await acknowledgeFunding(confirmAction.id);
        showToast(t('funding.acknowledgedSuccess'), 'success');
      }
      setConfirmAction(null);
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!declineTarget || !declineReason.trim()) return;
    setActionLoading(true);
    try {
      await declineFundingRequest(declineTarget, declineReason.trim());
      showToast(t('funding.declinedSuccess'), 'success');
      setDeclineTarget(null);
      setDeclineReason('');
      fetchData();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to decline', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getConfirmTitle = () => {
    if (!confirmAction) return '';
    switch (confirmAction.type) {
      case 'approve':
        return t('funding.confirmApprove');
      case 'sendFunds':
        return t('funding.confirmSendFunds');
      case 'acknowledge':
        return t('funding.confirmAcknowledge');
    }
  };

  const getConfirmLabel = () => {
    if (!confirmAction) return '';
    switch (confirmAction.type) {
      case 'approve':
        return t('funding.approve');
      case 'sendFunds':
        return t('funding.sendFunds');
      case 'acknowledge':
        return t('funding.acknowledge');
    }
  };

  const statusOptions = [
    { value: 'submitted', label: 'Submitted' },
    { value: 'approved', label: 'Approved' },
    { value: 'declined', label: 'Declined' },
    { value: 'funds_sent', label: 'Funds Sent' },
    { value: 'acknowledged', label: 'Acknowledged' },
  ];

  const renderActions = (fr: AdminFundingRequest) => {
    switch (fr.status) {
      case 'submitted':
        return (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setConfirmAction({ id: fr.id, type: 'approve' })}>
              {t('funding.approve')}
            </Button>
            <Button size="sm" variant="danger" onClick={() => setDeclineTarget(fr.id)}>
              {t('funding.decline')}
            </Button>
          </div>
        );
      case 'approved':
        return (
          <Button size="sm" onClick={() => setConfirmAction({ id: fr.id, type: 'sendFunds' })}>
            {t('funding.sendFunds')}
          </Button>
        );
      case 'funds_sent':
        return (
          <Button size="sm" onClick={() => setConfirmAction({ id: fr.id, type: 'acknowledge' })}>
            {t('funding.acknowledge')}
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('funding.title')}</h1>

      <div className="mb-4 max-w-xs">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as RequestStatus | '');
            setPage(1);
          }}
          options={statusOptions}
          placeholder={t('funding.allStatuses')}
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
                <Skeleton className="h-5 w-20" variant="text" />
                <Skeleton className="h-5 w-16" variant="text" />
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
                      {t('funding.group')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('funding.amount')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('funding.category')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('funding.urgency')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('funding.status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {t('funding.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.data.map((fr) => (
                    <tr
                      key={fr.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/admin/funding/${fr.id}`)}
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/groups/${fr.groupId}`}
                          className="text-primary-600 hover:underline font-medium text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {fr.groupName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        ${Number(fr.amount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {tc(`aidCategories.${fr.category}`)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={fr.urgency === 'urgent' ? 'error' : 'default'}>
                          {fr.urgency}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(fr.status)}>
                          {fr.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {renderActions(fr)}
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
        <EmptyState icon={faDollarSign} title={t('funding.empty')} />
      )}

      {/* Approve / Send Funds / Acknowledge modal */}
      <ConfirmModal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={getConfirmTitle()}
        message={getConfirmTitle()}
        confirmLabel={getConfirmLabel()}
        isLoading={actionLoading}
      />

      {/* Decline modal */}
      <Modal
        open={!!declineTarget}
        onClose={() => {
          setDeclineTarget(null);
          setDeclineReason('');
        }}
        title={t('funding.decline')}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t('funding.declineReasonLabel')}</p>
          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            placeholder={t('funding.declineReasonPlaceholder')}
            className="w-full min-h-[100px] px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDeclineTarget(null);
                setDeclineReason('');
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDecline}
              isLoading={actionLoading}
              disabled={!declineReason.trim()}
            >
              {t('funding.decline')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
