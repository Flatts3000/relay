import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getSummaryReport,
  getGroupsReport,
  getTimingReport,
  exportReportCSV,
  downloadBlob,
} from '../api/reports';
import { Alert, Button } from '../components/ui';
import type { SummaryReport, GroupsReport, TimingReport, DateRangeQuery } from '../api/types';

/**
 * Reports dashboard for hub admins.
 * Displays aggregate metrics only - no individual request details.
 */
export function ReportsDashboardPage() {
  const { t } = useTranslation(['reports', 'common']);

  const [summaryReport, setSummaryReport] = useState<SummaryReport | null>(null);
  const [groupsReport, setGroupsReport] = useState<GroupsReport | null>(null);
  const [timingReport, setTimingReport] = useState<TimingReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Date range filter
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadReports = useCallback(async () => {
    setIsLoading(true);
    setError('');

    const query: DateRangeQuery = {};
    if (startDate) query.startDate = startDate;
    if (endDate) query.endDate = endDate;

    try {
      const [summary, groups, timing] = await Promise.all([
        getSummaryReport(query),
        getGroupsReport(query),
        getTimingReport(query),
      ]);

      setSummaryReport(summary);
      setGroupsReport(groups);
      setTimingReport(timing);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reports:errors.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, t]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleExport = async () => {
    setIsExporting(true);
    setError('');

    try {
      const query: DateRangeQuery = {};
      if (startDate) query.startDate = startDate;
      if (endDate) query.endDate = endDate;

      const blob = await exportReportCSV(query);
      const filename = `relay-report-${new Date().toISOString().split('T')[0]}.csv`;
      downloadBlob(blob, filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('reports:errors.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const formatHours = (hours: number | null) => {
    if (hours === null) return t('reports:noData');
    if (hours < 24) return t('reports:hoursFormat', { hours: hours.toFixed(1) });
    const days = hours / 24;
    return t('reports:daysFormat', { days: days.toFixed(1) });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('reports:title')}</h1>
          <p className="text-gray-600">{t('reports:subtitle')}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleExport}
          disabled={isExporting || isLoading}
          isLoading={isExporting}
        >
          {t('reports:exportCSV')}
        </Button>
      </div>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('reports:startDate')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('reports:endDate')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="button" variant="secondary" onClick={loadReports} disabled={isLoading}>
            {t('reports:applyFilter')}
          </Button>
          {(startDate || endDate) && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
            >
              {t('reports:clearFilter')}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-500">{t('reports:totalFunds')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summaryReport ? formatCurrency(summaryReport.totals.totalAmount) : '-'}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-500">{t('reports:totalRequests')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {summaryReport?.totals.totalRequests ?? '-'}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-500">{t('reports:groupsSupported')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {groupsReport?.groupsWithFunding ?? '-'}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm font-medium text-gray-500">{t('reports:avgTimeToFunding')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {timingReport ? formatHours(timingReport.averageTimeToFundsSent) : '-'}
              </p>
            </div>
          </div>

          {/* Request Status Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                {t('reports:requestStatus')}
              </h2>
              {summaryReport && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('reports:status.pending')}</span>
                    <span className="font-medium">{summaryReport.totals.pendingRequests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('reports:status.approved')}</span>
                    <span className="font-medium text-green-600">
                      {summaryReport.totals.approvedRequests}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('reports:status.declined')}</span>
                    <span className="font-medium text-red-600">
                      {summaryReport.totals.declinedRequests}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('reports:status.fundsSent')}</span>
                    <span className="font-medium text-blue-600">
                      {summaryReport.totals.fundsSentRequests}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('reports:status.acknowledged')}</span>
                    <span className="font-medium">{summaryReport.totals.acknowledgedRequests}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">{t('reports:groupStats')}</h2>
              {groupsReport && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('reports:groups.total')}</span>
                    <span className="font-medium">{groupsReport.totalGroups}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('reports:groups.verified')}</span>
                    <span className="font-medium text-green-600">
                      {groupsReport.verifiedGroups}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('reports:groups.withApproved')}</span>
                    <span className="font-medium">{groupsReport.groupsWithApprovedRequests}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('reports:groups.withFunding')}</span>
                    <span className="font-medium text-blue-600">
                      {groupsReport.groupsWithFunding}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              {t('reports:categoryBreakdown')}
            </h2>
            {summaryReport && summaryReport.byCategory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">
                        {t('reports:table.category')}
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">
                        {t('reports:table.totalAmount')}
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">
                        {t('reports:table.requests')}
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">
                        {t('reports:table.approved')}
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">
                        {t('reports:table.declined')}
                      </th>
                      <th className="text-right py-3 px-4 font-medium text-gray-700">
                        {t('reports:table.pending')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryReport.byCategory.map((cat) => (
                      <tr key={cat.category} className="border-b border-gray-100">
                        <td className="py-3 px-4">{t(`common:aidCategories.${cat.category}`)}</td>
                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(cat.totalAmount)}
                        </td>
                        <td className="py-3 px-4 text-right">{cat.requestCount}</td>
                        <td className="py-3 px-4 text-right text-green-600">{cat.approvedCount}</td>
                        <td className="py-3 px-4 text-right text-red-600">{cat.declinedCount}</td>
                        <td className="py-3 px-4 text-right text-yellow-600">{cat.pendingCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">{t('reports:noData')}</p>
            )}
          </div>

          {/* Timing Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">{t('reports:timingStats')}</h2>
            {timingReport && timingReport.requestsAnalyzed > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">{t('reports:timing.toApproval')}</p>
                  <p className="text-xl font-semibold">
                    {formatHours(timingReport.averageTimeToApproval)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('reports:timing.toFundsSent')}</p>
                  <p className="text-xl font-semibold">
                    {formatHours(timingReport.averageTimeToFundsSent)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('reports:timing.toAcknowledged')}</p>
                  <p className="text-xl font-semibold">
                    {formatHours(timingReport.averageTimeToAcknowledged)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{t('reports:timing.median')}</p>
                  <p className="text-xl font-semibold">
                    {formatHours(timingReport.medianTimeToApproval)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">{t('reports:noTimingData')}</p>
            )}
            {timingReport && (
              <p className="text-sm text-gray-500 mt-4">
                {t('reports:requestsAnalyzed', { count: timingReport.requestsAnalyzed })}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
