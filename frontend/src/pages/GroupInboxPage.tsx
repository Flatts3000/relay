import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { Alert, Button, IconCircle, Input } from '../components/ui';
import { fetchInvites } from '../api/invites';
import { useGroupKey } from '../contexts';
import { unwrapKey, decodeBase64 } from '../utils/broadcast-crypto';
import type { Invite } from '../api/types';

/**
 * Group coordinator inbox — lists pending encrypted help request invites.
 * Protected route: group_coordinator only.
 */
export function GroupInboxPage() {
  const { t } = useTranslation(['help', 'common']);
  const { secretKey, isUnlocked, isUnlocking, unlock } = useGroupKey();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [unlockError, setUnlockError] = useState('');

  /**
   * Fetch, then keep only what this group can actually open.
   *
   * Broadcasts are padded with decoy invites addressed to real groups that did
   * not match, so the row count does not reveal how many groups did. Nothing
   * distinguishes a decoy server-side - by design, since anything that did would
   * equally serve someone reading the database - so the filtering has to happen
   * here, by trying to unwrap each key and discarding what fails.
   *
   * That is why this page needs the group key before it can show anything.
   */
  const loadInvites = useCallback(async () => {
    if (!secretKey) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchInvites();
      setInvites(
        data.filter((invite) => {
          try {
            return unwrapKey(decodeBase64(invite.wrappedKey), secretKey) !== null;
          } catch {
            // A malformed key is a decoy as far as this group is concerned.
            return false;
          }
        })
      );
    } catch {
      setError(t('help:errors.loadRequestsFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [secretKey, t]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError('');
    const result = await unlock(passphrase);
    if (result.ok) {
      setPassphrase('');
      return;
    }
    setUnlockError(
      result.reason === 'no-key'
        ? t('help:inbox.unlock.noKey')
        : result.reason === 'wrong-passphrase'
          ? t('help:inbox.unlock.wrongPassphrase')
          : t('help:inbox.unlock.error')
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <IconCircle icon={faEnvelope} size="sm" color="primary" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('help:inbox.title')}</h1>
          <p className="text-sm text-gray-600">{t('help:inbox.description')}</p>
        </div>
      </div>

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      {!isUnlocked ? (
        <form
          onSubmit={handleUnlock}
          className="bg-white border border-gray-200 rounded-lg p-6 max-w-md space-y-4"
        >
          <p className="text-sm text-gray-600">{t('help:inbox.unlockToView')}</p>
          {unlockError && <Alert type="error">{unlockError}</Alert>}
          <Input
            type="password"
            name="passphrase"
            label={t('help:inbox.unlock.placeholder')}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoComplete="current-password"
            required
          />
          <Button
            type="submit"
            disabled={!passphrase.trim() || isUnlocking}
            isLoading={isUnlocking}
          >
            {t('help:inbox.unlock.unlockSubmit')}
          </Button>
          {isUnlocking && (
            <p className="text-xs text-gray-500">{t('help:inbox.unlock.deriving')}</p>
          )}
        </form>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : invites.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 font-medium">{t('help:inbox.noInvites')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('help:inbox.noInvitesDescription')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
            <Link
              key={invite.inviteId}
              to={`/inbox/${invite.inviteId}`}
              className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {invite.categories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700"
                      >
                        {t(`help:broadcastCategories.${cat}`)}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{invite.region}</span>
                    <span>{formatDate(invite.createdAt)}</span>
                  </div>
                </div>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className="text-gray-400 ml-4 flex-shrink-0"
                />
              </div>
            </Link>
          ))}
        </div>
      )}

      {isUnlocked && (
        <div className="mt-6">
          <Button variant="secondary" onClick={loadInvites} disabled={isLoading}>
            {t('help:view.refresh')}
          </Button>
        </div>
      )}
    </div>
  );
}
