import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faKey } from '@fortawesome/free-solid-svg-icons';
import { Alert, Button, Input } from '../ui';
import { getMyGroup, setBroadcastKey } from '../../api/groups';
import {
  MIN_PASSPHRASE_LENGTH,
  deriveGroupKeypair,
  encodeKey,
  generateKeySalt,
} from '../../utils/group-key';

/**
 * Where a group gets the key that lets it receive anonymous help requests.
 *
 * Before this there was nowhere. Nothing in the product generated a group
 * keypair or stored one, no endpoint wrote groups.public_key, and the invite
 * screen asked coordinators to paste a base64 private key they had never been
 * given. Every group's public key was null, which excluded it from the broadcast
 * directory, which meant no invite was ever created for anyone - a person in
 * crisis could send an encrypted request and no group could ever open it.
 *
 * The passphrase is stretched in the browser and only the public half is
 * uploaded, so setting a key here does not give Relay the ability to read
 * anything.
 */
export function BroadcastKeySection() {
  const { t } = useTranslation('common');

  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getMyGroup()
      .then(({ group }) => setHasKey(Boolean(group.broadcastPublicKey)))
      .catch(() => setHasKey(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
      setError(t('broadcastKey.tooShort', { count: MIN_PASSPHRASE_LENGTH }));
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError(t('broadcastKey.mismatch'));
      return;
    }

    setIsSaving(true);
    try {
      // A new salt every time, including when replacing an existing passphrase.
      // Reusing the old one would let anyone who had captured the previous
      // public key check whether the new passphrase is the same as the old.
      const salt = generateKeySalt();
      const keypair = await deriveGroupKeypair(passphrase, salt);

      const { invitesDiscarded } = await setBroadcastKey({
        publicKey: encodeKey(keypair.publicKey),
        keySalt: encodeKey(salt),
      });

      setPassphrase('');
      setConfirmPassphrase('');
      setHasKey(true);
      setSuccess(
        invitesDiscarded > 0
          ? t('broadcastKey.savedWithDiscards', { count: invitesDiscarded })
          : t('broadcastKey.saved')
      );
    } catch {
      setError(t('broadcastKey.failed'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center gap-3 mb-2">
        <FontAwesomeIcon icon={faKey} className="text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900">{t('broadcastKey.title')}</h2>
      </div>

      <p className="text-sm text-gray-600 mb-4">{t('broadcastKey.description')}</p>

      {hasKey === false && (
        <Alert type="warning" className="mb-4">
          {t('broadcastKey.notSetWarning')}
        </Alert>
      )}

      {hasKey === true && (
        <Alert type="info" className="mb-4">
          {t('broadcastKey.replaceWarning')}
        </Alert>
      )}

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}
      {success && (
        <Alert type="success" className="mb-4">
          {success}
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <Input
          type="password"
          name="passphrase"
          label={t('broadcastKey.passphraseLabel')}
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          autoComplete="new-password"
          helperText={t('broadcastKey.passphraseHelp', { count: MIN_PASSPHRASE_LENGTH })}
          required
        />
        <Input
          type="password"
          name="confirmPassphrase"
          label={t('broadcastKey.confirmLabel')}
          value={confirmPassphrase}
          onChange={(e) => setConfirmPassphrase(e.target.value)}
          autoComplete="new-password"
          required
        />
        <Button type="submit" isLoading={isSaving}>
          {hasKey ? t('broadcastKey.replaceSubmit') : t('broadcastKey.submit')}
        </Button>
        {isSaving && <p className="text-xs text-gray-500">{t('broadcastKey.deriving')}</p>}
      </form>

      <p className="text-xs text-gray-500 mt-4 max-w-md">{t('broadcastKey.recoveryNote')}</p>
    </section>
  );
}
