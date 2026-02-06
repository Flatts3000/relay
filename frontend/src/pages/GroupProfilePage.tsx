import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts';
import { getGroup, updateGroup } from '../api/groups';
import { GroupForm } from '../components/groups';
import { Alert } from '../components/ui';
import type { Group, CreateGroupInput } from '../api/types';

export function GroupProfilePage() {
  const { t } = useTranslation(['groups', 'common']);
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchGroup = async () => {
      if (!user?.groupId) return;

      setIsLoading(true);
      setError('');

      try {
        const { group } = await getGroup(user.groupId);
        setGroup(group);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('groups:failedToLoadGroup'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroup();
  }, [user?.groupId, t]);

  const handleUpdate = async (data: CreateGroupInput) => {
    if (!user?.groupId) return;

    const { group: updated } = await updateGroup(user.groupId, data);
    setGroup(updated);
    setIsEditing(false);
    setSuccess(t('groups:profileUpdated'));
    setTimeout(() => setSuccess(''), 5000);
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
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900">{t('groups:noGroupFound')}</h2>
        <p className="mt-2 text-gray-600">{t('groups:noGroupAssociated')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('groups:groupProfile')}</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            {t('groups:editProfile')}
          </button>
        )}
      </div>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}
      {success && (
        <Alert type="success" className="mb-6">
          {success}
        </Alert>
      )}

      {isEditing ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('groups:editGroupInformation')}
          </h2>
          <GroupForm
            mode="edit"
            initialValues={{
              name: group.name,
              serviceArea: group.serviceArea,
              aidCategories: group.aidCategories,
              contactEmail: group.contactEmail,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            submitLabel={t('groups:saveChanges')}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                group.verificationStatus === 'verified'
                  ? 'bg-green-100 text-green-800'
                  : group.verificationStatus === 'revoked'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {t(`common:verificationStatus.${group.verificationStatus}`)}
            </span>
          </div>

          <dl className="divide-y divide-gray-200">
            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">
                {t('groups:details.serviceArea')}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {group.serviceArea}
              </dd>
            </div>

            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">
                {t('groups:details.aidCategories')}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {group.aidCategories.map((category) => (
                    <span key={category} className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {t(`common:aidCategories.${category}`)}
                    </span>
                  ))}
                </div>
              </dd>
            </div>

            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">
                {t('groups:details.contactEmail')}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {group.contactEmail}
              </dd>
            </div>

            <div className="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">
                {t('groups:details.registered')}
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(group.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
