import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { Alert, Button, IconCircle } from '../components/ui';
import { fetchInvites } from '../api/invites';
import type { Invite } from '../api/types';

/**
 * Group coordinator inbox — lists pending encrypted help request invites.
 * Protected route: group_coordinator only.
 */
export function GroupInboxPage() {
  const { t } = useTranslation(['help', 'common']);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInvites = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchInvites();
      setInvites(data);
    } catch {
      setError(t('help:errors.loadRequestsFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

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

      {isLoading ? (
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

      <div className="mt-6">
        <Button variant="secondary" onClick={loadInvites} disabled={isLoading}>
          {t('help:view.refresh')}
        </Button>
      </div>
    </div>
  );
}
