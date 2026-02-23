import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faClock } from '@fortawesome/free-solid-svg-icons';
import { Alert, Button } from '../components/ui';
import { fetchInvites, fetchCiphertext, markDecrypted, deleteInvite } from '../api/invites';
import { unwrapKey, decryptPayload, decodeBase64 } from '../utils/broadcast-crypto';
import type { Invite } from '../api/types';

const AUTO_DELETE_MS = 10 * 60 * 1000; // 10 minutes

interface DecryptedContent {
  message: string;
  contactInfo: string;
  safeWord: string;
}

/**
 * Invite detail page — decrypt and view a single help request.
 * Protected route: group_coordinator only.
 */
export function InviteDetailPage() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['help', 'common']);

  const [invite, setInvite] = useState<Invite | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Decryption state
  const [secretKeyInput, setSecretKeyInput] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptError, setDecryptError] = useState('');
  const [decryptedContent, setDecryptedContent] = useState<DecryptedContent | null>(null);

  // Countdown state
  const [remainingMs, setRemainingMs] = useState(AUTO_DELETE_MS);
  const decryptedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadInvite = useCallback(async () => {
    if (!inviteId) return;
    setIsLoading(true);
    setError('');
    try {
      const invites = await fetchInvites();
      const found = invites.find((i) => i.inviteId === inviteId);
      if (!found) {
        setError(t('help:inbox.decrypted.decryptionFailed'));
        setIsLoading(false);
        return;
      }
      setInvite(found);
    } catch {
      setError(t('help:errors.loadRequestsFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [inviteId, t]);

  useEffect(() => {
    loadInvite();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadInvite]);

  const handleAutoDelete = useCallback(async () => {
    if (!inviteId) return;
    try {
      await deleteInvite(inviteId);
    } catch {
      // Best effort — server lifecycle will clean up anyway
    }
    navigate('/inbox');
  }, [inviteId, navigate]);

  const startCountdown = useCallback(() => {
    decryptedAtRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - decryptedAtRef.current!;
      const remaining = AUTO_DELETE_MS - elapsed;
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleAutoDelete();
      } else {
        setRemainingMs(remaining);
      }
    }, 1000);
  }, [handleAutoDelete]);

  const handleDecrypt = async () => {
    if (!invite || !inviteId) return;

    setIsDecrypting(true);
    setDecryptError('');

    try {
      // 1. Fetch ciphertext
      const { ciphertextPayload, nonce } = await fetchCiphertext(inviteId);

      // 2. Unwrap the content key using group's secret key
      const groupSecretKey = decodeBase64(secretKeyInput.trim());
      const wrappedKey = decodeBase64(invite.wrappedKey);
      const contentKey = unwrapKey(wrappedKey, groupSecretKey);

      if (!contentKey) {
        setDecryptError(t('help:inbox.unlock.error'));
        setIsDecrypting(false);
        return;
      }

      // 3. Decrypt the payload
      const plaintext = decryptPayload(
        decodeBase64(ciphertextPayload),
        decodeBase64(nonce),
        contentKey
      );

      if (!plaintext) {
        setDecryptError(t('help:inbox.unlock.error'));
        setIsDecrypting(false);
        return;
      }

      // 4. Parse and display
      const parsed = JSON.parse(plaintext) as DecryptedContent;
      setDecryptedContent(parsed);

      // 5. Mark as decrypted on server
      await markDecrypted(inviteId);

      // 6. Start 10-minute countdown
      startCountdown();
    } catch {
      setDecryptError(t('help:inbox.unlock.error'));
    } finally {
      setIsDecrypting(false);
    }
  };

  const handleSaved = async () => {
    if (!inviteId) return;
    try {
      await deleteInvite(inviteId);
    } catch {
      // Best effort
    }
    navigate('/inbox');
  };

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div>
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
        <Button variant="secondary" onClick={() => navigate('/inbox')}>
          {t('help:detail.backToList')}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Button variant="secondary" onClick={() => navigate('/inbox')} className="mb-6">
        {t('help:detail.backToList')}
      </Button>

      {/* Not yet decrypted — show unlock form */}
      {!decryptedContent && invite && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <FontAwesomeIcon icon={faLock} className="text-primary-500" />
            <h2 className="text-lg font-bold text-gray-900">{t('help:inbox.unlock.title')}</h2>
          </div>

          {/* Routing metadata */}
          <div className="mb-4 text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-medium">{t('help:inbox.region')}:</span> {invite.region}
            </p>
            <p>
              <span className="font-medium">{t('help:inbox.categories')}:</span>{' '}
              {invite.categories.map((c) => t(`help:broadcastCategories.${c}`)).join(', ')}
            </p>
          </div>

          <p className="text-sm text-gray-600 mb-4">{t('help:inbox.unlock.description')}</p>

          {decryptError && (
            <Alert type="error" className="mb-4">
              {decryptError}
            </Alert>
          )}

          <div className="space-y-4">
            <input
              type="password"
              value={secretKeyInput}
              onChange={(e) => setSecretKeyInput(e.target.value)}
              placeholder={t('help:inbox.unlock.placeholder')}
              className="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              autoComplete="off"
            />
            <Button
              onClick={handleDecrypt}
              disabled={!secretKeyInput.trim() || isDecrypting}
              isLoading={isDecrypting}
              className="w-full"
            >
              {t('help:inbox.unlock.submit')}
            </Button>
          </div>
        </div>
      )}

      {/* Decrypted content */}
      {decryptedContent && (
        <div className="space-y-4">
          {/* Countdown timer */}
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <FontAwesomeIcon icon={faClock} className="text-amber-500" />
            <span className="text-sm font-medium text-amber-800">
              {t('help:inbox.decrypted.countdown', { time: formatCountdown(remainingMs) })}
            </span>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
            <h2 className="text-lg font-bold text-gray-900">{t('help:inbox.decrypted.title')}</h2>

            {/* Message */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                {t('help:inbox.decrypted.message')}
              </h3>
              <p className="text-gray-900 whitespace-pre-wrap">{decryptedContent.message}</p>
            </div>

            {/* Contact info */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                {t('help:inbox.decrypted.contactInfo')}
              </h3>
              <p className="text-gray-900 font-medium">{decryptedContent.contactInfo}</p>
            </div>

            {/* Safe-word */}
            <div className="bg-primary-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-primary-700 mb-1">
                {t('help:inbox.decrypted.safeWord')}
              </h3>
              <p className="font-mono text-xl font-bold text-primary-900">
                {decryptedContent.safeWord}
              </p>
              <p className="text-xs text-primary-600 mt-2">
                {t('help:inbox.decrypted.safeWordExplanation')}
              </p>
            </div>
          </div>

          {/* Confirm saved button */}
          <Button onClick={handleSaved} className="w-full">
            {t('help:inbox.decrypted.saved')}
          </Button>
        </div>
      )}
    </div>
  );
}
