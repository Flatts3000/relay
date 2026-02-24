import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  faBuilding,
  faUserGroup,
  faUsers,
  faShieldHalved,
  faDollarSign,
  faMoneyBillWave,
} from '@fortawesome/free-solid-svg-icons';
import { getAdminOverview } from '../../api/admin';
import { Alert, StatCard, Skeleton } from '../../components/ui';
import type { AdminOverview } from '../../api/types';

export function AdminOverviewPage() {
  const { t } = useTranslation('admin');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setOverview(await getAdminOverview());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load overview');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (error) return <Alert type="error">{error}</Alert>;

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('overview.title')}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))}
        </div>
      </div>
    );
  }

  if (!overview) return null;

  const hasPending = overview.pendingVerifications > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('overview.title')}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label={t('overview.totalHubs')}
          value={overview.totalHubs}
          icon={faBuilding}
          iconColor="primary"
          href="/admin/hubs"
        />
        <StatCard
          label={t('overview.totalGroups')}
          value={overview.totalGroups}
          icon={faUserGroup}
          iconColor="green"
          href="/admin/groups"
        />
        <StatCard
          label={t('overview.totalUsers')}
          value={overview.totalUsers}
          icon={faUsers}
          iconColor="gray"
          href="/admin/users"
        />
        <StatCard
          label={t('overview.pendingVerifications')}
          value={overview.pendingVerifications}
          icon={faShieldHalved}
          iconColor={hasPending ? 'amber' : 'gray'}
          href="/admin/verification"
          className={hasPending ? 'ring-2 ring-amber-300' : ''}
        />
        <StatCard
          label={t('overview.totalFundingRequests')}
          value={overview.totalFundingRequests}
          icon={faDollarSign}
          iconColor="primary"
          href="/admin/funding"
        />
        <StatCard
          label={t('overview.totalFundsApproved')}
          value={`$${Number(overview.totalFundsApproved).toLocaleString()}`}
          icon={faMoneyBillWave}
          iconColor="green"
          href="/admin/funding"
        />
      </div>

      {hasPending && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('overview.quickActions')}</h2>
          <Link
            to="/admin/verification?status=pending"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors"
          >
            {t('overview.reviewPending', { count: overview.pendingVerifications })}
          </Link>
        </div>
      )}
    </div>
  );
}
