import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts';
import { requestVerification } from '../api/verification';
import { Alert, Button } from '../components/ui';
import type { VerificationMethod } from '../api/types';

export function RequestVerificationPage() {
  const { t } = useTranslation(['verification', 'common']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState<VerificationMethod | null>(null);
  const [sponsorInfo, setSponsorInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!method || !user?.groupId) return;

    setIsSubmitting(true);
    setError('');

    try {
      await requestVerification(user.groupId, {
        method,
        sponsorInfo: method === 'sponsor_reference' ? sponsorInfo : undefined,
      });
      navigate('/profile', { state: { message: t('verification:requestSubmitted') } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('verification:errors.failedToSubmit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const methods: { value: VerificationMethod; title: string; description: string }[] = [
    {
      value: 'hub_approval',
      title: t('verification:methods.hubApproval'),
      description: t('verification:methods.hubApprovalDescription'),
    },
    {
      value: 'peer_attestation',
      title: t('verification:methods.peerAttestation'),
      description: t('verification:methods.peerAttestationDescription'),
    },
    {
      value: 'sponsor_reference',
      title: t('verification:methods.sponsorReference'),
      description: t('verification:methods.sponsorReferenceDescription'),
    },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t('verification:requestVerification')}
      </h1>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('verification:selectMethod')}
          </h2>

          <div className="space-y-4">
            {methods.map((m) => (
              <label
                key={m.value}
                className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                  method === m.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start">
                  <input
                    type="radio"
                    name="method"
                    value={m.value}
                    checked={method === m.value}
                    onChange={() => setMethod(m.value)}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{m.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{m.description}</div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {method === 'sponsor_reference' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('verification:sponsorReference.title')}
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('verification:sponsorReference.sponsorInfo')}
              </label>
              <textarea
                value={sponsorInfo}
                onChange={(e) => setSponsorInfo(e.target.value)}
                placeholder={t('verification:sponsorReference.sponsorInfoPlaceholder')}
                className="w-full px-4 py-3 min-h-[120px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                {t('verification:sponsorReference.sponsorInfoHelper')}
              </p>
            </div>
          </div>
        )}

        {method === 'peer_attestation' && (
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <p className="text-primary-800">{t('verification:peerAttestation.requiresTwo')}</p>
          </div>
        )}

        <div className="flex gap-4">
          <Button type="button" variant="secondary" onClick={() => navigate('/profile')}>
            {t('common:cancel')}
          </Button>
          <Button
            type="submit"
            disabled={
              !method || isSubmitting || (method === 'sponsor_reference' && !sponsorInfo.trim())
            }
            isLoading={isSubmitting}
          >
            {t('verification:requestVerification')}
          </Button>
        </div>
      </form>
    </div>
  );
}
