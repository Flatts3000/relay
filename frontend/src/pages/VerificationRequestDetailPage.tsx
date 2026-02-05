import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getVerificationRequestDetail,
  approveVerification,
  denyVerification,
} from '../api/verification';
import { Alert, Button } from '../components/ui';
import type { VerificationRequest, PeerAttestation } from '../api/types';

export function VerificationRequestDetailPage() {
  const { t } = useTranslation(['verification', 'common']);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [attestations, setAttestations] = useState<PeerAttestation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      if (!id) return;

      setIsLoading(true);
      setError('');

      try {
        const result = await getVerificationRequestDetail(id);
        setRequest(result.request);
        setAttestations(result.attestations);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('verification:errors.failedToLoad'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequest();
  }, [id, t]);

  const handleApprove = async () => {
    if (!id || !request) return;

    setIsSubmitting(true);
    setError('');

    try {
      await approveVerification(id);
      navigate('/verification', { state: { message: t('verification:approve.success') } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verification:errors.failedToApprove'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeny = async () => {
    if (!id || !denyReason.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      await denyVerification(id, { reason: denyReason });
      navigate('/verification', { state: { message: t('verification:deny.success') } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verification:errors.failedToDeny'));
    } finally {
      setIsSubmitting(false);
      setShowDenyModal(false);
    }
  };

  const canApprove = () => {
    if (!request || request.status !== 'pending') return false;
    if (request.method === 'peer_attestation' && request.attestationCount < 2) return false;
    return true;
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
          <Link to="/verification" className="text-blue-600 hover:text-blue-700 font-medium">
            &larr; {t('verification:verificationQueue')}
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
          <Link to="/verification" className="text-blue-600 hover:text-blue-700 font-medium">
            &larr; {t('verification:verificationQueue')}
          </Link>
        </div>
      </div>
    );
  }

  const getMethodLabel = () => {
    switch (request.method) {
      case 'hub_approval':
        return t('verification:methods.hubApproval');
      case 'peer_attestation':
        return t('verification:methods.peerAttestation');
      case 'sponsor_reference':
        return t('verification:methods.sponsorReference');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/verification" className="text-blue-600 hover:text-blue-700 font-medium">
          &larr; {t('verification:verificationQueue')}
        </Link>
      </div>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">{t('verification:requestDetails')}</h1>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              request.status === 'approved'
                ? 'bg-green-100 text-green-800'
                : request.status === 'denied'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {t(`verification:status.${request.status}`)}
          </span>
        </div>

        <dl className="divide-y divide-gray-200">
          <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">Group Name</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              <Link to={`/groups/${request.groupId}`} className="text-blue-600 hover:text-blue-700">
                {request.groupName}
              </Link>
            </dd>
          </div>

          <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">Service Area</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {request.groupServiceArea}
            </dd>
          </div>

          <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">Verification Method</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{getMethodLabel()}</dd>
          </div>

          {request.method === 'sponsor_reference' && request.sponsorInfo && (
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">
                {t('verification:sponsorReference.sponsorInfo')}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-wrap">
                {request.sponsorInfo}
              </dd>
            </div>
          )}

          <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
            <dt className="text-sm font-medium text-gray-500">Requested</dt>
            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
              {new Date(request.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
          </div>

          {request.denialReason && (
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">Denial Reason</dt>
              <dd className="mt-1 text-sm text-red-600 sm:mt-0 sm:col-span-2">
                {request.denialReason}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Peer Attestations */}
      {request.method === 'peer_attestation' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('verification:peerAttestation.title')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('verification:peerAttestation.attestationsReceived', {
                count: attestations.length,
              })}
            </p>
          </div>

          {attestations.length === 0 ? (
            <div className="px-6 py-4 text-gray-600">No attestations received yet</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {attestations.map((attestation) => (
                <li key={attestation.id} className="px-6 py-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">
                      {attestation.attestingGroupName}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(attestation.attestedAt).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {attestations.length < 2 && request.status === 'pending' && (
            <div className="px-6 py-4 bg-yellow-50 border-t border-yellow-200">
              <p className="text-sm text-yellow-800">
                {t('verification:peerAttestation.requiresTwo')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {request.status === 'pending' && (
        <div className="flex gap-4">
          <Button
            variant="secondary"
            onClick={() => setShowDenyModal(true)}
            disabled={isSubmitting}
          >
            {t('verification:actions.deny')}
          </Button>
          <Button
            onClick={handleApprove}
            disabled={!canApprove() || isSubmitting}
            isLoading={isSubmitting && !showDenyModal}
          >
            {t('verification:actions.approve')}
          </Button>
        </div>
      )}

      {/* Deny Modal */}
      {showDenyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t('verification:deny.title')}
            </h3>
            <p className="text-gray-600 mb-4">
              {t('verification:deny.confirmMessage', { groupName: request.groupName })}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('verification:deny.reason')}
              </label>
              <textarea
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                placeholder={t('verification:deny.reasonPlaceholder')}
                className="w-full px-4 py-3 min-h-[100px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex gap-4 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowDenyModal(false);
                  setDenyReason('');
                }}
                disabled={isSubmitting}
              >
                {t('common:cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDeny}
                disabled={!denyReason.trim() || isSubmitting}
                isLoading={isSubmitting}
              >
                {t('verification:actions.deny')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
