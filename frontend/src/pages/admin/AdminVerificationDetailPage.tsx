import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getAdminVerificationRequest,
  approveVerification,
  denyVerification,
} from '../../api/admin';
import { Alert, Badge, Button, ConfirmModal, Modal, Skeleton } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import type { AdminVerificationRequest } from '../../api/types';

export function AdminVerificationDetailPage() {
  const { t } = useTranslation('admin');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [request, setRequest] = useState<AdminVerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showApprove, setShowApprove] = useState(false);
  const [showDeny, setShowDeny] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setRequest(await getAdminVerificationRequest(id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load verification request');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleApprove = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await approveVerification(id);
      showToast(t('verification.approvedSuccess'), 'success');
      setShowApprove(false);
      navigate('/admin/verification');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to approve', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = async () => {
    if (!id || !denyReason.trim()) return;
    setActionLoading(true);
    try {
      await denyVerification(id, denyReason.trim());
      showToast(t('verification.deniedSuccess'), 'success');
      setShowDeny(false);
      navigate('/admin/verification');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to deny', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const statusVariant = (s: string) =>
    s === 'approved' ? 'success' : s === 'denied' ? 'error' : 'warning';

  if (loading) {
    return (
      <div>
        <Skeleton className="h-5 w-24 mb-4" variant="text" />
        <Skeleton className="h-8 w-64 mb-6" variant="text" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (error) return <Alert type="error">{error}</Alert>;
  if (!request) return null;

  return (
    <div>
      <Link
        to="/admin/verification"
        className="text-sm text-primary-600 hover:underline mb-4 inline-block"
      >
        &larr; {t('verification.title')}
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('verification.detail')}</h1>
        <Badge variant={statusVariant(request.status)}>{request.status}</Badge>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">{t('verification.group')}</dt>
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
            <dt className="font-medium text-gray-500">{t('verification.serviceArea')}</dt>
            <dd className="text-gray-900">{request.groupServiceArea}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('verification.method')}</dt>
            <dd className="text-gray-900">{request.method.replace(/_/g, ' ')}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('verification.createdAt')}</dt>
            <dd className="text-gray-900">{new Date(request.createdAt).toLocaleDateString()}</dd>
          </div>
          {request.sponsorInfo && (
            <div className="sm:col-span-2">
              <dt className="font-medium text-gray-500">{t('verification.sponsorInfo')}</dt>
              <dd className="text-gray-900">{request.sponsorInfo}</dd>
            </div>
          )}
          {request.reviewedAt && (
            <div>
              <dt className="font-medium text-gray-500">{t('verification.reviewedAt')}</dt>
              <dd className="text-gray-900">{new Date(request.reviewedAt).toLocaleDateString()}</dd>
            </div>
          )}
          {request.denialReason && (
            <div className="sm:col-span-2">
              <dt className="font-medium text-gray-500">{t('verification.denyReason')}</dt>
              <dd className="text-gray-900">{request.denialReason}</dd>
            </div>
          )}
        </dl>
      </div>

      {request.status === 'pending' && (
        <div className="flex gap-3">
          <Button onClick={() => setShowApprove(true)}>{t('verification.approve')}</Button>
          <Button variant="danger" onClick={() => setShowDeny(true)}>
            {t('verification.deny')}
          </Button>
        </div>
      )}

      <ConfirmModal
        open={showApprove}
        onClose={() => setShowApprove(false)}
        onConfirm={handleApprove}
        title={t('verification.confirmApprove')}
        message={t('verification.confirmApproveMessage')}
        confirmLabel={t('verification.approve')}
        isLoading={actionLoading}
      />

      <Modal
        open={showDeny}
        onClose={() => {
          setShowDeny(false);
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
                setShowDeny(false);
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
