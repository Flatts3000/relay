import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getHelpRequests, getMailboxPublicKey, sendReply } from '../api/help-requests';
import { Alert, Button } from '../components/ui';
import { generateEphemeralKeyPair, encryptMessage } from '../utils/crypto';
import type { HelpRequest } from '../api/types';

/**
 * Help request detail page for group coordinators.
 * Allows sending encrypted replies to anonymous mailboxes.
 */
export function HelpRequestDetailPage() {
  const { t } = useTranslation(['help', 'common']);
  const { mailboxId } = useParams<{ mailboxId: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<HelpRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadRequest = useCallback(async () => {
    if (!mailboxId) return;

    setIsLoading(true);
    setError('');

    try {
      // Load all requests and find the one we need
      const result = await getHelpRequests();
      const found = result.requests.find((r) => r.mailboxId === mailboxId);

      if (!found) {
        setError(t('help:detail.notFound'));
      } else {
        setRequest(found);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('help:errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [mailboxId, t]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!mailboxId || !replyMessage.trim()) return;

    setIsSending(true);
    setError('');
    setSuccessMessage('');

    try {
      // Get the recipient's public key
      const { publicKey: recipientPublicKey } = await getMailboxPublicKey(mailboxId);

      // Generate ephemeral key pair for this reply
      const ephemeralKeyPair = generateEphemeralKeyPair();

      // Encrypt the message
      const encrypted = encryptMessage(
        replyMessage.trim(),
        recipientPublicKey,
        ephemeralKeyPair.secretKey
      );

      // Prepend our ephemeral public key so the recipient can decrypt
      // Format: [ephemeral_pubkey(32 bytes)][nonce+ciphertext]
      const ephemeralPubKeyBytes = Uint8Array.from(atob(ephemeralKeyPair.publicKey), (c) =>
        c.charCodeAt(0)
      );
      const ciphertextBytes = Uint8Array.from(atob(encrypted.ciphertext), (c) => c.charCodeAt(0));

      const fullCiphertext = new Uint8Array(ephemeralPubKeyBytes.length + ciphertextBytes.length);
      fullCiphertext.set(ephemeralPubKeyBytes);
      fullCiphertext.set(ciphertextBytes, ephemeralPubKeyBytes.length);

      const fullCiphertextBase64 = btoa(String.fromCharCode(...fullCiphertext));

      // Send the reply
      await sendReply(mailboxId, { ciphertext: fullCiphertextBase64 });

      setSuccessMessage(t('help:detail.replySent'));
      setReplyMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('help:errors.sendFailed'));
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert type="error">{error || t('help:detail.notFound')}</Alert>
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          onClick={() => navigate('/help-requests')}
        >
          {t('help:detail.backToList')}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/help-requests')}
        className="text-primary-600 hover:text-primary-800 mb-4 flex items-center gap-1"
      >
        ← {t('help:detail.backToList')}
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('help:detail.title')}</h1>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert type="success" className="mb-6">
          {successMessage}
        </Alert>
      )}

      {/* Request info */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              {t('help:detail.category')}
            </label>
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
              {t(`common:aidCategories.${request.helpCategory}`)}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              {t('help:detail.region')}
            </label>
            <p className="text-gray-900">{request.region}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              {t('help:detail.createdAt')}
            </label>
            <p className="text-gray-900">
              {new Date(request.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Reply form */}
      <form onSubmit={handleSendReply}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">{t('help:detail.sendReply')}</h2>

          {/* Privacy notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-700">{t('help:detail.encryptionNotice')}</p>
          </div>

          <textarea
            value={replyMessage}
            onChange={(e) => setReplyMessage(e.target.value)}
            placeholder={t('help:detail.replyPlaceholder')}
            className="w-full px-4 py-3 min-h-[150px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            maxLength={2000}
            required
          />
          <p className="text-sm text-gray-500 mt-1">{t('help:detail.replyHelper')}</p>

          {/* Warning about content */}
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">{t('help:detail.replyWarning')}</p>
          </div>

          <div className="mt-4">
            <Button
              type="submit"
              disabled={!replyMessage.trim() || isSending}
              isLoading={isSending}
            >
              {t('help:detail.send')}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
