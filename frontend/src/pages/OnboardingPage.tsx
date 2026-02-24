import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getInviteContext,
  acceptHubOwner,
  acceptHubStaff,
  acceptGroupOwner,
  acceptGroupStaff,
  acceptStaffAdmin,
  acceptHubMembership,
} from '../api/onboarding';
import { useAuth } from '../contexts';
import type { InviteContext } from '../api/types';
import { AID_CATEGORIES } from '../api/types';
import { Button, Input, Alert, CheckboxGroup, LanguageSwitcher } from '../components/ui';

export function OnboardingPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { loginWithSession } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const fetchAttempted = useRef(false);

  const [context, setContext] = useState<InviteContext | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form fields for hub_owner_setup
  const [hubName, setHubName] = useState('');
  const [hubContactEmail, setHubContactEmail] = useState('');

  // Form fields for group_owner_setup
  const [groupName, setGroupName] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [aidCategories, setAidCategories] = useState<string[]>([]);
  const [groupContactEmail, setGroupContactEmail] = useState('');

  useEffect(() => {
    if (!token || fetchAttempted.current) return;
    fetchAttempted.current = true;

    async function loadContext() {
      setIsLoadingContext(true);
      setError('');
      try {
        const data = await getInviteContext(token!);
        setContext(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('somethingWentWrong'));
      } finally {
        setIsLoadingContext(false);
      }
    }
    loadContext();
  }, [token, t]);

  if (!token) {
    return (
      <PageShell>
        <Alert type="error">
          {t('onboarding.missingToken', 'Invalid onboarding link. No token was provided.')}
        </Alert>
      </PageShell>
    );
  }

  if (isLoadingContext) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-2 text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error && !context) {
    return (
      <PageShell>
        <Alert type="error">{error}</Alert>
      </PageShell>
    );
  }

  if (!context) return null;

  const handleSuccess = async (sessionToken: string) => {
    await loginWithSession(sessionToken);
    navigate('/dashboard', { replace: true });
  };

  const handleHubOwnerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await acceptHubOwner({
        token,
        name: hubName,
        contactEmail: hubContactEmail,
      });
      handleSuccess(result.sessionToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somethingWentWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGroupOwnerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const result = await acceptGroupOwner({
        token,
        name: groupName,
        serviceArea,
        aidCategories: aidCategories as (typeof AID_CATEGORIES)[number][],
        contactEmail: groupContactEmail,
      });
      handleSuccess(result.sessionToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somethingWentWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoAccept = async (
    acceptFn: (token: string) => Promise<{ sessionToken: string }>
  ) => {
    setError('');
    setIsSubmitting(true);
    try {
      const result = await acceptFn(token);
      handleSuccess(result.sessionToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somethingWentWrong'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const aidCategoryOptions = AID_CATEGORIES.map((cat) => ({
    value: cat,
    label: t(`aidCategories.${cat}`, cat.charAt(0).toUpperCase() + cat.slice(1)),
  }));

  return (
    <PageShell>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('onboarding.welcome', 'Welcome to Relay')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('onboarding.invitedAs', {
            defaultValue: 'You have been invited as {{role}}',
            role: formatRole(context.flow),
          })}
        </p>
      </div>

      {error && (
        <Alert type="error" className="mb-4">
          {error}
        </Alert>
      )}

      {context.flow === 'hub_owner_setup' && (
        <form onSubmit={handleHubOwnerSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('onboarding.hubOwnerDescription', 'Set up your hub to get started.')}
          </p>
          <Input
            label={t('onboarding.hubName', 'Hub Name')}
            name="hubName"
            value={hubName}
            onChange={(e) => setHubName(e.target.value)}
            placeholder={t('onboarding.hubNamePlaceholder', 'Enter hub name')}
            required
          />
          <Input
            label={t('onboarding.contactEmail', 'Contact Email')}
            type="email"
            name="contactEmail"
            value={hubContactEmail}
            onChange={(e) => setHubContactEmail(e.target.value)}
            placeholder={t('onboarding.contactEmailPlaceholder', 'hub@example.org')}
            required
          />
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            {t('onboarding.createHub', 'Create Hub')}
          </Button>
        </form>
      )}

      {context.flow === 'hub_staff' && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-gray-600">
            {t('onboarding.hubStaffDescription', {
              defaultValue: 'You are joining {{hubName}} as a hub administrator.',
              hubName: context.hubName ?? 'the hub',
            })}
          </p>
          <Button
            className="w-full"
            isLoading={isSubmitting}
            onClick={() => handleAutoAccept(acceptHubStaff)}
          >
            {t('onboarding.acceptInvite', 'Accept Invite')}
          </Button>
        </div>
      )}

      {context.flow === 'group_owner_setup' && (
        <form onSubmit={handleGroupOwnerSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('onboarding.groupOwnerDescription', {
              defaultValue: 'Set up your group under {{hubName}}.',
              hubName: context.hubName ?? 'the hub',
            })}
          </p>
          <Input
            label={t('onboarding.groupName', 'Group Name')}
            name="groupName"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={t('onboarding.groupNamePlaceholder', 'Enter group name')}
            required
          />
          <Input
            label={t('onboarding.serviceArea', 'Service Area')}
            name="serviceArea"
            value={serviceArea}
            onChange={(e) => setServiceArea(e.target.value)}
            placeholder={t('onboarding.serviceAreaPlaceholder', 'e.g., Portland Metro')}
            required
          />
          <CheckboxGroup
            label={t('onboarding.aidCategories', 'Aid Categories')}
            name="aidCategories"
            options={aidCategoryOptions}
            value={aidCategories}
            onChange={setAidCategories}
          />
          <Input
            label={t('onboarding.contactEmail', 'Contact Email')}
            type="email"
            name="contactEmail"
            value={groupContactEmail}
            onChange={(e) => setGroupContactEmail(e.target.value)}
            placeholder={t('onboarding.contactEmailPlaceholder', 'hub@example.org')}
            required
          />
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            {t('onboarding.createGroup', 'Create Group')}
          </Button>
        </form>
      )}

      {context.flow === 'group_staff' && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-gray-600">
            {t('onboarding.groupStaffDescription', {
              defaultValue: 'You are joining {{groupName}} as a group coordinator.',
              groupName: context.groupName ?? 'the group',
            })}
          </p>
          <Button
            className="w-full"
            isLoading={isSubmitting}
            onClick={() => handleAutoAccept(acceptGroupStaff)}
          >
            {t('onboarding.acceptInvite', 'Accept Invite')}
          </Button>
        </div>
      )}

      {context.flow === 'staff_admin' && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-gray-600">
            {t(
              'onboarding.staffAdminDescription',
              'You are being added as a staff administrator for the Relay platform.'
            )}
          </p>
          <Button
            className="w-full"
            isLoading={isSubmitting}
            onClick={() => handleAutoAccept(acceptStaffAdmin)}
          >
            {t('onboarding.acceptInvite', 'Accept Invite')}
          </Button>
        </div>
      )}

      {context.flow === 'hub_membership' && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-gray-600">
            {t('onboarding.hubMembershipDescription', {
              defaultValue: 'Your group is being invited to join {{hubName}}.',
              hubName: context.hubName ?? 'the hub',
            })}
          </p>
          <Button
            className="w-full"
            isLoading={isSubmitting}
            onClick={() => handleAutoAccept(acceptHubMembership)}
          >
            {t('onboarding.confirmMembership', 'Confirm Membership')}
          </Button>
        </div>
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full">
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Relay" className="h-12 mx-auto mb-4" />
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">{children}</div>
      </div>
    </div>
  );
}

function formatRole(flow: string): string {
  const labels: Record<string, string> = {
    hub_owner_setup: 'Hub Owner',
    hub_staff: 'Hub Administrator',
    group_owner_setup: 'Group Coordinator',
    group_staff: 'Group Coordinator',
    staff_admin: 'Staff Administrator',
    hub_membership: 'Hub Member',
  };
  return labels[flow] ?? flow;
}
