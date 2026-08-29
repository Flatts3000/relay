import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts';
import { getDashboardSummary } from '../api/dashboard';
import { getSummaryReport } from '../api/reports';
import { getVerificationRequests } from '../api/verification';
import { getFundingRequests } from '../api/requests';
import { Alert } from '../components/ui';
import type { DashboardSummary, SummaryReport } from '../api/types';

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

  // Staff admins go to admin dashboard
  if (user.role === 'staff_admin') {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === 'hub_admin') {
    return <HubAdminDashboard />;
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

/**
 * A hub admin's landing page.
 *
 * They used to be redirected straight to /groups - a roster - even though their
 * job is reviewing and routing money. The two things actually waiting on them,
 * pending verifications and submitted funding requests, were each two unlinked
 * URLs away, and nothing anywhere said how many there were.
 *
 * Built from endpoints that already existed; it adds no new API surface.
 */
function HubAdminDashboard() {
  const { t } = useTranslation('common');
  const [pendingVerifications, setPendingVerifications] = useState<number | null>(null);
  const [awaiting, setAwaiting] = useState<{ count: number; amount: number } | null>(null);
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Settled individually: a hub with no reports data should still be told
      // how many groups are waiting on verification.
      const [verifications, requests, report] = await Promise.allSettled([
        getVerificationRequests({ status: 'pending' }),
        getFundingRequests({ status: 'submitted' }),
        getSummaryReport(),
      ]);

      if (verifications.status === 'fulfilled') {
        setPendingVerifications(verifications.value.requests.length);
      }
      if (requests.status === 'fulfilled') {
        setAwaiting({
          count: requests.value.requests.length,
          amount: requests.value.requests.reduce((total, r) => total + parseFloat(r.amount), 0),
        });
      }
      if (report.status === 'fulfilled') {
        setSummary(report.value);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  const money = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const needsAttention = (pendingVerifications ?? 0) > 0 || (awaiting?.count ?? 0) > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{t('hubDashboard.title')}</h1>
      <p className="text-gray-600 mb-6">{t('hubDashboard.subtitle')}</p>

      {/* What is waiting on this person, first and largest. Everything else on
          the page is a record of work already done. */}
      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <Link
          to="/requests"
          className={`block rounded-lg border p-5 transition-colors ${
            (awaiting?.count ?? 0) > 0
              ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="text-sm font-medium text-gray-600">{t('hubDashboard.awaitingDecision')}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{awaiting?.count ?? 0}</p>
          <p className="text-sm text-gray-600 mt-1">
            {money(awaiting?.amount ?? 0)} {t('hubDashboard.requested')}
          </p>
        </Link>

        <Link
          to="/verification"
          className={`block rounded-lg border p-5 transition-colors ${
            (pendingVerifications ?? 0) > 0
              ? 'bg-amber-50 border-amber-200 hover:border-amber-300'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="text-sm font-medium text-gray-600">
            {t('hubDashboard.pendingVerifications')}
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{pendingVerifications ?? 0}</p>
          <p className="text-sm text-gray-600 mt-1">{t('hubDashboard.groupsWaiting')}</p>
        </Link>
      </div>

      {!needsAttention && (
        <Alert type="success" className="mb-8">
          {t('hubDashboard.allClear')}
        </Alert>
      )}

      {summary && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
            {t('hubDashboard.activity')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm text-gray-500">{t('hubDashboard.totalMoved')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {money(parseFloat(summary.totals.totalAmount))}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm text-gray-500">{t('hubDashboard.approved')}</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totals.approvedRequests}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <p className="text-sm text-gray-500">{t('hubDashboard.totalRequests')}</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totals.totalRequests}</p>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Link to="/groups" className={linkButtonSecondary}>
          {t('navigation.groups')}
        </Link>
        <Link to="/reports" className={linkButtonSecondary}>
          {t('navigation.reports')}
        </Link>
      </div>
    </div>
  );
}

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
