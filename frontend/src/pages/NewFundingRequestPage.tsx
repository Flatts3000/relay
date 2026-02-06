import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts';
import { createFundingRequest } from '../api/requests';
import { getGroup } from '../api/groups';
import { Alert, Button, Input } from '../components/ui';
import type { AidCategory, Urgency, Group } from '../api/types';

export function NewFundingRequestPage() {
  const { t } = useTranslation(['requests', 'common']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<AidCategory>('rent');
  const [urgency, setUrgency] = useState<Urgency>('normal');
  const [justification, setJustification] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGroup = async () => {
      if (!user?.groupId) return;

      try {
        const { group } = await getGroup(user.groupId);
        setGroup(group);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load group');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroup();
  }, [user?.groupId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!group) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError(t('requests:form.amountInvalid'));
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await createFundingRequest({
        amount: amountNum,
        category,
        urgency,
        region: group.serviceArea,
        justification: justification.trim() || undefined,
      });
      navigate('/requests', { state: { message: 'Request submitted successfully' } });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('requests:errors.failedToSubmit'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert type="error">Unable to load group information</Alert>
      </div>
    );
  }

  if (group.verificationStatus !== 'verified') {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert type="warning">{t('requests:errors.notVerified')}</Alert>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('requests:newRequest')}</h1>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('requests:form.amount')} *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t('requests:form.amountPlaceholder')}
                className="pl-8"
                required
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">{t('requests:form.amountHelper')}</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('requests:form.category')} *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AidCategory)}
              className="w-full px-4 py-3 min-h-[44px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="rent">{t('common:aidCategories.rent')}</option>
              <option value="food">{t('common:aidCategories.food')}</option>
              <option value="utilities">{t('common:aidCategories.utilities')}</option>
              <option value="other">{t('common:aidCategories.other')}</option>
            </select>
          </div>

          {/* Urgency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('requests:form.urgency')}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="urgency"
                  value="normal"
                  checked={urgency === 'normal'}
                  onChange={() => setUrgency('normal')}
                  className="mr-2"
                />
                {t('requests:form.urgencyNormal')}
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="urgency"
                  value="urgent"
                  checked={urgency === 'urgent'}
                  onChange={() => setUrgency('urgent')}
                  className="mr-2"
                />
                <span className="text-red-600 font-medium">{t('requests:form.urgencyUrgent')}</span>
              </label>
            </div>
          </div>

          {/* Region (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('requests:form.region')}
            </label>
            <Input value={group.serviceArea} disabled />
            <p className="text-sm text-gray-500 mt-1">{t('requests:form.regionHelper')}</p>
          </div>

          {/* Justification */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('requests:form.justification')}
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder={t('requests:form.justificationPlaceholder')}
              className="w-full px-4 py-3 min-h-[120px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              maxLength={2000}
            />
            <p className="text-sm text-gray-500 mt-1">{t('requests:form.justificationHelper')}</p>
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">{t('requests:form.privacyWarning')}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <Button type="button" variant="secondary" onClick={() => navigate('/requests')}>
            {t('common:cancel')}
          </Button>
          <Button type="submit" disabled={!amount || isSubmitting} isLoading={isSubmitting}>
            {t('requests:submitRequest')}
          </Button>
        </div>
      </form>
    </div>
  );
}
