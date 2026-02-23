import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHalved, faLock, faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';
import { Alert, Button, IconCircle, RegionAutocomplete } from '../components/ui';
import { PublicHeader, PublicFooter } from '../components/layout';
import { fetchDirectory } from '../api/directory';
import {
  generateContentKey,
  encryptPayload,
  wrapKeyForGroup,
  generateSafeWord,
  encodeBase64,
  decodeBase64,
} from '../utils/broadcast-crypto';
import type { BroadcastCategory } from '../api/types';
import { BROADCAST_CATEGORIES } from '../api/types';

const API_BASE = import.meta.env.VITE_API_URL || '';

type PageMode = 'form' | 'receipt';

/**
 * Anonymous broadcast submission page.
 * CRITICAL: No authentication, no tracking, no cookies.
 * Fire-and-forget: individual submits once and leaves.
 */
export function BroadcastSubmitPage() {
  const { t } = useTranslation(['help', 'common']);
  const navigate = useNavigate();

  const [mode, setMode] = useState<PageMode>('form');
  const [region, setRegion] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<BroadcastCategory>>(new Set());
  const [message, setMessage] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Receipt state
  const [broadcastId, setBroadcastId] = useState('');
  const [safeWord, setSafeWord] = useState('');
  const [copied, setCopied] = useState(false);

  // Bot protection
  const mountTime = useRef(Date.now());

  const toggleCategory = (cat: BroadcastCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!region.trim()) {
      setError(t('help:errors.regionRequired'));
      return;
    }
    if (selectedCategories.size === 0) {
      setError(t('help:broadcast.errors.categoryRequired'));
      return;
    }
    if (!message.trim()) {
      setError(t('help:broadcast.errors.messageRequired'));
      return;
    }
    if (!contactInfo.trim()) {
      setError(t('help:broadcast.errors.contactRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Fetch directory for matching groups
      const categories = Array.from(selectedCategories);
      const directoryEntries = await fetchDirectory(region.trim(), categories);

      if (directoryEntries.length === 0) {
        setError(t('help:broadcast.errors.noGroups'));
        setIsSubmitting(false);
        return;
      }

      // 2. Generate content key + safe-word
      const contentKey = generateContentKey();
      const newSafeWord = generateSafeWord();

      // 3. Build payload and encrypt
      const payload = JSON.stringify({
        message: message.trim(),
        contactInfo: contactInfo.trim(),
        safeWord: newSafeWord,
      });
      const { ciphertext, nonce } = encryptPayload(payload, contentKey);

      // 4. Wrap key for each group
      const invites = directoryEntries.map((entry) => ({
        groupId: entry.id,
        wrappedKey: encodeBase64(wrapKeyForGroup(contentKey, decodeBase64(entry.publicKey))),
      }));

      // 5. Submit to server
      const elapsed = Date.now() - mountTime.current;
      const response = await fetch(`${API_BASE}/api/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({
          ciphertextPayload: encodeBase64(ciphertext),
          nonce: encodeBase64(nonce),
          region: region.trim(),
          categories,
          invites,
          honeypot: '',
          elapsed,
        }),
      });

      if (!response.ok) {
        throw new Error(t('help:broadcast.errors.submitFailed'));
      }

      const result = await response.json();

      // 6. Show receipt
      setBroadcastId(result.broadcastId.slice(0, 8));
      setSafeWord(newSafeWord);
      setMode('receipt');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('help:broadcast.errors.submitFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySafeWord = async () => {
    try {
      await navigator.clipboard.writeText(safeWord);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: user can manually select/copy
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary-50/40 to-white">
      <PublicHeader />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <IconCircle icon={faShieldHalved} size="lg" color="primary" />
            </div>
            <h1 className="font-heading text-2xl font-bold text-gray-900 mb-2">
              {t('help:broadcast.title')}
            </h1>
            <p className="text-gray-600">{t('help:broadcast.description')}</p>
          </div>

          {/* Form mode */}
          {mode === 'form' && (
            <>
              {/* Privacy guarantees */}
              <ul className="space-y-2 mb-6">
                {[
                  t('help:broadcast.privacy1'),
                  t('help:broadcast.privacy2'),
                  t('help:broadcast.privacy3'),
                  t('help:broadcast.privacy4'),
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

              <p className="text-sm text-gray-500 mb-6">{t('help:sharedComputerWarning')}</p>

              {error && (
                <Alert type="error" className="mb-6">
                  {error}
                </Alert>
              )}

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
                    label={t('help:broadcast.regionLabel')}
                    value={region}
                    onChange={setRegion}
                    placeholder={t('help:create.regionPlaceholder')}
                    helperText={t('help:create.regionHelper')}
                    required
                  />

                  {/* Categories — multi-select checkboxes */}
                  <fieldset>
                    <legend className="block text-sm font-medium text-gray-700 mb-2">
                      {t('help:broadcast.categoriesLabel')} *
                    </legend>
                    <div className="grid grid-cols-2 gap-2">
                      {BROADCAST_CATEGORIES.map((cat) => (
                        <label
                          key={cat}
                          className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCategories.has(cat)}
                            onChange={() => toggleCategory(cat)}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">
                            {t(`help:broadcastCategories.${cat}`)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('help:broadcast.messageLabel')} *
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder={t('help:broadcast.messagePlaceholder')}
                      rows={4}
                      className="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
                      required
                    />
                  </div>

                  {/* Contact info */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('help:broadcast.contactLabel')} *
                    </label>
                    <input
                      type="text"
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      placeholder={t('help:broadcast.contactPlaceholder')}
                      className="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {t('help:broadcast.contactHelper')}
                    </p>
                  </div>

                  {/* Privacy warning */}
                  <p className="text-sm text-amber-700">{t('help:broadcast.privacyWarning')}</p>
                </div>

                <div className="mt-6">
                  <Button
                    type="submit"
                    disabled={
                      !region.trim() ||
                      selectedCategories.size === 0 ||
                      !message.trim() ||
                      !contactInfo.trim() ||
                      isSubmitting
                    }
                    isLoading={isSubmitting}
                    className="w-full"
                  >
                    {t('help:broadcast.submit')}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Receipt mode */}
          {mode === 'receipt' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  {t('help:broadcast.receipt.title')}
                </h2>
                <p className="text-gray-600">{t('help:broadcast.receipt.explanation')}</p>
              </div>

              {/* Safe-word display */}
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-3">
                  {t('help:broadcast.receipt.safeWordLabel')}
                </p>
                <p className="font-mono text-2xl font-bold text-gray-900 tracking-wide select-all">
                  {safeWord}
                </p>
                <button
                  type="button"
                  onClick={handleCopySafeWord}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
                  {copied ? t('help:broadcast.receipt.copied') : t('help:broadcast.receipt.copy')}
                </button>
              </div>

              {/* Broadcast ID */}
              <div className="text-center text-sm text-gray-500">
                <span>{t('help:broadcast.receipt.broadcastIdLabel')}: </span>
                <span className="font-mono">{broadcastId}</span>
              </div>

              {/* Done button */}
              <Button type="button" onClick={() => navigate('/')} className="w-full">
                {t('help:broadcast.receipt.done')}
              </Button>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
