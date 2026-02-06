import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts';
import { getFundingRequests } from '../api/requests';
import { Alert } from '../components/ui';
import type { FundingRequest, RequestStatus, AidCategory, Urgency } from '../api/types';

export function FundingRequestsListPage() {
  const { t } = useTranslation(['requests', 'common']);
  const { user } = useAuth();
  const [requests, setRequests] = useState<FundingRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | ''>('');
  const [categoryFilter, setCategoryFilter] = useState<AidCategory | ''>('');
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | ''>('');
  const [sortBy, setSortBy] = useState<string>('newest');

  const isHubAdmin = user?.role === 'hub_admin';

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await getFundingRequests({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        urgency: urgencyFilter || undefined,
        sortBy: sortBy as 'newest' | 'oldest' | 'amount_high' | 'amount_low' | 'urgent',
      });
      setRequests(result.requests);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('requests:errors.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter, urgencyFilter, sortBy, t]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const getStatusBadgeClass = (status: RequestStatus) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      case 'funds_sent':
        return 'bg-primary-100 text-primary-800';
      case 'acknowledged':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('requests:title')}</h1>
          <p className="text-gray-600">{total} request(s)</p>
        </div>
        {!isHubAdmin && (
          <Link
            to="/requests/new"
            className="inline-flex items-center justify-center px-4 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors min-h-[44px]"
          >
            {t('requests:newRequest')}
          </Link>
        )}
      </div>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RequestStatus | '')}
            className="px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('requests:filters.allStatuses')}</option>
            <option value="submitted">{t('requests:status.submitted')}</option>
            <option value="approved">{t('requests:status.approved')}</option>
            <option value="declined">{t('requests:status.declined')}</option>
            <option value="funds_sent">{t('requests:status.fundsSent')}</option>
            <option value="acknowledged">{t('requests:status.acknowledged')}</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as AidCategory | '')}
            className="px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('requests:filters.allCategories')}</option>
            <option value="rent">{t('common:aidCategories.rent')}</option>
            <option value="food">{t('common:aidCategories.food')}</option>
            <option value="utilities">{t('common:aidCategories.utilities')}</option>
            <option value="other">{t('common:aidCategories.other')}</option>
          </select>
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value as Urgency | '')}
            className="px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t('requests:filters.allUrgencies')}</option>
            <option value="normal">{t('requests:form.urgencyNormal')}</option>
            <option value="urgent">{t('requests:form.urgencyUrgent')}</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="newest">{t('requests:filters.sortNewest')}</option>
            <option value="oldest">{t('requests:filters.sortOldest')}</option>
            <option value="amount_high">{t('requests:filters.sortAmountHigh')}</option>
            <option value="amount_low">{t('requests:filters.sortAmountLow')}</option>
            <option value="urgent">{t('requests:filters.sortUrgent')}</option>
          </select>
        </div>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <p className="text-gray-600">{t('requests:noRequests')}</p>
          {!isHubAdmin && (
            <p className="text-gray-500 mt-2">{t('requests:noRequestsDescription')}</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Link
              key={request.id}
              to={`/requests/${request.id}`}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:border-primary-300 hover:shadow transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-semibold text-gray-900">
                      {formatAmount(request.amount)}
                    </span>
                    {request.urgency === 'urgent' && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                        {t('requests:form.urgencyUrgent')}
                      </span>
                    )}
                  </div>
                  {isHubAdmin && <p className="text-gray-700 font-medium">{request.groupName}</p>}
                  <p className="text-gray-600">
                    {t(`common:aidCategories.${request.category}`)} • {request.region}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(request.status)}`}
                >
                  {t(
                    `requests:status.${request.status === 'funds_sent' ? 'fundsSent' : request.status}`
                  )}
                </span>
              </div>
              {request.clarificationRequest && request.status === 'submitted' && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  {t('requests:clarify.pending')}
                </div>
              )}
              <div className="mt-3 text-sm text-gray-500">
                {new Date(request.submittedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
