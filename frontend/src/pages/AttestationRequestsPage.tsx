import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getAttestationRequests, submitAttestation } from '../api/verification';
import { Alert, Button } from '../components/ui';
import type { VerificationRequest } from '../api/types';

export function AttestationRequestsPage() {
  const { t } = useTranslation(['verification', 'common']);
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [success, setSuccess] = useState('');

  const loadRequests = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await getAttestationRequests();
      setRequests(result.requests);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verification:errors.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAttest = async (requestId: string) => {
    setSubmittingId(requestId);
    setError('');
    setSuccess('');

    try {
      await submitAttestation(requestId);
      setSuccess(t('verification:peerAttestation.attestationSubmitted'));
      // Refresh the list
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verification:errors.failedToSubmit'));
    } finally {
      setSubmittingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('verification:peerAttestation.provideAttestation')}
        </h1>
        <p className="text-gray-600">{t('verification:peerAttestation.requiresTwo')}</p>
      </div>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}
      {success && (
        <Alert type="success" className="mb-6">
          {success}
        </Alert>
      )}

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600">No attestation requests available</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{request.groupName}</h3>
                  <p className="text-gray-600">{request.groupServiceArea}</p>
                </div>
                <span className="text-sm text-gray-500">
                  {t('verification:peerAttestation.attestationsReceived', {
                    count: request.attestationCount,
                  })}
                </span>
              </div>

              <div className="text-sm text-gray-500 mb-4">
                Requested: {new Date(request.createdAt).toLocaleDateString()}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <label className="flex items-start">
                  <input type="checkbox" className="mt-1 mr-3" id={`confirm-${request.id}`} />
                  <span className="text-sm text-gray-700">
                    {t('verification:peerAttestation.confirmAttestation')}
                  </span>
                </label>
              </div>

              <Button
                onClick={() => handleAttest(request.id)}
                disabled={submittingId === request.id}
                isLoading={submittingId === request.id}
              >
                {t('verification:peerAttestation.submitAttestation')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
