import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createMailbox } from '../api/mailbox';
import { Alert, Button } from '../components/ui';
import { generateKeyPair, saveMailboxToStorage, loadMailboxFromStorage } from '../utils/crypto';
import type { AidCategory } from '../api/types';

const AID_CATEGORIES: AidCategory[] = ['rent', 'food', 'utilities', 'other'];

/**
 * Anonymous mailbox creation page.
 * CRITICAL: No authentication, no tracking, no cookies.
 * Individuals can create a mailbox to receive help from local groups.
 */
export function CreateMailboxPage() {
  const { t } = useTranslation(['help', 'common']);
  const navigate = useNavigate();
  const [region, setRegion] = useState('');
  const [category, setCategory] = useState<AidCategory>('rent');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [existingMailbox, setExistingMailbox] = useState<string | null>(null);

  // Check for existing mailbox
  useEffect(() => {
    const stored = loadMailboxFromStorage();
    if (stored) {
      setExistingMailbox(stored.id);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!region.trim()) {
      setError(t('help:errors.regionRequired'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Generate new key pair
      const keyPair = generateKeyPair();

      // Create mailbox on server
      const result = await createMailbox({
        publicKey: keyPair.publicKey,
        helpCategory: category,
        region: region.trim(),
      });

      // Save mailbox data locally
      saveMailboxToStorage({
        id: result.id,
        keyPair,
        createdAt: new Date().toISOString(),
      });

      // Navigate to mailbox view
      navigate(`/help/mailbox/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('help:errors.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('help:create.title')}</h1>
        <p className="text-gray-600 mb-8">{t('help:create.description')}</p>

        {/* Privacy notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h2 className="font-medium text-green-800 mb-2">{t('help:create.privacyTitle')}</h2>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• {t('help:create.privacy1')}</li>
            <li>• {t('help:create.privacy2')}</li>
            <li>• {t('help:create.privacy3')}</li>
            <li>• {t('help:create.privacy4')}</li>
          </ul>
        </div>

        {existingMailbox && (
          <Alert type="warning" className="mb-6">
            <p>{t('help:create.existingMailbox')}</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => navigate(`/help/mailbox/${existingMailbox}`)}
            >
              {t('help:create.viewExisting')}
            </Button>
          </Alert>
        )}

        {error && (
          <Alert type="error" className="mb-6">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
            {/* Region */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('help:create.region')} *
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder={t('help:create.regionPlaceholder')}
                className="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-sm text-gray-500 mt-1">{t('help:create.regionHelper')}</p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('help:create.category')} *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AidCategory)}
                className="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {AID_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`common:aidCategories.${cat}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Privacy warning */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">{t('help:create.privacyWarning')}</p>
            </div>
          </div>

          <div className="mt-6">
            <Button
              type="submit"
              disabled={!region.trim() || isSubmitting}
              isLoading={isSubmitting}
              className="w-full"
            >
              {t('help:create.submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
