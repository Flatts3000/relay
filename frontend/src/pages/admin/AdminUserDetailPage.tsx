import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAdminUser, updateUserRole, deleteUser } from '../../api/admin';
import { Badge, Button, Select, ConfirmModal, Skeleton, Alert } from '../../components/ui';
import { useToast } from '../../contexts/ToastContext';
import type { AdminUserDetail, UserRole } from '../../api/types';

export function AdminUserDetailPage() {
  const { t } = useTranslation('admin');
  const { t: tc } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingRole, setEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('hub_admin');
  const [roleLoading, setRoleLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await getAdminUser(id);
        setUser(data);
        setSelectedRole(data.role);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleRoleUpdate = async () => {
    if (!id || !user) return;
    setRoleLoading(true);
    try {
      await updateUserRole(id, selectedRole);
      setUser({ ...user, role: selectedRole });
      setEditingRole(false);
      showToast(t('users.roleUpdated'), 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update role', 'error');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleteLoading(true);
    try {
      await deleteUser(id);
      showToast(t('users.deleted'), 'success');
      setTimeout(() => navigate('/admin/users'), 1000);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete user', 'error');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const roleLabel = (r: string) => {
    if (r === 'hub_admin') return tc('roles.hubAdmin');
    if (r === 'group_coordinator') return tc('roles.groupCoordinator');
    if (r === 'staff_admin') return tc('roles.staffAdmin');
    return r;
  };

  const roleOptions = [
    { value: 'hub_admin', label: tc('roles.hubAdmin') },
    { value: 'group_coordinator', label: tc('roles.groupCoordinator') },
    { value: 'staff_admin', label: tc('roles.staffAdmin') },
  ];

  if (loading) {
    return (
      <div>
        <Skeleton className="h-5 w-24 mb-4" variant="text" />
        <Skeleton className="h-8 w-64 mb-6" variant="text" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (error) return <Alert type="error">{error}</Alert>;
  if (!user) return null;

  return (
    <div>
      <Link
        to="/admin/users"
        className="text-sm text-primary-600 hover:underline mb-4 inline-block"
      >
        &larr; {t('users.title')}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">{user.email}</h1>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-gray-500">{t('users.email')}</dt>
            <dd className="text-gray-900">{user.email}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('users.role')}</dt>
            <dd>
              {editingRole ? (
                <div className="flex items-center gap-2">
                  <div className="w-48">
                    <Select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                      options={roleOptions}
                    />
                  </div>
                  <Button size="sm" onClick={handleRoleUpdate} isLoading={roleLoading}>
                    {t('common.save')}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingRole(false);
                      setSelectedRole(user.role);
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      user.role === 'staff_admin'
                        ? 'error'
                        : user.role === 'hub_admin'
                          ? 'info'
                          : 'default'
                    }
                  >
                    {roleLabel(user.role)}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => setEditingRole(true)}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    {t('users.editRole')}
                  </button>
                </div>
              )}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('users.hub')}</dt>
            <dd className="text-gray-900">
              {user.hubId ? (
                <Link to={`/admin/hubs/${user.hubId}`} className="text-primary-600 hover:underline">
                  {user.hubName}
                </Link>
              ) : (
                t('common.na')
              )}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('users.group')}</dt>
            <dd className="text-gray-900">
              {user.groupId ? (
                <Link
                  to={`/admin/groups/${user.groupId}`}
                  className="text-primary-600 hover:underline"
                >
                  {user.groupName}
                </Link>
              ) : (
                t('common.na')
              )}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('users.createdAt')}</dt>
            <dd className="text-gray-900">{new Date(user.createdAt).toLocaleDateString()}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{t('users.lastLogin')}</dt>
            <dd className="text-gray-900">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : t('common.never')}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex gap-3">
        <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
          {t('users.deleteUser')}
        </Button>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title={t('users.confirmDelete')}
        message={t('users.confirmDeleteMessage')}
        confirmLabel={t('users.deleteUser')}
        confirmVariant="danger"
        isLoading={deleteLoading}
      />
    </div>
  );
}
