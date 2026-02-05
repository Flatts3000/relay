import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getVerificationRequests } from '../api/verification';
import { Alert } from '../components/ui';
import type {
  VerificationRequest,
  VerificationRequestStatus,
  VerificationMethod,
} from '../api/types';

export function VerificationQueuePage() {
  const { t } = useTranslation(['verification', 'common']);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<VerificationRequestStatus | ''>('pending');
  const [methodFilter, setMethodFilter] = useState<VerificationMethod | ''>('');

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await getVerificationRequests({
        status: statusFilter || undefined,
        method: methodFilter || undefined,
      });
      setRequests(result.requests);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verification:errors.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, methodFilter, t]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const getStatusBadgeClass = (status: VerificationRequestStatus) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'denied':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getMethodLabel = (method: VerificationMethod) => {
    switch (method) {
      case 'hub_approval':
        return t('verification:methods.hubApproval');
      case 'peer_attestation':
        return t('verification:methods.peerAttestation');
      case 'sponsor_reference':
        return t('verification:methods.sponsorReference');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('verification:verificationQueue')}</h1>
        <p className="text-gray-600">
          {t('verification:pendingRequests')}: {total}
        </p>
      </div>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as VerificationRequestStatus | '')}
            className="px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('verification:status.pending')} & All</option>
            <option value="pending">{t('verification:status.pending')}</option>
            <option value="approved">{t('verification:status.approved')}</option>
            <option value="denied">{t('verification:status.denied')}</option>
          </select>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as VerificationMethod | '')}
            className="px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Methods</option>
            <option value="hub_approval">{t('verification:methods.hubApproval')}</option>
            <option value="peer_attestation">{t('verification:methods.peerAttestation')}</option>
            <option value="sponsor_reference">{t('verification:methods.sponsorReference')}</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600">{t('verification:noRequestsPending')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Link
              key={request.id}
              to={`/verification/requests/${request.id}`}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:border-blue-300 hover:shadow transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{request.groupName}</h3>
                  <p className="text-gray-600">{request.groupServiceArea}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(request.status)}`}
                  >
                    {t(`verification:status.${request.status}`)}
                  </span>
                  <span className="text-sm text-gray-500">{getMethodLabel(request.method)}</span>
                </div>
              </div>
              {request.method === 'peer_attestation' && (
                <div className="mt-3 text-sm text-gray-600">
                  {t('verification:peerAttestation.attestationsReceived', {
                    count: request.attestationCount,
                  })}
                </div>
              )}
              <div className="mt-3 text-sm text-gray-500">
                {new Date(request.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
