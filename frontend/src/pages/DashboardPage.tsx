import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts';

export function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect based on role
  if (user.role === 'hub_admin') {
    return <Navigate to="/groups" replace />;
  }

  if (user.role === 'group_coordinator') {
    return <Navigate to="/profile" replace />;
  }

  // Fallback
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold text-gray-900">Welcome to Relay</h1>
      <p className="mt-2 text-gray-600">
        Your account is set up but doesn't have an assigned role.
      </p>
    </div>
  );
}
