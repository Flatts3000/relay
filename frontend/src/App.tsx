import { Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout, ProtectedRoute } from './components/layout';
import {
  LoginPage,
  DashboardPage,
  GroupProfilePage,
  HubGroupsListPage,
  HubGroupDetailPage,
  CreateGroupPage,
} from './pages';

function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('pageNotFound')}</h1>
        <p className="text-gray-600">{t('pageNotFoundDescription')}</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes - any authenticated user */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Group coordinator routes */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute allowedRoles={['group_coordinator']}>
            <Layout>
              <GroupProfilePage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Hub admin routes */}
      <Route
        path="/groups"
        element={
          <ProtectedRoute allowedRoles={['hub_admin']}>
            <Layout>
              <HubGroupsListPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/groups/new"
        element={
          <ProtectedRoute allowedRoles={['hub_admin']}>
            <Layout>
              <CreateGroupPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/groups/:id"
        element={
          <ProtectedRoute allowedRoles={['hub_admin']}>
            <Layout>
              <HubGroupDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
