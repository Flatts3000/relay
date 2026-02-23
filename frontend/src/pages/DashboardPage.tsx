import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts';
import { getDashboardSummary } from '../api/dashboard';
import { Alert } from '../components/ui';
import type { DashboardSummary } from '../api/types';

export function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Hub admins go straight to groups list
  if (user.role === 'hub_admin') {
    return <Navigate to="/groups" replace />;
  }

  if (user.role === 'group_coordinator') {
    return <GroupCoordinatorDashboard />;
  }

  // Fallback
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-gray-900">Welcome to Relay</h1>
      <p className="mt-2 text-gray-600">
        Your account is set up but doesn't have an assigned role.
      </p>
    </div>
  );
}

const linkButtonPrimary =
  'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 px-4 py-3 text-base min-h-[44px] bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500';
const linkButtonSecondary =
  'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 px-4 py-3 text-base min-h-[44px] bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500';

function GroupCoordinatorDashboard() {
  const { t } = useTranslation('common');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError('');
      try {
        const data = await getDashboardSummary();
        setSummary(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('somethingWentWrong'));
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [t]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert type="error" className="mb-6">
        {error}
      </Alert>
    );
  }

  if (!summary) return null;

  const verificationStatus = summary.group.verificationStatus;
  const bannerType =
    verificationStatus === 'verified'
      ? 'success'
      : verificationStatus === 'revoked'
        ? 'error'
        : 'warning';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-600">{t('dashboard.welcome', { name: summary.group.name })}</p>
      </div>

      {/* Verification status banner */}
      <Alert type={bannerType as 'success' | 'error' | 'warning'} className="mb-6">
        {t(`dashboard.verificationBanner.${verificationStatus}`)}
      </Alert>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Link
          to="/inbox"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <p className="text-sm font-medium text-gray-500">{t('dashboard.cards.pendingInvites')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary.pendingInvites}</p>
        </Link>

        <Link
          to="/requests"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <p className="text-sm font-medium text-gray-500">
            {t('dashboard.cards.fundingSubmitted')}
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {summary.fundingRequests.submitted}
          </p>
        </Link>

        <Link
          to="/requests"
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <p className="text-sm font-medium text-gray-500">
            {t('dashboard.cards.fundingApproved')}
          </p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {summary.fundingRequests.approved}
          </p>
        </Link>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/inbox" className={linkButtonPrimary}>
          {t('dashboard.actions.viewInbox')}
        </Link>
        <Link to="/requests/new" className={linkButtonSecondary}>
          {t('dashboard.actions.newRequest')}
        </Link>
        <Link to="/profile" className={linkButtonSecondary}>
          {t('dashboard.actions.viewProfile')}
        </Link>
      </div>
    </div>
  );
}
