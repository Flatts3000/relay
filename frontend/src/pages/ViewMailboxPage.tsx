import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { getMailbox, deleteMailbox } from '../api/mailbox';
import { Alert, Button, IconCircle } from '../components/ui';
import { PublicHeader, PublicFooter } from '../components/layout';
import { loadMailboxFromStorage, clearMailboxFromStorage, decryptMessage } from '../utils/crypto';
import type { Mailbox, MailboxMessage } from '../api/types';

interface DecryptedMessage {
  id: string;
  groupId: string;
  groupName: string;
  plaintext: string;
  createdAt: string;
  decryptionFailed: boolean;
}

/**
 * Anonymous mailbox view page.
 * CRITICAL: No authentication, no tracking, no cookies.
 * Individuals can view and decrypt messages from local groups.
 */
export function ViewMailboxPage() {
  const { t } = useTranslation(['help', 'common']);
  const { id: mailboxId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [mailbox, setMailbox] = useState<Mailbox | null>(null);
  const [messages, setMessages] = useState<DecryptedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hasLocalKeys, setHasLocalKeys] = useState(false);

  const loadMailbox = useCallback(async () => {
    if (!mailboxId) return;

    setIsLoading(true);
    setError('');

    try {
      const data = await getMailbox(mailboxId);
      setMailbox(data);

      // Check if we have local keys for decryption
      const stored = loadMailboxFromStorage();
      const canDecrypt = stored?.id === mailboxId && stored?.keyPair;
      setHasLocalKeys(!!canDecrypt);

      // Decrypt messages if we have the private key
      if (canDecrypt && data.messages.length > 0) {
        const decrypted = data.messages.map((msg) => {
          const plaintext = tryDecryptMessage(msg, stored.keyPair.secretKey);

          return {
            id: msg.id,
            groupId: msg.groupId,
            groupName: msg.groupName,
            plaintext: plaintext || t('help:view.decryptionFailed'),
            createdAt: msg.createdAt,
            decryptionFailed: !plaintext,
          };
        });
        setMessages(decrypted);
      } else {
        // Can't decrypt - show encrypted messages
        setMessages(
          data.messages.map((msg) => ({
            id: msg.id,
            groupId: msg.groupId,
            groupName: msg.groupName,
            plaintext: canDecrypt ? t('help:view.decryptionFailed') : t('help:view.noKeys'),
            createdAt: msg.createdAt,
            decryptionFailed: true,
          }))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('help:errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [mailboxId, t]);

  useEffect(() => {
    loadMailbox();
  }, [loadMailbox]);

  const handleDelete = async () => {
    if (!mailboxId) return;

    setIsDeleting(true);
    setError('');

    try {
      await deleteMailbox(mailboxId);
      clearMailboxFromStorage();
      navigate('/help', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('help:errors.deleteFailed'));
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary-50/40 to-white">
        <PublicHeader />
        <main className="flex-1 flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </main>
        <PublicFooter />
      </div>
    );
  }

  if (!mailbox) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary-50/40 to-white">
        <PublicHeader />
        <main className="flex-1 py-12 px-4">
          <div className="max-w-lg mx-auto">
            <Alert type="error">{error || t('help:view.notFound')}</Alert>
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              onClick={() => navigate('/help')}
            >
              {t('help:view.backToHelp')}
            </Button>
          </div>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary-50/40 to-white">
      <PublicHeader />

      <main className="flex-1 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex items-start gap-4">
              <IconCircle icon={faEnvelope} size="md" color="primary" />
              <div>
                <h1 className="font-heading text-2xl font-bold text-gray-900">
                  {t('help:view.title')}
                </h1>
                <p className="text-gray-600">
                  {t(`common:aidCategories.${mailbox.helpCategory}`)} &middot; {mailbox.region}
                </p>
              </div>
            </div>
            <Button type="button" variant="secondary" onClick={loadMailbox}>
              {t('help:view.refresh')}
            </Button>
          </div>

          {error && (
            <Alert type="error" className="mb-6">
              {error}
            </Alert>
          )}

          {!hasLocalKeys && (
            <Alert type="warning" className="mb-6">
              {t('help:view.noLocalKeys')}
            </Alert>
          )}

          {/* Messages */}
          <div className="space-y-4 mb-8">
            {messages.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <p className="text-gray-600">{t('help:view.noMessages')}</p>
                <p className="text-sm text-gray-500 mt-2">{t('help:view.noMessagesDescription')}</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="bg-gray-50 rounded-lg p-6">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-medium text-gray-900">{msg.groupName}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(msg.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {msg.decryptionFailed ? (
                    <p className="text-gray-500 italic">{msg.plaintext}</p>
                  ) : (
                    <p className="text-gray-800 whitespace-pre-wrap">{msg.plaintext}</p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Mailbox info */}
          <div className="border-t border-gray-200 pt-6 mb-6">
            <p className="text-sm text-gray-600">
              {t('help:view.createdAt', {
                date: new Date(mailbox.createdAt).toLocaleDateString(),
              })}
            </p>
            <p className="text-xs text-gray-500 mt-1 font-mono">
              {t('help:view.mailboxId')}: {mailbox.id}
            </p>
          </div>

          {/* Delete section */}
          <div className="border-t border-gray-200 pt-6">
            {!showDeleteConfirm ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700"
              >
                {t('help:view.deleteMailbox')}
              </Button>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-red-700">{t('help:view.deleteWarning')}</p>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    {t('common:cancel')}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    isLoading={isDeleting}
                  >
                    {t('help:view.confirmDelete')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

/**
 * Attempt to decrypt a message.
 * For NaCl box, we need the sender's ephemeral public key.
 * This is a simplified implementation that expects the sender's public key
 * to be prepended to the ciphertext.
 */
function tryDecryptMessage(msg: MailboxMessage, recipientSecretKey: string): string | null {
  try {
    // The ciphertext format should be: [sender_pubkey(32)][nonce(24)][encrypted]
    // First 32 bytes = sender's ephemeral public key
    const fullData = Uint8Array.from(atob(msg.ciphertext), (c) => c.charCodeAt(0));

    if (fullData.length < 32 + 24 + 16) {
      return null;
    }

    const senderPubKey = btoa(String.fromCharCode(...fullData.slice(0, 32)));
    const ciphertextWithNonce = btoa(String.fromCharCode(...fullData.slice(32)));

    // Use the imported decryptMessage function
    return decryptMessage(ciphertextWithNonce, senderPubKey, recipientSecretKey);
  } catch {
    return null;
  }
}
