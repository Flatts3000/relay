import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShieldHalved,
  faLock,
  faCopy,
  faCheck,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { createMailbox, lookupMailboxByPublicKey } from '../api/mailbox';
import { Alert, Button, IconCircle, RegionAutocomplete } from '../components/ui';
import { PublicHeader, PublicFooter } from '../components/layout';
import {
  deriveKeyPairFromPassphrase,
  generatePassphrase,
  saveMailboxToStorage,
  loadMailboxFromStorage,
} from '../utils/crypto';
import type { AidCategory } from '../api/types';

const AID_CATEGORIES: AidCategory[] = ['rent', 'food', 'utilities', 'other'];

type HelpMode = 'choose' | 'create' | 'check' | 'passphrase';

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
  const [checkPassphrase, setCheckPassphrase] = useState('');

  // Passphrase display step state
  const [generatedPassphrase, setGeneratedPassphrase] = useState('');
  const [mailboxId, setMailboxId] = useState('');
  const [passphraseConfirmed, setPassphraseConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);

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
      // Generate passphrase and derive key pair from it
      const newPassphrase = generatePassphrase();
      const keyPair = await deriveKeyPairFromPassphrase(newPassphrase);

      // Create mailbox on server with derived public key
      const result = await createMailbox({
        publicKey: keyPair.publicKey,
        helpCategory: category,
        region: region.trim(),
      });

      // Store mailbox ID and passphrase for the confirmation step
      setMailboxId(result.id);
      setGeneratedPassphrase(newPassphrase);

      // Save to localStorage only if user opted in (with passphrase included)
      if (rememberDevice) {
        saveMailboxToStorage({
          id: result.id,
          keyPair,
          createdAt: new Date().toISOString(),
          passphrase: newPassphrase,
        });
      }

      // Show passphrase step instead of navigating immediately
      setMode('passphrase');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('help:errors.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckMessages = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkPassphrase.trim()) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Derive key pair from the entered passphrase
      const keyPair = await deriveKeyPairFromPassphrase(checkPassphrase.trim());

      // Look up mailbox by derived public key
      const result = await lookupMailboxByPublicKey(keyPair.publicKey);

      if (!result) {
        setError(t('help:errors.mailboxNotFound'));
        return;
      }

      // Save to localStorage so ViewMailboxPage can decrypt messages
      saveMailboxToStorage({
        id: result.id,
        keyPair,
        createdAt: new Date().toISOString(),
        passphrase: checkPassphrase.trim(),
      });

      navigate(`/help/mailbox/${result.id}`);
    } catch {
      setError(t('help:errors.lookupFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPassphrase = async () => {
    try {
      await navigator.clipboard.writeText(generatedPassphrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text for manual copy
    }
  };

  const handlePassphraseConfirm = () => {
    if (rememberDevice) {
      // localStorage was already saved during creation
    }
    navigate(`/help/mailbox/${mailboxId}`);
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

                  {/* Remember this device */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      className="mt-0.5 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        {t('help:create.rememberDevice')}
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t('help:create.rememberDeviceHelper')}
                      </p>
                    </div>
                  </label>
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

          {/* Passphrase display step */}
          {mode === 'passphrase' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {t('help:passphrase.title')}
                </h2>
                <p className="text-gray-600">{t('help:passphrase.description')}</p>
              </div>

              {/* Passphrase display */}
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">
                  {t('help:passphrase.writeItDown')}
                </p>
                <p className="font-mono text-2xl font-bold text-gray-900 tracking-wide select-all break-all">
                  {generatedPassphrase}
                </p>
                <button
                  type="button"
                  onClick={handleCopyPassphrase}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
                  {copied ? t('help:passphrase.copied') : t('help:passphrase.copy')}
                </button>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <FontAwesomeIcon
                  icon={faTriangleExclamation}
                  className="text-amber-500 mt-0.5 flex-shrink-0"
                />
                <p className="text-sm text-amber-800">{t('help:passphrase.warning')}</p>
              </div>

              {/* Confirmation checkbox */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={passphraseConfirmed}
                  onChange={(e) => setPassphraseConfirmed(e.target.checked)}
                  className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  {t('help:passphrase.confirm')}
                </span>
              </label>

              {/* Continue button */}
              <Button
                type="button"
                disabled={!passphraseConfirmed}
                onClick={handlePassphraseConfirm}
                className="w-full"
              >
                {t('common:continue', 'Continue')}
              </Button>
            </div>
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
                  {error && (
                    <Alert type="error" className="mb-4">
                      {error}
                    </Alert>
                  )}
                  <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <p className="text-sm text-gray-600">{t('help:enterPassphrase')}</p>
                    <input
                      type="text"
                      value={checkPassphrase}
                      onChange={(e) => setCheckPassphrase(e.target.value)}
                      placeholder={t('help:passphrasePlaceholder')}
                      className="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                      autoComplete="off"
                    />
                  </div>
                  <div className="mt-6">
                    <Button
                      type="submit"
                      disabled={!checkPassphrase.trim() || isSubmitting}
                      isLoading={isSubmitting}
                      className="w-full"
                    >
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
