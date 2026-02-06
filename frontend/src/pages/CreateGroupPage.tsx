import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createGroup } from '../api/groups';
import { GroupForm } from '../components/groups';
import type { CreateGroupInput } from '../api/types';

export function CreateGroupPage() {
  const { t } = useTranslation('groups');
  const navigate = useNavigate();

  const handleSubmit = async (data: CreateGroupInput) => {
    await createGroup(data);
    navigate('/groups');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/groups" className="text-primary-600 hover:text-primary-700 font-medium">
          &larr; {t('backToGroups')}
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('registerNewGroup')}</h1>
        <GroupForm mode="create" onSubmit={handleSubmit} onCancel={() => navigate('/groups')} />
      </div>
    </div>
  );
}
