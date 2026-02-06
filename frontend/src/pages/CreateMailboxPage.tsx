import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHalved, faLock } from '@fortawesome/free-solid-svg-icons';
import { createMailbox } from '../api/mailbox';
import { Alert, Button, IconCircle, RegionAutocomplete } from '../components/ui';
import { PublicHeader, PublicFooter } from '../components/layout';
import { generateKeyPair, saveMailboxToStorage, loadMailboxFromStorage } from '../utils/crypto';
import type { AidCategory } from '../api/types';

const AID_CATEGORIES: AidCategory[] = ['rent', 'food', 'utilities', 'other'];

type HelpMode = 'choose' | 'create' | 'check';

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
  const [mode, setMode] = useState<HelpMode>('choose');
  const [passphrase, setPassphrase] = useState('');

  // Time gate: record mount time for bot protection
  const mountTime = useRef(Date.now());

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

    // Time gate: reject submissions faster than 2 seconds
    const elapsed = Date.now() - mountTime.current;
    if (elapsed < 2000) {
      setError(t('help:errors.createFailed'));
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

  const handleCheckMessages = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphrase.trim()) return;
    // Navigate to mailbox view with passphrase-derived ID
    // For now, navigate using the stored mailbox if available
    if (existingMailbox) {
      navigate(`/help/mailbox/${existingMailbox}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary-50/40 to-white">
      <PublicHeader />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-lg mx-auto">
          {/* Section icon + title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <IconCircle icon={faShieldHalved} size="lg" color="primary" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">
              {t('help:create.title')}
            </h1>
            <p className="text-gray-600">{t('help:create.description')}</p>
          </div>

          {/* Mode toggle: I need help / Check my messages */}
          <div className="flex gap-3 mb-8">
            <Button
              type="button"
              variant={mode === 'create' || mode === 'choose' ? 'primary' : 'secondary'}
              className="flex-1"
              onClick={() => setMode('create')}
            >
              {t('help:needHelp')}
            </Button>
            <Button
              type="button"
              variant={mode === 'check' ? 'primary' : 'secondary'}
              className="flex-1"
              onClick={() => setMode('check')}
            >
              {t('help:checkMessages')}
            </Button>
          </div>

          {/* Create mailbox flow */}
          {(mode === 'create' || mode === 'choose') && (
            <>
              {/* Privacy guarantees — inline, not boxed */}
              <ul className="space-y-2 mb-6">
                {[
                  t('help:create.privacy1'),
                  t('help:create.privacy2'),
                  t('help:create.privacy3'),
                  t('help:create.privacy4'),
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-700">
                    <FontAwesomeIcon
                      icon={faLock}
                      className="text-primary-400 text-xs flex-shrink-0"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>

              {/* Shared computer warning */}
              <p className="text-sm text-gray-500 mb-6">{t('help:sharedComputerWarning')}</p>

              {/* Existing mailbox alert */}
              {existingMailbox && (
                <Alert type="warning" className="mb-6">
                  <p>{t('help:create.existingMailbox')}</p>
                  <Button
                    type="button"
                    variant="secondary"
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

              {/* Form — single subtle container */}
              <form onSubmit={handleSubmit}>
                <div className="bg-gray-50 rounded-lg p-6 space-y-6">
                  {/* Honeypot — invisible to real users */}
                  <input
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    className="absolute -left-[9999px]"
                    aria-hidden="true"
                  />

                  {/* Region */}
                  <RegionAutocomplete
                    label={t('help:create.region')}
                    value={region}
                    onChange={setRegion}
                    placeholder={t('help:create.regionPlaceholder')}
                    helperText={t('help:create.regionHelper')}
                    required
                  />

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('help:create.category')} *
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as AidCategory)}
                      className="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      {AID_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {t(`common:aidCategories.${cat}`)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Privacy warning — inline, not boxed */}
                  <p className="text-sm text-amber-700">{t('help:create.privacyWarning')}</p>
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
            </>
          )}

          {/* Check messages flow */}
          {mode === 'check' && (
            <>
              {existingMailbox ? (
                <div className="text-center">
                  <p className="text-gray-600 mb-6">{t('help:create.existingMailbox')}</p>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => navigate(`/help/mailbox/${existingMailbox}`)}
                  >
                    {t('help:create.viewExisting')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCheckMessages}>
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <p className="text-sm text-gray-600">{t('help:enterPassphrase')}</p>
                    <input
                      type="text"
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder={t('help:passphrasePlaceholder')}
                      className="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                      autoComplete="off"
                    />
                  </div>
                  <div className="mt-6">
                    <Button type="submit" disabled={!passphrase.trim()} className="w-full">
                      {t('help:accessMailbox')}
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
