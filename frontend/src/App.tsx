import { Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout, ProtectedRoute } from './components/layout';
import {
  HomePage,
  LoginPage,
  DashboardPage,
  GroupProfilePage,
  HubGroupsListPage,
  HubGroupDetailPage,
  CreateGroupPage,
  RequestVerificationPage,
  VerificationQueuePage,
  VerificationRequestDetailPage,
  AttestationRequestsPage,
  NewFundingRequestPage,
  FundingRequestsListPage,
  FundingRequestDetailPage,
  CreateMailboxPage,
  ViewMailboxPage,
  HelpRequestsListPage,
  HelpRequestDetailPage,
  ReportsDashboardPage,
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
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes - any authenticated user */}
      <Route
        path="/dashboard"
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
      <Route
        path="/verification/request"
        element={
          <ProtectedRoute allowedRoles={['group_coordinator']}>
            <Layout>
              <RequestVerificationPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/verification/attestations"
        element={
          <ProtectedRoute allowedRoles={['group_coordinator']}>
            <Layout>
              <AttestationRequestsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/new"
        element={
          <ProtectedRoute allowedRoles={['group_coordinator']}>
            <Layout>
              <NewFundingRequestPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Shared routes - both roles */}
      <Route
        path="/requests"
        element={
          <ProtectedRoute>
            <Layout>
              <FundingRequestsListPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <FundingRequestDetailPage />
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
      <Route
        path="/verification"
        element={
          <ProtectedRoute allowedRoles={['hub_admin']}>
            <Layout>
              <VerificationQueuePage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/verification/requests/:id"
        element={
          <ProtectedRoute allowedRoles={['hub_admin']}>
            <Layout>
              <VerificationRequestDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute allowedRoles={['hub_admin']}>
            <Layout>
              <ReportsDashboardPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Anonymous help request routes - NO authentication */}
      <Route path="/help" element={<CreateMailboxPage />} />
      <Route path="/help/mailbox/:id" element={<ViewMailboxPage />} />

      {/* Group coordinator help request routes */}
      <Route
        path="/help-requests"
        element={
          <ProtectedRoute allowedRoles={['group_coordinator']}>
            <Layout>
              <HelpRequestsListPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/help-requests/:mailboxId"
        element={
          <ProtectedRoute allowedRoles={['group_coordinator']}>
            <Layout>
              <HelpRequestDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
