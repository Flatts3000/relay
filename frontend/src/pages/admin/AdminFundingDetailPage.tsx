import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getAdminFundingRequest,
  approveFundingRequest,
  declineFundingRequest,
  markFundsSent,
  acknowledgeFunding,
} from '../../api/admin';
import { Alert, Badge, Button, ConfirmModal, Modal, Skeleton } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import type { AdminFundingRequestDetail } from '../../api/types';

const TIMELINE_STEPS = ['submitted', 'approved', 'funds_sent', 'acknowledged'] as const;

export function AdminFundingDetailPage() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [request, setRequest] = useState<AdminFundingRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirmAction, setConfirmAction] = useState<
    'approve' | 'sendFunds' | 'acknowledge' | null
  >(null);
  const [showDecline, setShowDecline] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setRequest(await getAdminFundingRequest(id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load funding request');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleConfirmAction = async () => {
    if (!id || !confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction === 'approve') {
        await approveFundingRequest(id);
        showToast(t('funding.approvedSuccess'), 'success');
      } else if (confirmAction === 'sendFunds') {
        await markFundsSent(id);
        showToast(t('funding.fundsSentSuccess'), 'success');
      } else {
        await acknowledgeFunding(id);
        showToast(t('funding.acknowledgedSuccess'), 'success');
      }
      setConfirmAction(null);
      navigate('/admin/funding');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!id || !declineReason.trim()) return;
    setActionLoading(true);
    try {
      await declineFundingRequest(id, declineReason.trim());
      showToast(t('funding.declinedSuccess'), 'success');
      setShowDecline(false);
      navigate('/admin/funding');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to decline', 'error');
    } finally {
      setActionLoading(false);
    }
  };

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

  const getConfirmTitle = () => {
    switch (confirmAction) {
      case 'approve':
        return t('funding.confirmApprove');
      case 'sendFunds':
        return t('funding.confirmSendFunds');
      case 'acknowledge':
        return t('funding.confirmAcknowledge');
      default:
        return '';
    }
  };

  const getConfirmLabel = () => {
    switch (confirmAction) {
      case 'approve':
        return t('funding.approve');
      case 'sendFunds':
        return t('funding.sendFunds');
      case 'acknowledge':
        return t('funding.acknowledge');
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div>
        <Skeleton className="h-5 w-24 mb-4" variant="text" />
        <Skeleton className="h-8 w-64 mb-6" variant="text" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (error) return <Alert type="error">{error}</Alert>;
  if (!request) return null;

  const getStepDate = (step: string) => {
    switch (step) {
      case 'submitted':
        return request.submittedAt;
      case 'approved':
        return request.approvedAt;
      case 'funds_sent':
        return request.fundsSentAt;
      case 'acknowledged':
        return request.acknowledgedAt;
      default:
        return null;
    }
  };

  const isDeclined = request.status === 'declined';
  const currentStepIndex = TIMELINE_STEPS.indexOf(
    request.status as (typeof TIMELINE_STEPS)[number]
  );

  return (
    <div>
      <Link
        to="/admin/funding"
        className="text-sm text-primary-600 hover:underline mb-4 inline-block"
      >
        &larr; {t('funding.title')}
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('funding.detail')}</h1>
        <Badge variant={statusVariant(request.status)}>{request.status.replace(/_/g, ' ')}</Badge>
      </div>

      {/* Timeline */}
      {!isDeclined && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">{t('funding.timeline')}</h2>
          <div className="flex items-center gap-0">
            {TIMELINE_STEPS.map((step, i) => {
              const date = getStepDate(step);
              const isComplete = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        isComplete ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                      } ${isCurrent ? 'ring-2 ring-green-300' : ''}`}
                    >
                      {i + 1}
                    </div>
                    <span className="text-xs text-gray-600 mt-1 capitalize">
                      {step.replace(/_/g, ' ')}
                    </span>
                    {date && (
                      <span className="text-xs text-gray-400">
                        {new Date(date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 ${i < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">{t('funding.group')}</dt>
            <dd>
              <Link
                to={`/admin/groups/${request.groupId}`}
                className="text-primary-600 hover:underline"
              >
                {request.groupName}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('funding.amount')}</dt>
            <dd className="text-gray-900 font-semibold">
              ${Number(request.amount).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('funding.category')}</dt>
            <dd className="text-gray-900">{tc(`aidCategories.${request.category}`)}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('funding.urgency')}</dt>
            <dd>
              <Badge variant={request.urgency === 'urgent' ? 'error' : 'default'}>
                {request.urgency}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('funding.region')}</dt>
            <dd className="text-gray-900">{request.region}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('funding.submittedAt')}</dt>
            <dd className="text-gray-900">{new Date(request.submittedAt).toLocaleDateString()}</dd>
          </div>
          {request.justification && (
            <div className="sm:col-span-2">
              <dt className="font-medium text-gray-500">{t('funding.justification')}</dt>
              <dd className="text-gray-900">{request.justification}</dd>
            </div>
          )}
          {request.declineReason && (
            <div className="sm:col-span-2">
              <dt className="font-medium text-gray-500">{t('funding.declineReason')}</dt>
              <dd className="text-red-600">{request.declineReason}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Actions */}
      {request.status === 'submitted' && (
        <div className="flex gap-3">
          <Button onClick={() => setConfirmAction('approve')}>{t('funding.approve')}</Button>
          <Button variant="danger" onClick={() => setShowDecline(true)}>
            {t('funding.decline')}
          </Button>
        </div>
      )}
      {request.status === 'approved' && (
        <Button onClick={() => setConfirmAction('sendFunds')}>{t('funding.sendFunds')}</Button>
      )}
      {request.status === 'funds_sent' && (
        <Button onClick={() => setConfirmAction('acknowledge')}>{t('funding.acknowledge')}</Button>
      )}

      <ConfirmModal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={getConfirmTitle()}
        message={getConfirmTitle()}
        confirmLabel={getConfirmLabel()}
        isLoading={actionLoading}
      />

      <Modal
        open={showDecline}
        onClose={() => {
          setShowDecline(false);
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
                setShowDecline(false);
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
