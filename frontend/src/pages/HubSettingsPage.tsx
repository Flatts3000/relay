import { useState, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts';
import {
  listHubMembers,
  removeHubMember,
  createInvite,
  listInvites,
  revokeInvite,
} from '../api/onboarding';
import type { TeamMember, OnboardingInvite } from '../api/types';
import { Button, Input, Alert, ConfirmModal } from '../components/ui';

export function HubSettingsPage() {
  const { t } = useTranslation('common');
  const { user } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<OnboardingInvite[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isLoadingInvites, setIsLoadingInvites] = useState(true);
  const [error, setError] = useState('');

  // Invite staff form
  const [staffEmail, setStaffEmail] = useState('');
  const [isInvitingStaff, setIsInvitingStaff] = useState(false);
  const [staffInviteSuccess, setStaffInviteSuccess] = useState('');

  // Invite group form
  const [groupEmail, setGroupEmail] = useState('');
  const [isInvitingGroup, setIsInvitingGroup] = useState(false);
  const [groupInviteSuccess, setGroupInviteSuccess] = useState('');

  // Confirm removal modal
  const [removingMember, setRemovingMember] = useState<TeamMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Confirm revoke modal
  const [revokingInvite, setRevokingInvite] = useState<OnboardingInvite | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const hubId = user?.hubId;

  useEffect(() => {
    if (!hubId) return;
    loadMembers();
    loadInvites();
  }, [hubId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadMembers() {
    setIsLoadingMembers(true);
    try {
      const data = await listHubMembers(hubId!);
      setMembers(data.members);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somethingWentWrong'));
    } finally {
      setIsLoadingMembers(false);
    }
  }

  async function loadInvites() {
    setIsLoadingInvites(true);
    try {
      const data = await listInvites();
      setInvites(data.invites);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somethingWentWrong'));
    } finally {
      setIsLoadingInvites(false);
    }
  }

  const handleInviteStaff = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setStaffInviteSuccess('');
    setIsInvitingStaff(true);
    try {
      await createInvite({
        email: staffEmail,
        role: 'hub_admin',
        targetHubId: hubId!,
      });
      setStaffInviteSuccess(
        t('hubSettings.staffInviteSent', {
          defaultValue: 'Invite sent to {{email}}',
          email: staffEmail,
        })
      );
      setStaffEmail('');
      await loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somethingWentWrong'));
    } finally {
      setIsInvitingStaff(false);
    }
  };

  const handleInviteGroup = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setGroupInviteSuccess('');
    setIsInvitingGroup(true);
    try {
      await createInvite({
        email: groupEmail,
        role: 'group_coordinator',
        targetHubId: hubId!,
      });
      setGroupInviteSuccess(
        t('hubSettings.groupInviteSent', {
          defaultValue: 'Group invite sent to {{email}}',
          email: groupEmail,
        })
      );
      setGroupEmail('');
      await loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somethingWentWrong'));
    } finally {
      setIsInvitingGroup(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removingMember || !hubId) return;
    setIsRemoving(true);
    try {
      await removeHubMember(hubId, removingMember.id);
      setMembers((prev) => prev.filter((m) => m.id !== removingMember.id));
      setRemovingMember(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somethingWentWrong'));
    } finally {
      setIsRemoving(false);
    }
  };

  const handleRevokeInvite = async () => {
    if (!revokingInvite) return;
    setIsRevoking(true);
    try {
      await revokeInvite(revokingInvite.id);
      setInvites((prev) => prev.filter((inv) => inv.id !== revokingInvite.id));
      setRevokingInvite(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('somethingWentWrong'));
    } finally {
      setIsRevoking(false);
    }
  };

  if (!hubId) {
    return (
      <Alert type="error">{t('hubSettings.noHub', 'You are not associated with a hub.')}</Alert>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {t('hubSettings.title', 'Hub Settings')}
      </h1>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Team Members */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('hubSettings.teamMembers', 'Team Members')}
        </h2>
        {isLoadingMembers ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-gray-500">
            {t('hubSettings.noMembers', 'No team members found.')}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.email}</p>
                  <p className="text-xs text-gray-500">
                    {member.isOwner
                      ? t('hubSettings.owner', 'Owner')
                      : t('hubSettings.member', 'Member')}
                  </p>
                </div>
                {!member.isOwner && (
                  <Button variant="danger" size="sm" onClick={() => setRemovingMember(member)}>
                    {t('hubSettings.remove', 'Remove')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Invite Staff */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('hubSettings.inviteStaff', 'Invite Hub Staff')}
        </h2>
        {staffInviteSuccess && (
          <Alert type="success" className="mb-4">
            {staffInviteSuccess}
          </Alert>
        )}
        <form onSubmit={handleInviteStaff} className="flex gap-3">
          <div className="flex-1">
            <Input
              type="email"
              name="staffEmail"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              placeholder={t('hubSettings.emailPlaceholder', 'staff@example.org')}
              required
            />
          </div>
          <Button type="submit" isLoading={isInvitingStaff}>
            {t('hubSettings.sendInvite', 'Send Invite')}
          </Button>
        </form>
      </section>

      {/* Invite Group */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('hubSettings.inviteGroup', 'Invite a Group')}
        </h2>
        {groupInviteSuccess && (
          <Alert type="success" className="mb-4">
            {groupInviteSuccess}
          </Alert>
        )}
        <form onSubmit={handleInviteGroup} className="flex gap-3">
          <div className="flex-1">
            <Input
              type="email"
              name="groupEmail"
              value={groupEmail}
              onChange={(e) => setGroupEmail(e.target.value)}
              placeholder={t('hubSettings.groupEmailPlaceholder', 'coordinator@group.org')}
              required
            />
          </div>
          <Button type="submit" isLoading={isInvitingGroup}>
            {t('hubSettings.sendInvite', 'Send Invite')}
          </Button>
        </form>
      </section>

      {/* Pending Invites */}
      <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t('hubSettings.pendingInvites', 'Pending Invites')}
        </h2>
        {isLoadingInvites ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
          </div>
        ) : invites.length === 0 ? (
          <p className="text-sm text-gray-500">
            {t('hubSettings.noInvites', 'No pending invites.')}
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{invite.email}</p>
                  <p className="text-xs text-gray-500">
                    {invite.role === 'hub_admin'
                      ? t('hubSettings.hubStaffRole', 'Hub Staff')
                      : t('hubSettings.groupCoordinatorRole', 'Group Coordinator')}
                    {' \u00b7 '}
                    {t('hubSettings.expires', 'Expires')}{' '}
                    {new Date(invite.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <Button variant="danger" size="sm" onClick={() => setRevokingInvite(invite)}>
                  {t('hubSettings.revoke', 'Revoke')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Confirm Remove Member */}
      <ConfirmModal
        open={!!removingMember}
        onClose={() => setRemovingMember(null)}
        onConfirm={handleRemoveMember}
        title={t('hubSettings.removeMemberTitle', 'Remove Team Member')}
        message={t('hubSettings.removeMemberMessage', {
          defaultValue: 'Are you sure you want to remove {{email}} from this hub?',
          email: removingMember?.email ?? '',
        })}
        confirmLabel={t('hubSettings.remove', 'Remove')}
        confirmVariant="danger"
        isLoading={isRemoving}
      />

      {/* Confirm Revoke Invite */}
      <ConfirmModal
        open={!!revokingInvite}
        onClose={() => setRevokingInvite(null)}
        onConfirm={handleRevokeInvite}
        title={t('hubSettings.revokeInviteTitle', 'Revoke Invite')}
        message={t('hubSettings.revokeInviteMessage', {
          defaultValue: 'Are you sure you want to revoke the invite for {{email}}?',
          email: revokingInvite?.email ?? '',
        })}
        confirmLabel={t('hubSettings.revoke', 'Revoke')}
        confirmVariant="danger"
        isLoading={isRevoking}
      />
    </div>
  );
}
