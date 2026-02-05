import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts';
import {
  getFundingRequestDetail,
  approveFundingRequest,
  declineFundingRequest,
  requestClarification,
  markFundsSent,
  acknowledgeReceipt,
} from '../api/requests';
import { Alert, Button } from '../components/ui';
import type { FundingRequest, StatusHistoryEntry } from '../api/types';

export function FundingRequestDetailPage() {
  const { t } = useTranslation(['requests', 'common']);
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [request, setRequest] = useState<FundingRequest | null>(null);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [showClarifyModal, setShowClarifyModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [clarifyMessage, setClarifyMessage] = useState('');

  const isHubAdmin = user?.role === 'hub_admin';
  const isGroupCoordinator = user?.role === 'group_coordinator';

  useEffect(() => {
    const fetchRequest = async () => {
      if (!id) return;

      setIsLoading(true);
      setError('');

      try {
        const result = await getFundingRequestDetail(id);
        setRequest(result.request);
        setHistory(result.history);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('requests:errors.failedToLoad'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequest();
  }, [id, t]);

  const handleApprove = async () => {
    if (!id) return;

    setIsSubmitting(true);
    setError('');

    try {
      const result = await approveFundingRequest(id);
      setRequest(result.request);
      // Refresh history
      const detail = await getFundingRequestDetail(id);
      setHistory(detail.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('requests:errors.failedToApprove'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!id || !declineReason.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const result = await declineFundingRequest(id, { reason: declineReason });
      setRequest(result.request);
      setShowDeclineModal(false);
      setDeclineReason('');
      const detail = await getFundingRequestDetail(id);
      setHistory(detail.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('requests:errors.failedToDecline'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClarify = async () => {
    if (!id || !clarifyMessage.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const result = await requestClarification(id, { message: clarifyMessage });
      setRequest(result.request);
      setShowClarifyModal(false);
      setClarifyMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('requests:errors.failedToLoad'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkSent = async () => {
    if (!id) return;

    setIsSubmitting(true);
    setError('');

    try {
      const result = await markFundsSent(id);
      setRequest(result.request);
      const detail = await getFundingRequestDetail(id);
      setHistory(detail.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('requests:errors.failedToMarkSent'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcknowledge = async () => {
    if (!id) return;

    setIsSubmitting(true);
    setError('');

    try {
      const result = await acknowledgeReceipt(id);
      setRequest(result.request);
      const detail = await getFundingRequestDetail(id);
      setHistory(detail.history);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('requests:errors.failedToAcknowledge'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'funds_sent':
        return 'bg-blue-100 text-blue-800';
      case 'acknowledged':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert type="error">{error}</Alert>
        <div className="mt-4">
          <Link to="/requests" className="text-blue-600 hover:text-blue-700 font-medium">
            &larr; Back to Requests
          </Link>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">Request not found</h2>
        <div className="mt-4">
          <Link to="/requests" className="text-blue-600 hover:text-blue-700 font-medium">
            &larr; Back to Requests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/requests" className="text-blue-600 hover:text-blue-700 font-medium">
          &larr; Back to Requests
        </Link>
      </div>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Request Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">{t('requests:requestDetails')}</h1>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(request.status)}`}
          >
            {t(`requests:status.${request.status === 'funds_sent' ? 'fundsSent' : request.status}`)}
          </span>
        </div>

        <dl className="divide-y divide-gray-200">
          <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">{t('requests:details.amount')}</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-semibold text-lg">
              {formatAmount(request.amount)}
              {request.urgency === 'urgent' && (
                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                  {t('requests:form.urgencyUrgent')}
                </span>
              )}
            </dd>
          </div>

          {isHubAdmin && (
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">
                {t('requests:details.requestedBy')}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <Link
                  to={`/groups/${request.groupId}`}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {request.groupName}
                </Link>
              </dd>
            </div>
          )}

          <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">{t('requests:details.category')}</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {t(`common:aidCategories.${request.category}`)}
            </dd>
          </div>

          <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">{t('requests:details.region')}</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{request.region}</dd>
          </div>

          {request.justification && (
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">
                {t('requests:details.justification')}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-wrap">
                {request.justification}
              </dd>
            </div>
          )}

          <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">
              {t('requests:details.submittedAt')}
            </dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {new Date(request.submittedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </dd>
          </div>

          {request.declineReason && (
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">
                {t('requests:details.declineReason')}
              </dt>
              <dd className="mt-1 text-sm text-red-600 sm:mt-0 sm:col-span-2">
                {request.declineReason}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Clarification Request */}
      {request.clarificationRequest && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            {t('requests:clarify.pending')}
          </h3>
          <p className="text-sm text-yellow-700">{request.clarificationRequest}</p>
        </div>
      )}

      {/* Status Timeline */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('requests:statusTimeline.title')}
          </h2>
        </div>
        <div className="px-6 py-4">
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div key={entry.id} className="flex items-start">
                <div className="flex-shrink-0">
                  <div
                    className={`w-3 h-3 rounded-full mt-1.5 ${
                      index === history.length - 1 ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">
                    {t(
                      `requests:status.${entry.status === 'funds_sent' ? 'fundsSent' : entry.status}`
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(entry.changedAt).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {entry.notes && <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4 flex-wrap">
        {/* Hub Admin Actions */}
        {isHubAdmin && request.status === 'submitted' && (
          <>
            <Button
              variant="secondary"
              onClick={() => setShowDeclineModal(true)}
              disabled={isSubmitting}
            >
              {t('requests:actions.decline')}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowClarifyModal(true)}
              disabled={isSubmitting}
            >
              {t('requests:actions.requestClarification')}
            </Button>
            <Button onClick={handleApprove} disabled={isSubmitting} isLoading={isSubmitting}>
              {t('requests:actions.approve')}
            </Button>
          </>
        )}

        {isHubAdmin && request.status === 'approved' && (
          <Button onClick={handleMarkSent} disabled={isSubmitting} isLoading={isSubmitting}>
            {t('requests:actions.markFundsSent')}
          </Button>
        )}

        {/* Group Coordinator Actions */}
        {isGroupCoordinator && request.status === 'funds_sent' && (
          <Button onClick={handleAcknowledge} disabled={isSubmitting} isLoading={isSubmitting}>
            {t('requests:actions.acknowledgeReceipt')}
          </Button>
        )}
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('requests:decline.title')}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('requests:decline.reason')}
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder={t('requests:decline.reasonPlaceholder')}
                className="w-full px-4 py-3 min-h-[100px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex gap-4 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDeclineModal(false);
                  setDeclineReason('');
                }}
                disabled={isSubmitting}
              >
                {t('common:cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDecline}
                disabled={!declineReason.trim() || isSubmitting}
                isLoading={isSubmitting}
              >
                {t('requests:actions.decline')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clarify Modal */}
      {showClarifyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('requests:clarify.title')}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('requests:clarify.message')}
              </label>
              <textarea
                value={clarifyMessage}
                onChange={(e) => setClarifyMessage(e.target.value)}
                placeholder={t('requests:clarify.messagePlaceholder')}
                className="w-full px-4 py-3 min-h-[100px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex gap-4 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowClarifyModal(false);
                  setClarifyMessage('');
                }}
                disabled={isSubmitting}
              >
                {t('common:cancel')}
              </Button>
              <Button
                onClick={handleClarify}
                disabled={!clarifyMessage.trim() || isSubmitting}
                isLoading={isSubmitting}
              >
                {t('requests:actions.requestClarification')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
