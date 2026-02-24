import { Routes, Route } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layout, AdminLayout, ProtectedRoute } from './components/layout';
import {
  HomePage,
  GroupDirectoryPage,
  LoginPage,
  DashboardPage,
  OnboardingPage,
  HubSettingsPage,
  GroupSettingsPage,
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
  ViewMailboxPage,
  BroadcastSubmitPage,
  GroupInboxPage,
  InviteDetailPage,
  HelpRequestsListPage,
  HelpRequestDetailPage,
  ReportsDashboardPage,
  PrivacyPage,
  TermsPage,
  SecurityPage,
  DesignSystemPage,
  AdminOverviewPage,
  AdminHubsPage,
  AdminHubDetailPage,
  AdminGroupsPage,
  AdminGroupDetailPage,
  AdminUsersPage,
  AdminUserDetailPage,
  AdminVerificationPage,
  AdminVerificationDetailPage,
  AdminFundingPage,
  AdminFundingDetailPage,
  AdminAuditLogPage,
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
      <Route path="/directory" element={<GroupDirectoryPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />

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

      {/* Settings routes */}
      <Route
        path="/settings/hub"
        element={
          <ProtectedRoute allowedRoles={['hub_admin']}>
            <Layout>
              <HubSettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/group"
        element={
          <ProtectedRoute allowedRoles={['group_coordinator']}>
            <Layout>
              <GroupSettingsPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Design system - development documentation */}
      <Route path="/design-system" element={<DesignSystemPage />} />

      {/* Public info pages - no authentication */}
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/security" element={<SecurityPage />} />

      {/* Anonymous help request routes - NO authentication */}
      <Route path="/help" element={<BroadcastSubmitPage />} />
      {/* Legacy mailbox routes (kept during migration) */}
      <Route path="/help/mailbox/:id" element={<ViewMailboxPage />} />

      {/* Group coordinator broadcast inbox routes */}
      <Route
        path="/inbox"
        element={
          <ProtectedRoute allowedRoles={['group_coordinator']}>
            <Layout>
              <GroupInboxPage />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inbox/:inviteId"
        element={
          <ProtectedRoute allowedRoles={['group_coordinator']}>
            <Layout>
              <InviteDetailPage />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Group coordinator help request routes (legacy mailbox) */}
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

      {/* Staff admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['staff_admin']}>
            <AdminLayout>
              <AdminOverviewPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/hubs"
        element={
          <ProtectedRoute allowedRoles={['staff_admin']}>
            <AdminLayout>
              <AdminHubsPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/hubs/:id"
        element={
          <ProtectedRoute allowedRoles={['staff_admin']}>
            <AdminLayout>
              <AdminHubDetailPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/groups"
        element={
          <ProtectedRoute allowedRoles={['staff_admin']}>
            <AdminLayout>
              <AdminGroupsPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/groups/:id"
        element={
          <ProtectedRoute allowedRoles={['staff_admin']}>
            <AdminLayout>
              <AdminGroupDetailPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={['staff_admin']}>
            <AdminLayout>
              <AdminUsersPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/:id"
        element={
          <ProtectedRoute allowedRoles={['staff_admin']}>
            <AdminLayout>
              <AdminUserDetailPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/verification"
        element={
          <ProtectedRoute allowedRoles={['staff_admin']}>
            <AdminLayout>
              <AdminVerificationPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/verification/:id"
        element={
          <ProtectedRoute allowedRoles={['staff_admin']}>
            <AdminLayout>
              <AdminVerificationDetailPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/funding"
        element={
          <ProtectedRoute allowedRoles={['staff_admin']}>
            <AdminLayout>
              <AdminFundingPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/funding/:id"
        element={
          <ProtectedRoute allowedRoles={['staff_admin']}>
            <AdminLayout>
              <AdminFundingDetailPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit-log"
        element={
          <ProtectedRoute allowedRoles={['staff_admin']}>
            <AdminLayout>
              <AdminAuditLogPage />
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
